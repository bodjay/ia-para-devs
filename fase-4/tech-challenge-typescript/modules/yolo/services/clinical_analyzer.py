"""
Clinical signal analyzers — context-specific posture analysis.

Accepts keypoints in the API dict format: [{name, x, y, confidence}]
Returns serializable dicts consumed by both realtime.py and the web frontend.

Contexts:
  consultation   → non-verbal discomfort / fear signals
  physiotherapy  → movement quality and compensation metrics
  violence       → body language indicators of abuse / violence
"""

import math
from typing import TypeAlias

KeypointDict: TypeAlias = dict  # {name: str, x: float, y: float, confidence: float}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _visible(kp: KeypointDict | None) -> bool:
    return kp is not None and kp["confidence"] > 0.30 and (kp["x"] > 0 or kp["y"] > 0)


def _kp_map(keypoints: list[KeypointDict]) -> dict[str, KeypointDict]:
    return {kp["name"]: kp for kp in keypoints if _visible(kp)}


def _dist(a: KeypointDict, b: KeypointDict) -> float:
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"])


# ── Consultation ──────────────────────────────────────────────────────────────

def analyze_consultation(keypoints: list[KeypointDict]) -> dict:
    """
    Identifies non-verbal discomfort/fear signals in a medical consultation.

    Indicators evaluated:
    - Eye avoidance: nose strongly offset from shoulder midpoint (>70 px)
    - Arms crossed: elbows horizontally close (<12% frame width ratio)
    - Wrists near face: wrists within 80 px of nose
    - Shoulders raised: shoulder avg y above nose line (tension)
    - Body contracted: torso height shorter than shoulder width * 0.9
    """
    m = _kp_map(keypoints)
    nose = m.get("nose")
    ls   = m.get("left_shoulder");  rs = m.get("right_shoulder")
    le   = m.get("left_elbow");     re = m.get("right_elbow")
    lw   = m.get("left_wrist");     rw = m.get("right_wrist")
    lh   = m.get("left_hip");       rh = m.get("right_hip")

    eye_avoidance = bool(
        nose and ls and rs
        and abs(nose["x"] - (ls["x"] + rs["x"]) / 2) > 70
    )
    arms_crossed = bool(
        le and re
        and abs(le["x"] - re["x"]) / max(le["x"], re["x"], 1) < 0.12
    )
    wrist_near_face = any(
        _visible(w) and nose and _dist(w, nose) < 80
        for w in [lw, rw] if w
    )
    shoulder_raised = bool(
        ls and rs and nose
        and (ls["y"] + rs["y"]) / 2 < nose["y"] * 0.93
    )
    body_contracted = False
    if ls and rs and lh and rh:
        sh_w  = abs(ls["x"] - rs["x"])
        torso = ((lh["y"] + rh["y"]) / 2) - ((ls["y"] + rs["y"]) / 2)
        body_contracted = sh_w > 0 and torso < sh_w * 0.9

    score = sum([eye_avoidance, arms_crossed, wrist_near_face,
                 shoulder_raised, body_contracted])

    level = (
        "Neutro"      if score == 0 else
        "Observação"  if score == 1 else
        "Atenção"     if score == 2 else
        "Desconforto" if score == 3 else
        "Alerta"
    )

    return {
        "eye_avoidance":    eye_avoidance,
        "arms_crossed":     arms_crossed,
        "wrist_near_face":  wrist_near_face,
        "shoulder_raised":  shoulder_raised,
        "body_contracted":  body_contracted,
        "discomfort_score": score,
        "level":            level,
    }


# ── Physiotherapy ─────────────────────────────────────────────────────────────

