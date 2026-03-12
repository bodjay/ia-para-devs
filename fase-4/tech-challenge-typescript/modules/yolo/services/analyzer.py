"""
Clinical context analyzer.
Takes raw YOLOv8 detections + pose data and produces structured clinical analysis
for women's health domains: surgery, physiotherapy, violence screening, consultation.
"""
from typing import Any

# COCO class IDs
PERSON_CLASS = 0
SURGICAL_INSTRUMENT_CLASSES = {43, 76}  # knife, scissors
EXERCISE_EQUIPMENT_CLASSES = {32}       # sports ball
FURNITURE_CLASSES = {56, 59, 63}        # chair, bed, couch

# Posture labels
DEFENSIVE_LABELS = {"defensive", "distress"}
EXERCISE_LABELS = {"exercise"}


def analyze_clinical_context(
    frame_detections: list[list[dict]],
    frame_poses: list[list[dict]],
    hint: str | None = None,
) -> dict[str, Any]:
    """
    Produce a clinical analysis dict from per-frame detection and pose data.

    Args:
        frame_detections: List of detection lists, one per frame.
        frame_poses:       List of pose lists, one per frame.
        hint:              Optional user-supplied hint ('surgery', 'physiotherapy', etc.)

    Returns:
        ClinicalAnalysis-compatible dict.
    """
    # ── Aggregate metrics ─────────────────────────────────────────────────
    total_frames = len(frame_detections)
    person_counts: list[int] = []
    surgical_tool_total = 0
    exercise_equipment_total = 0
    furniture_total = 0

    for dets in frame_detections:
        persons = [d for d in dets if d["class_id"] == PERSON_CLASS]
        person_counts.append(len(persons))
        surgical_tool_total += sum(1 for d in dets if d["class_id"] in SURGICAL_INSTRUMENT_CLASSES)
        exercise_equipment_total += sum(1 for d in dets if d["class_id"] in EXERCISE_EQUIPMENT_CLASSES)
        furniture_total += sum(1 for d in dets if d["class_id"] in FURNITURE_CLASSES)

    avg_persons = sum(person_counts) / max(total_frames, 1)

    # Pose aggregation
    defensive_frames = 0
    exercise_frames = 0
    distress_frames = 0

    for poses in frame_poses:
        has_defensive = any(p["posture_label"] in DEFENSIVE_LABELS for p in poses)
        has_exercise = any(p["posture_label"] in EXERCISE_LABELS for p in poses)
        has_distress = any(p["posture_label"] == "distress" for p in poses)
        if has_defensive:
            defensive_frames += 1
        if has_exercise:
            exercise_frames += 1
        if has_distress:
            distress_frames += 1

    # ── Apply user hint if present ────────────────────────────────────────
    if hint:
        hint_map = {
            "surgery": "surgery",
            "cirurgia": "surgery",
            "physiotherapy": "physiotherapy",
            "fisioterapia": "physiotherapy",
            "violence": "violence_screening",
            "violence_screening": "violence_screening",
            "violencia": "violence_screening",
            "violência": "violence_screening",
            "consultation": "consultation",
            "consulta": "consultation",
        }
        mapped = hint_map.get(hint.lower())
        if mapped:
            return _build_analysis(
                video_type=mapped,
                type_confidence=0.95,
                risk_level=_risk_for_type(mapped),
                indicators=_indicators_for_type(
                    mapped, surgical_tool_total, avg_persons, defensive_frames, exercise_frames
                ),
                summary=f"Tipo definido pelo usuário: {mapped}. Análise YOLOv8 confirma contexto clínico.",
            )

    # ── Heuristic classification ──────────────────────────────────────────
    # 1. Surgery: surgical instruments detected
    if surgical_tool_total > 0:
        confidence = min(0.95, 0.55 + surgical_tool_total * 0.10)
        return _build_analysis(
            video_type="surgery",
            type_confidence=confidence,
            risk_level="high",
            indicators=[
                _make_indicator(
                    "surgical_instruments",
                    True,
                    confidence,
                    f"{surgical_tool_total} instrumento(s) cirúrgico(s) detectado(s) (tesoura/bisturi).",
                ),
                _make_indicator(
                    "persons_present",
                    avg_persons > 0,
                    min(0.9, avg_persons / 3),
                    f"Média de {avg_persons:.1f} pessoa(s) por frame (equipe cirúrgica / paciente).",
                ),
            ],
            summary=(
                f"Contexto cirúrgico identificado: {surgical_tool_total} instrumento(s) detectado(s) "
                f"em {total_frames} frame(s). Monitoramento de sangramento e complicações recomendado."
            ),
        )

    # 2. Violence screening: defensive/distress postures dominate
    defensive_ratio = defensive_frames / max(total_frames, 1)
    if defensive_ratio >= 0.4 or distress_frames >= 2:
        confidence = min(0.90, 0.55 + defensive_ratio * 0.4)
        risk = "critical" if distress_frames >= 3 else "high"
        return _build_analysis(
            video_type="violence_screening",
            type_confidence=confidence,
            risk_level=risk,
            indicators=[
                _make_indicator(
                    "defensive_posture",
                    True,
                    confidence,
                    f"Postura defensiva/angústia detectada em {defensive_frames}/{total_frames} frame(s).",
                ),
                _make_indicator(
                    "multiple_persons",
                    avg_persons > 1,
                    min(0.8, avg_persons / 3),
                    f"Média de {avg_persons:.1f} pessoa(s) por frame.",
                ),
            ],
            summary=(
                f"Indicadores de violência detectados: postura defensiva em {defensive_frames} frame(s). "
                "Triagem clínica imediata recomendada."
            ),
        )

    # 3. Physiotherapy: exercise postures or exercise equipment
    exercise_ratio = exercise_frames / max(total_frames, 1)
    if exercise_ratio >= 0.3 or exercise_equipment_total > 0:
        confidence = min(0.85, 0.50 + exercise_ratio * 0.4)
        return _build_analysis(
            video_type="physiotherapy",
            type_confidence=confidence,
            risk_level="low",
            indicators=[
                _make_indicator(
                    "exercise_posture",
                    exercise_frames > 0,
                    confidence,
                    f"Movimentos de exercício/reabilitação em {exercise_frames}/{total_frames} frame(s).",
                ),
                _make_indicator(
                    "exercise_equipment",
                    exercise_equipment_total > 0,
                    0.70 if exercise_equipment_total > 0 else 0.0,
                    f"{exercise_equipment_total} equipamento(s) de exercício detectado(s).",
                ),
            ],
            summary=(
                f"Contexto de fisioterapia/reabilitação identificado: movimentos de exercício em "
                f"{exercise_frames} frame(s). Avaliação de recuperação pós-parto recomendada."
            ),
        )

    # 4. Consultation: person(s) in furniture-rich environment
    if avg_persons >= 1 and furniture_total > 0:
        return _build_analysis(
            video_type="consultation",
            type_confidence=0.65,
            risk_level="low",
            indicators=[
                _make_indicator(
                    "person_in_clinical_setting",
                    True,
                    0.65,
                    f"Pessoa detectada em ambiente clínico ({furniture_total} móvel/leito).",
                ),
            ],
            summary="Contexto de consulta médica identificado. Análise de sinais não-verbais recomendada.",
        )

    # 5. Fallback
    return _build_analysis(
        video_type="unknown",
        type_confidence=0.30,
        risk_level="low",
        indicators=[
            _make_indicator("no_clear_context", False, 0.30, "Contexto clínico não identificado nos frames."),
        ],
        summary="Contexto clínico não determinado. Revisão manual recomendada.",
    )


