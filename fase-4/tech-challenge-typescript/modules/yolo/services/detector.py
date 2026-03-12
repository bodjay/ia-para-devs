"""
YOLOv8 detection service.
Uses yolov8n.pt for object detection and yolov8n-pose.pt for pose estimation.

When the custom surgical classifier is available (assets/models/surgical_classifier.pt),
detections of COCO classes that may correspond to surgical instruments (knife, scissors)
are enriched with the specific instrument label from the custom model.
Full-frame classification is also run on every frame to catch instruments that COCO misses.
"""
import os
import numpy as np
import cv2
from ultralytics import YOLO
from services.surgical_classifier import get_classifier

# YOLOv8-pose COCO keypoint names (17 keypoints)
KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]

# COCO class IDs relevant for clinical context
CLINICAL_RELEVANT_CLASSES = {
    0: "person",
    32: "sports ball",       # physiotherapy equipment
    39: "bottle",            # medication/clinical supplies
    43: "knife",             # surgical blade
    56: "chair",             # examination chair
    59: "bed",               # examination bed
    63: "couch",             # examination couch
    67: "cell phone",
    73: "book",
    76: "scissors",          # surgical scissors (key indicator)
}


class YOLODetector:
    def __init__(self):
        self._detection_model: YOLO | None = None
        self._pose_model: YOLO | None = None

    @property
    def detection_model(self) -> YOLO:
        if self._detection_model is None:
            self._detection_model = YOLO("yolov8n.pt")
        return self._detection_model

    @property
    def pose_model(self) -> YOLO:
        if self._pose_model is None:
            self._pose_model = YOLO("yolov8n-pose.pt")
        return self._pose_model

    def extract_frames(self, video_path: str, num_frames: int = 8) -> list[np.ndarray]:
        """Extract evenly-spaced frames from a video file."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        indices = np.linspace(0, max(total - 1, 0), num_frames, dtype=int)

        frames: list[np.ndarray] = []
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ret, frame = cap.read()
            if ret:
                frames.append(frame)

        cap.release()
        return frames

    # COCO classes that may overlap with surgical instruments
    _SURGICAL_COCO_IDS = {43, 76}  # knife, scissors

    def detect_objects(self, frame: np.ndarray) -> list[dict]:
        """
        Run YOLOv8 object detection and enrich surgical detections with
        the custom instrument classifier when available.

        For each COCO detection of class knife (43) or scissors (76),
        the bounding-box crop is passed to the custom classifier.
        If it returns a high-confidence match, the detection is annotated
        with the specific instrument label (bisturi, pinca, etc.).

        Additionally, a full-frame classification is run once per call to
        catch instruments that COCO may have missed entirely.
        """
        results = self.detection_model(frame, verbose=False)
        detections: list[dict] = []
        clf = get_classifier()

        for result in results:
            for box in result.boxes:
                class_id   = int(box.cls[0])
                confidence = float(box.conf[0])
                class_name = result.names[class_id]
                x1, y1, x2, y2 = [round(v, 2) for v in box.xyxy[0].tolist()]

                det = {
                    "class_id":   class_id,
                    "class_name": class_name,
                    "confidence": confidence,
                    "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                    # Custom classifier fields (populated below if available)
                    "surgical_label":      None,
                    "surgical_confidence": None,
                    "surgical_risk":       None,
                }

                # Enrich knife/scissors detections with custom instrument label
                if class_id in self._SURGICAL_COCO_IDS and clf.available:
                    custom = clf.classify_region(frame, int(x1), int(y1), int(x2), int(y2))
                    if custom:
                        det["surgical_label"]      = custom["label"]
                        det["surgical_confidence"] = custom["confidence"]
                        det["surgical_risk"]        = custom["risk"]

                detections.append(det)

        # ── Full-frame surgical classification ──────────────────────────────
        # Runs when no surgical COCO object was detected — catches instruments
        # that COCO misses (e.g. pinças, afastadores not in COCO vocabulary).
        has_coco_surgical = any(d["class_id"] in self._SURGICAL_COCO_IDS for d in detections)
        if not has_coco_surgical and clf.available:
            full_frame = clf.classify(frame)
            if full_frame:
                # Inject a synthetic detection spanning the full frame
                h, w = frame.shape[:2]
                detections.append({
                    "class_id":            -1,           # synthetic (not a COCO class)
                    "class_name":          "surgical_instrument",
                    "confidence":          full_frame["confidence"],
                    "x1": 0.0, "y1": 0.0, "x2": float(w), "y2": float(h),
                    "surgical_label":      full_frame["label"],
                    "surgical_confidence": full_frame["confidence"],
                    "surgical_risk":       full_frame["risk"],
                })

        return detections

    def detect_poses(self, frame: np.ndarray) -> list[dict]:
        """Run YOLOv8-pose and return per-person keypoint data with posture label."""
        results = self.pose_model(frame, verbose=False)
        poses: list[dict] = []

        for result in results:
            if result.keypoints is None:
                continue

            kps_xy = result.keypoints.xy  # (N, 17, 2)
            kps_conf = result.keypoints.conf  # (N, 17) or None

            for person_id in range(len(kps_xy)):
                xy = kps_xy[person_id].tolist()
                conf = kps_conf[person_id].tolist() if kps_conf is not None else [1.0] * 17

                keypoints = [
                    {
                        "name": KEYPOINT_NAMES[i],
                        "x": round(xy[i][0], 2),
                        "y": round(xy[i][1], 2),
                        "confidence": round(float(conf[i]), 3),
                    }
                    for i in range(min(len(xy), 17))
                ]

                posture = _classify_posture(keypoints)
                poses.append({
                    "person_id": person_id,
                    "keypoints": keypoints,
                    "posture_label": posture,
                })

        return poses


def _classify_posture(keypoints: list[dict]) -> str:
    """
    Heuristic posture classification based on YOLOv8-pose keypoints.

    Returns one of: defensive | exercise | distress | neutral
    """
    kp_map = {kp["name"]: kp for kp in keypoints if kp["confidence"] > 0.3}

    def get(name: str):
        return kp_map.get(name)

    left_shoulder = get("left_shoulder")
    right_shoulder = get("right_shoulder")
    left_elbow = get("left_elbow")
    right_elbow = get("right_elbow")
    left_wrist = get("left_wrist")
    right_wrist = get("right_wrist")
    nose = get("nose")
    left_hip = get("left_hip")
    right_hip = get("right_hip")

    scores = {"defensive": 0, "exercise": 0, "distress": 0}

    # ── Defensive posture ─────────────────────────────────────────────────
    # Arms crossed: elbows very close horizontally
    if left_elbow and right_elbow:
        elbow_dist = abs(left_elbow["x"] - right_elbow["x"])
        frame_width = max(left_elbow["x"], right_elbow["x"]) or 640
        if elbow_dist / frame_width < 0.12:
            scores["defensive"] += 2

    # Hunched: shoulders raised above nose (cowering)
    if left_shoulder and right_shoulder and nose:
        shoulder_avg_y = (left_shoulder["y"] + right_shoulder["y"]) / 2
        if shoulder_avg_y < nose["y"] * 0.95:
            scores["defensive"] += 1

    # Wrists near face (protecting face)
    if left_wrist and nose:
        if abs(left_wrist["x"] - nose["x"]) < 50 and abs(left_wrist["y"] - nose["y"]) < 80:
            scores["defensive"] += 1
    if right_wrist and nose:
        if abs(right_wrist["x"] - nose["x"]) < 50 and abs(right_wrist["y"] - nose["y"]) < 80:
            scores["defensive"] += 1

    # ── Exercise / Physiotherapy ──────────────────────────────────────────
    # Wrists raised above shoulders
    if left_wrist and left_shoulder and left_wrist["y"] < left_shoulder["y"]:
        scores["exercise"] += 1
    if right_wrist and right_shoulder and right_wrist["y"] < right_shoulder["y"]:
        scores["exercise"] += 1

    # Shoulders wide apart (arms extended)
    if left_shoulder and right_shoulder:
        shoulder_width = abs(left_shoulder["x"] - right_shoulder["x"])
        if shoulder_width > 120:
            scores["exercise"] += 1

    # ── Distress ──────────────────────────────────────────────────────────
    # Head tilted significantly (looking away/avoidance)
    if left_shoulder and right_shoulder and nose:
        shoulder_mid_x = (left_shoulder["x"] + right_shoulder["x"]) / 2
        head_offset = abs(nose["x"] - shoulder_mid_x)
        if head_offset > 60:
            scores["distress"] += 1

    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] >= 2 else "neutral"