def analyze_physiotherapy(keypoints: list[KeypointDict]) -> dict:
    """
    Evaluates movement quality for post-partum physiotherapy rehabilitation.

    Metrics:
    - Arm ROM (left/right): wrist elevation relative to shoulder (0–1)
    - Arm symmetry: 1 = symmetric, 0 = fully asymmetric
    - Shoulder / hip tilt (degrees)
    - Trunk lean (degrees from vertical)
    - Lower limb activity: knee or ankle visible and elevated
    """
    m  = _kp_map(keypoints)
    ls = m.get("left_shoulder");  rs = m.get("right_shoulder")
    lw = m.get("left_wrist");     rw = m.get("right_wrist")
    lh = m.get("left_hip");       rh = m.get("right_hip")
    lk = m.get("left_knee");      rk = m.get("right_knee")
    la = m.get("left_ankle");     ra = m.get("right_ankle")

    left_rom  = (
        min(1.0, max(0.0, ls["y"] - lw["y"]) / max(ls["y"], 1))
        if lw and ls and ls["y"] > 0 else 0.0
    )
    right_rom = (
        min(1.0, max(0.0, rs["y"] - rw["y"]) / max(rs["y"], 1))
        if rw and rs and rs["y"] > 0 else 0.0
    )

    arm_symmetry = 1.0
    compensation = False
    if lw and rw and (ls or rs):
        diff = abs(left_rom - right_rom)
        arm_symmetry = max(0.0, 1.0 - diff / max(max(left_rom, right_rom), 0.01))
        compensation = diff > 0.30

    shoulder_tilt = 0.0
    if ls and rs:
        shoulder_tilt = abs(math.degrees(math.atan2(rs["y"] - ls["y"], rs["x"] - ls["x"])))

    hip_tilt = 0.0
    if lh and rh:
        hip_tilt = abs(math.degrees(math.atan2(rh["y"] - lh["y"], rh["x"] - lh["x"])))

    trunk_lean = 0.0
    if ls and rs and lh and rh:
        ms_x = (ls["x"] + rs["x"]) / 2; ms_y = (ls["y"] + rs["y"]) / 2
        mh_x = (lh["x"] + rh["x"]) / 2; mh_y = (lh["y"] + rh["y"]) / 2
        trunk_lean = abs(math.degrees(math.atan2(ms_x - mh_x, max(mh_y - ms_y, 1))))

    lower_limb_active = any(_visible(j) for j in [lk, rk, la, ra] if j)

    issues = sum([compensation, shoulder_tilt > 10, hip_tilt > 10, trunk_lean > 15])
    no_data = not (ls or rs or lw or rw)

    recovery_label = (
        "Sem dados"   if no_data   else
        "Adequado"    if issues == 0 else
        "Observar"    if issues == 1 else
        "Compensação" if issues == 2 else
        "Limitado"
    )

    return {
        "left_rom":          round(left_rom, 3),
        "right_rom":         round(right_rom, 3),
        "arm_symmetry":      round(arm_symmetry, 3),
        "shoulder_tilt_deg": round(shoulder_tilt, 1),
        "hip_tilt_deg":      round(hip_tilt, 1),
        "trunk_lean_deg":    round(trunk_lean, 1),
        "lower_limb_active": lower_limb_active,
        "compensation":      compensation,
        "recovery_label":    recovery_label,
    }


# ── Violence screening ────────────────────────────────────────────────────────

def analyze_violence(keypoints: list[KeypointDict]) -> dict:
    """
    Detects body language indicators associated with domestic abuse / violence.

    Indicators (non-exposure principle — progressive risk levels, not conclusions):
    - Arms crossed (protective posture)
    - Wrists / hands near face (facial protection)
    - Shoulders raised (fear / cowering)
    - Body contracted / collapsed
    - Head avoidance: nose strongly offset from shoulder midpoint (>80 px)
    """
    m    = _kp_map(keypoints)
    nose = m.get("nose")
    ls   = m.get("left_shoulder");  rs = m.get("right_shoulder")
    le   = m.get("left_elbow");     re = m.get("right_elbow")
    lw   = m.get("left_wrist");     rw = m.get("right_wrist")
    lh   = m.get("left_hip");       rh = m.get("right_hip")

    arms_crossed = bool(
        le and re
        and abs(le["x"] - re["x"]) / max(le["x"], re["x"], 1) < 0.12
    )
    wrist_near_face = any(
        _visible(w) and nose and _dist(w, nose) < 80
        for w in [lw, rw] if w
    )
    shoulder_raised = bool(
        ls and rs and nose
        and (ls["y"] + rs["y"]) / 2 < nose["y"] * 0.93
    )
    body_contracted = False
    if ls and rs and lh and rh:
        sh_w  = abs(ls["x"] - rs["x"])
        hip_w = abs(lh["x"] - rh["x"])
        torso = abs(((lh["y"] + rh["y"]) / 2) - ((ls["y"] + rs["y"]) / 2))
        body_contracted = sh_w > 0 and (
            hip_w / max(sh_w, 1) < 0.65 or torso < sh_w * 0.80
        )
    head_avoidance = bool(
        nose and ls and rs
        and abs(nose["x"] - (ls["x"] + rs["x"]) / 2) > 80
    )

    score = sum([arms_crossed, wrist_near_face, shoulder_raised,
                 body_contracted, head_avoidance])

    risk_label = (
        "Neutro"            if score == 0 else
        "Observação"        if score == 1 else
        "Atenção"           if score == 2 else
        "Suspeita moderada" if score == 3 else
        "Suspeita alta"
    )

    return {
        "arms_crossed":     arms_crossed,
        "wrist_near_face":  wrist_near_face,
        "shoulder_raised":  shoulder_raised,
        "body_contracted":  body_contracted,
        "head_avoidance":   head_avoidance,
        "risk_score":       score,
        "risk_label":       risk_label,
    }


# ── Dispatcher ────────────────────────────────────────────────────────────────

def analyze_for_context(keypoints: list[KeypointDict], context: str) -> dict | None:
    """Return the appropriate clinical signals dict for the given context, or None."""
    if context == "consultation":
        return analyze_consultation(keypoints)
    if context == "physiotherapy":
        return analyze_physiotherapy(keypoints)
    if context in ("violence", "violence_screening"):
        return analyze_violence(keypoints)
    return None
