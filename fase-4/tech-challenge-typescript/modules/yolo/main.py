"""
YOLOv8 Clinical Vision API
Análise de vídeo clínico especializado em saúde da mulher.

Endpoints:
  GET  /health            - health check
  POST /detect            - analisa arquivo de vídeo completo
  POST /detect/frames     - analisa lista de frames base64

Usage:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
import os
import base64
import tempfile

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas.detection import DetectionResponse, FramesInput
from services.detector import YOLODetector
from services.analyzer import analyze_clinical_context
from services.clinical_analyzer import analyze_for_context

app = FastAPI(
    title="YOLOv8 Clinical Vision API",
    description=(
        "Análise de vídeo clínico especializado em saúde da mulher usando YOLOv8.\n\n"
        "Detecta contextos clínicos:\n"
        "- **surgery**: cirurgia ginecológica (instrumentos cirúrgicos, campo operatório)\n"
        "- **physiotherapy**: fisioterapia pós-parto (movimentos de reabilitação)\n"
        "- **violence_screening**: triagem de violência (linguagem corporal, posturas defensivas)\n"
        "- **consultation**: consulta médica (ambiente clínico, profissional + paciente)"
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = YOLODetector()


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/health", summary="Health check")
async def health():
    return {"status": "ok", "model": "yolov8n", "pose_model": "yolov8n-pose"}


@app.post(
    "/detect",
    response_model=DetectionResponse,
    summary="Analisa arquivo de vídeo",
    description="Recebe um arquivo de vídeo (mp4/webm/avi) e retorna análise clínica YOLOv8.",
)
async def detect_video(
    file: UploadFile = File(..., description="Arquivo de vídeo (.mp4, .webm, .avi)"),
    analysis_type: str | None = Form(None, description="Hint de tipo: surgery | physiotherapy | violence_screening | consultation"),
):
    suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        frames = detector.extract_frames(tmp_path, num_frames=8)
        if not frames:
            raise HTTPException(status_code=422, detail="Não foi possível extrair frames do vídeo.")
        return _process_frames(frames, hint=analysis_type)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        os.unlink(tmp_path)


@app.post(
    "/detect/frames",
    response_model=DetectionResponse,
    summary="Analisa frames base64",
    description="Recebe uma lista de frames codificados em base64 (JPEG) e retorna análise clínica YOLOv8.",
)
async def detect_frames(payload: FramesInput):
    frames: list[np.ndarray] = []

    for b64 in payload.frames:
        try:
            img_bytes = base64.b64decode(b64)
            arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is not None:
                frames.append(frame)
        except Exception:
            continue

    if not frames:
        raise HTTPException(status_code=400, detail="Nenhum frame válido fornecido.")

    return _process_frames(frames, hint=payload.analysis_type)


@app.post(
    "/detect/frame",
    summary="Analisa um único frame base64 (tempo real)",
    description=(
        "Recebe um único frame JPEG em base64 e retorna detecções de objetos e pose "
        "com bounding boxes anotadas. Projetado para polling de baixa latência (~10 fps) "
        "a partir do frontend."
    ),
)
async def detect_single_frame(
    frame_b64: str = Form(..., description="Frame JPEG em base64"),
    analysis_type: str | None = Form(None, description="Hint de tipo clínico"),
    draw_overlay: bool = Form(True, description="Se true, retorna frame anotado em base64"),
):
    """
    Endpoint de tempo real para detecção frame-a-frame.

    Returns:
        {
          detections: [{class_name, confidence, x1, y1, x2, y2}],
          poses: [{person_id, posture_label, keypoints}],
          person_count: int,
          clinical_context: str,
          annotated_frame: str | null   # base64 JPEG com overlay desenhado
        }
    """
    try:
        img_bytes = base64.b64decode(frame_b64)
        arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        raise HTTPException(status_code=400, detail="Frame base64 inválido.")

    if frame is None:
        raise HTTPException(status_code=400, detail="Não foi possível decodificar o frame.")

    detections = detector.detect_objects(frame)
    poses = detector.detect_poses(frame)

    # ── Draw overlay ───────────────────────────────────────────────────────
    annotated_b64: str | None = None
    if draw_overlay:
        annotated = _draw_frame_overlay(frame.copy(), detections, poses)
        _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
        annotated_b64 = base64.b64encode(buf.tobytes()).decode()

    # ── Clinical context (quick heuristic) ────────────────────────────────
    # Includes COCO knife/scissors AND custom classifier synthetic detections
    surgical_tools = sum(
        1 for d in detections
        if d["class_id"] in {43, 76} or d.get("surgical_label") is not None
    )
    defensive_pose = any(p["posture_label"] in {"defensive", "distress"} for p in poses)
    exercise_pose  = any(p["posture_label"] == "exercise" for p in poses)

    if analysis_type:
        clinical_context = analysis_type
    elif surgical_tools > 0:
        clinical_context = "surgery"
    elif defensive_pose:
        clinical_context = "violence_screening"
    elif exercise_pose:
        clinical_context = "physiotherapy"
    else:
        clinical_context = "consultation"

    return {
        "detections": [
            {
                "class_name": d["class_name"],
                "confidence": round(d["confidence"], 3),
                "x1": d["x1"], "y1": d["y1"],
                "x2": d["x2"], "y2": d["y2"],
                "surgical_label":      d.get("surgical_label"),
                "surgical_confidence": d.get("surgical_confidence"),
                "surgical_risk":       d.get("surgical_risk"),
            }
            for d in detections
        ],
        "poses": [
            {
                "person_id":       p["person_id"],
                "posture_label":   p["posture_label"],
                "keypoints":       p["keypoints"],
                "clinical_signals": analyze_for_context(p["keypoints"], clinical_context),
            }
            for p in poses
        ],
        "person_count": sum(1 for d in detections if d["class_id"] == 0),
        "clinical_context": clinical_context,
        "annotated_frame": annotated_b64,
    }


# ── Internal helpers ────────────────────────────────────────────────────────

# Colors for overlay (BGR)
_CLASS_COLORS = {
    0:  (50, 220,  50),   # person
    43: (0,   0, 230),    # knife (surgical blade)
    76: (0,  60, 255),    # scissors
    32: (0, 180, 255),    # sports ball (physio)
    56: (180, 90,  0),    # chair
    59: (160,  0, 200),   # bed
    63: (160,  0, 200),   # couch
}
_DEFAULT_COLOR = (180, 180, 50)

_POSTURE_COLORS = {
    "defensive": (0, 140, 255),
    "distress":  (0,   0, 220),
    "exercise":  (0, 200, 100),
    "neutral":   (200, 200, 200),
}

_SKELETON_EDGES = [
    (0, 1), (0, 2), (1, 3), (2, 4),
    (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),
    (5, 11), (6, 12), (11, 12),
    (11, 13), (13, 15), (12, 14), (14, 16),
]


def _draw_frame_overlay(
    frame: np.ndarray,
    detections: list[dict],
    poses: list[dict],
) -> np.ndarray:
    """Draw bounding boxes + pose skeleton on a frame. Returns annotated frame."""
    # ── Bounding boxes ─────────────────────────────────────────────────────
    for d in detections:
        x1, y1, x2, y2 = int(d["x1"]), int(d["y1"]), int(d["x2"]), int(d["y2"])
        color = _CLASS_COLORS.get(d["class_id"], _DEFAULT_COLOR)
        # Use specific instrument label when custom classifier identified it
        display_name = d.get("surgical_label") or d["class_name"]
        label = f"{display_name} {d['confidence']:.0%}"

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        (tw, th), bl = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.52, 1)
        banner_y = max(y1 - th - 6, 0)
        cv2.rectangle(frame, (x1, banner_y), (x1 + tw + 6, banner_y + th + bl + 4), color, -1)
        cv2.putText(frame, label, (x1 + 3, banner_y + th + 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 0, 0), 1, cv2.LINE_AA)

    # ── Pose skeleton + posture badge ──────────────────────────────────────
    for pose in poses:
        kps = pose["keypoints"]
        posture = pose["posture_label"]
        color = _POSTURE_COLORS.get(posture, _POSTURE_COLORS["neutral"])

        # Skeleton lines
        for (a, b) in _SKELETON_EDGES:
            if a >= len(kps) or b >= len(kps):
                continue
            ka, kb = kps[a], kps[b]
            if ka["confidence"] > 0.3 and kb["confidence"] > 0.3:
                cv2.line(frame,
                         (int(ka["x"]), int(ka["y"])),
                         (int(kb["x"]), int(kb["y"])),
                         (255, 200, 50), 2, cv2.LINE_AA)

        # Keypoint circles
        for kp in kps:
            if kp["confidence"] > 0.3 and (kp["x"] > 0 or kp["y"] > 0):
                cv2.circle(frame, (int(kp["x"]), int(kp["y"])), 4,
                           (50, 230, 230), -1, cv2.LINE_AA)

        # Posture badge near first visible keypoint
        for kp in kps:
            if kp["confidence"] > 0.3 and kp["x"] > 0:
                bx, by = int(kp["x"]), max(int(kp["y"]) - 28, 0)
                (tw, th), _ = cv2.getTextSize(posture.upper(), cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(frame, (bx, by), (bx + tw + 8, by + th + 8), color, -1)
                cv2.putText(frame, posture.upper(), (bx + 4, by + th + 4),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)
                break

    return frame


def _process_frames(frames: list[np.ndarray], hint: str | None = None) -> dict:
    all_detections: list[list[dict]] = []
    all_poses: list[list[dict]] = []
    frame_results: list[dict] = []

    for i, frame in enumerate(frames):
        detections = detector.detect_objects(frame)
        poses = detector.detect_poses(frame)
        all_detections.append(detections)
        all_poses.append(poses)

        frame_results.append({
            "frame_index": i,
            "objects": [
                {
                    "class_id": d["class_id"],
                    "class_name": d["class_name"],
                    "confidence": d["confidence"],
                    "x1": d["x1"], "y1": d["y1"],
                    "x2": d["x2"], "y2": d["y2"],
                }
                for d in detections
            ],
            "person_count": sum(1 for d in detections if d["class_id"] == 0),
            "poses": [
                {
                    "person_id": p["person_id"],
                    "posture_label": p["posture_label"],
                    "keypoints": p["keypoints"],
                }
                for p in poses
            ] or None,
        })

    clinical = analyze_clinical_context(all_detections, all_poses, hint=hint)

    return {
        "frames_processed": len(frames),
        "frame_detections": frame_results,
        "clinical_analysis": clinical,
        "model_version": "yolov8n",
    }