# ── Helpers ────────────────────────────────────────────────────────────────

def _risk_for_type(video_type: str) -> str:
    return {
        "surgery": "high",
        "violence_screening": "high",
        "physiotherapy": "low",
        "consultation": "low",
        "unknown": "low",
    }.get(video_type, "low")


def _make_indicator(name: str, detected: bool, confidence: float, description: str) -> dict:
    return {"name": name, "detected": detected, "confidence": round(confidence, 3), "description": description}


def _indicators_for_type(
    video_type: str,
    surgical_tool_total: int,
    avg_persons: float,
    defensive_frames: int,
    exercise_frames: int,
) -> list[dict]:
    if video_type == "surgery":
        return [_make_indicator("surgical_instruments", surgical_tool_total > 0, 0.90, "Instrumentos cirúrgicos presentes.")]
    if video_type == "violence_screening":
        return [_make_indicator("defensive_posture", defensive_frames > 0, 0.85, "Postura defensiva detectada.")]
    if video_type == "physiotherapy":
        return [_make_indicator("exercise_posture", exercise_frames > 0, 0.80, "Movimentos de reabilitação detectados.")]
    return [_make_indicator("person_present", avg_persons > 0, 0.70, "Pessoa detectada em ambiente clínico.")]


def _build_analysis(
    video_type: str,
    type_confidence: float,
    risk_level: str,
    indicators: list[dict],
    summary: str,
) -> dict:
    return {
        "video_type": video_type,
        "type_confidence": round(type_confidence, 3),
        "risk_level": risk_level,
        "indicators": indicators,
        "summary": summary,
    }
