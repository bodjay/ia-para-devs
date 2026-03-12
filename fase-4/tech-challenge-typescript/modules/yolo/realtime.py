"""
YOLOv8 Realtime Clinical Detector — Saúde da Mulher
====================================================
Detecção em tempo real com análise clínica específica para três contextos:

  consultation   → sinais não-verbais de desconforto ou medo
  physiotherapy  → análise de movimentos e recuperação pós-parto
  violence       → linguagem corporal indicativa de abuso/violência
  auto           → detecta o contexto automaticamente (padrão)

Referência visual: fase-4/detectando-rosto/main.py (cv2.rectangle + cv2.imshow)

Usage:
  python realtime.py                            # webcam, modo auto
  python realtime.py --mode consultation        # forçar modo consulta
  python realtime.py --mode physiotherapy       # modo fisioterapia
  python realtime.py --mode violence            # modo triagem violência
  python realtime.py --source video.mp4         # arquivo de vídeo
  python realtime.py --no-pose                  # desativa estimação de pose
  python realtime.py --conf 0.4                 # limiar de confiança
"""

import argparse
import math
import sys
from collections import deque
from dataclasses import dataclass, field

import cv2
import numpy as np
from ultralytics import YOLO
from services.surgical_classifier import get_classifier

# ── COCO-17 keypoint index map ───────────────────────────────────────────────
KP = {
    "nose": 0, "left_eye": 1, "right_eye": 2, "left_ear": 3, "right_ear": 4,
    "left_shoulder": 5, "right_shoulder": 6,
    "left_elbow": 7, "right_elbow": 8,
    "left_wrist": 9, "right_wrist": 10,
    "left_hip": 11, "right_hip": 12,
    "left_knee": 13, "right_knee": 14,
    "left_ankle": 15, "right_ankle": 16,
}
KP_NAMES = list(KP.keys())

SKELETON = [
    (0, 1), (0, 2), (1, 3), (2, 4),
    (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),
    (5, 11), (6, 12), (11, 12),
    (11, 13), (13, 15), (12, 14), (14, 16),
]

# ── Colors (BGR) ─────────────────────────────────────────────────────────────
C = {
    "green":    (50,  210,  50),
    "red":      (30,   30, 220),
    "orange":   (0,   150, 255),
    "yellow":   (30,  200, 230),
    "white":    (240, 240, 240),
    "grey":     (160, 160, 160),
    "dark":     (20,   20,  20),
    "cyan":     (220, 210,  40),
    "purple":   (200,  30, 160),
    "pink":     (180,  80, 200),
}

POSTURE_COLORS = {
    "defensive": C["orange"],
    "distress":  C["red"],
    "exercise":  C["green"],
    "neutral":   C["grey"],
}

CLASS_COLORS = {
    0: C["green"],    # person
    32: C["orange"],  # sports ball (physio)
    39: C["yellow"],  # bottle (clinical supplies)
    43: C["red"],     # knife (surgical blade)
    56: C["grey"],    # chair
    59: C["purple"],  # bed
    63: C["purple"],  # couch
    76: C["red"],     # scissors
}
DEFAULT_CLASS_COLOR = C["yellow"]


# ── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class Keypoint:
    name: str
    x: float
    y: float
    conf: float

    @property
    def visible(self) -> bool:
        return self.conf > 0.30 and (self.x > 0 or self.y > 0)

    def pt(self) -> tuple[int, int]:
        return (int(self.x), int(self.y))

    def dist(self, other: "Keypoint") -> float:
        return math.hypot(self.x - other.x, self.y - other.y)


@dataclass
class ConsultationSignals:
    """Sinais não-verbais detectados em contexto de consulta médica."""
    eye_avoidance:    bool  = False  # cabeça inclinada / evitação visual
    arms_crossed:     bool  = False  # braços cruzados (postura fechada)
    wrist_near_face:  bool  = False  # mãos/pulsos perto do rosto
    shoulder_raised:  bool  = False  # ombros elevados (tensão)
    body_contracted:  bool  = False  # corpo encurvado / colapsado
    discomfort_score: int   = 0      # 0–5 composite
    level:            str   = "Neutro"
    level_color:      tuple = field(default_factory=lambda: (160, 160, 160))


@dataclass
class PhysiotherapySignals:
    """Métricas de movimento para fisioterapia pós-parto / reabilitação."""
    left_rom:          float = 0.0   # elevação braço esquerdo (0–1)
    right_rom:         float = 0.0   # elevação braço direito (0–1)
    arm_symmetry:      float = 1.0   # 0 = assimétrico, 1 = simétrico
    shoulder_tilt_deg: float = 0.0   # inclinação ombros (°)
    hip_tilt_deg:      float = 0.0   # inclinação quadril (°)
    trunk_lean_deg:    float = 0.0   # inclinação do tronco (°)
    lower_limb_active: bool  = False # movimento de joelho/tornozelo
    compensation:      bool  = False # assimetria > limiar
    recovery_label:    str   = "Sem dados"
    recovery_color:    tuple = field(default_factory=lambda: (160, 160, 160))


@dataclass
class ViolenceSignals:
    """Indicadores de linguagem corporal associados a abuso / violência."""
    arms_crossed:     bool  = False  # braços cruzados (proteção)
    wrist_near_face:  bool  = False  # mãos perto do rosto (proteção)
    shoulder_raised:  bool  = False  # ombros elevados (medo)
    body_contracted:  bool  = False  # corpo encolhido
    head_avoidance:   bool  = False  # cabeça desviada / evitação
    sustained_frames: int   = 0      # frames consecutivos com sinais
    risk_score:       int   = 0      # 0–5
    risk_label:       str   = "Neutro"
    risk_color:       tuple = field(default_factory=lambda: (160, 160, 160))


# ── Keypoint extractor ────────────────────────────────────────────────────────

def _extract_keypoints(xy: list, conf_list: list) -> list[Keypoint]:
    return [
        Keypoint(
            name=KP_NAMES[i],
            x=float(xy[i][0]),
            y=float(xy[i][1]),
            conf=float(conf_list[i]),
        )
        for i in range(min(len(xy), 17))
    ]


def _kp_map(keypoints: list[Keypoint]) -> dict[str, Keypoint]:
    return {kp.name: kp for kp in keypoints if kp.visible}


# ── Clinical analyzers ────────────────────────────────────────────────────────

def _analyze_consultation(kps: list[Keypoint]) -> ConsultationSignals:
    """
    Identifica sinais não-verbais de desconforto ou medo em consulta médica.

    Indicadores avaliados:
    - Evitação ocular: nariz deslocado do centro dos ombros (>70 px)
    - Braços cruzados: cotovelos muito próximos (<12% da largura do frame)
    - Pulsos perto do rosto: wrists dentro de 70px do nariz
    - Ombros elevados: ombros acima da linha do nariz (tensão)
    - Corpo encurvado: ombros acima do nível esperado relativo ao quadril
    """
    sig = ConsultationSignals()
    m = _kp_map(kps)

    nose  = m.get("nose")
    ls    = m.get("left_shoulder")
    rs    = m.get("right_shoulder")
    le    = m.get("left_elbow")
    re    = m.get("right_elbow")
    lw    = m.get("left_wrist")
    rw    = m.get("right_wrist")
    lh    = m.get("left_hip")
    rh    = m.get("right_hip")

    # 1. Eye avoidance: nose significantly off-center from shoulders
    if nose and ls and rs:
        mid_x = (ls.x + rs.x) / 2
        if abs(nose.x - mid_x) > 70:
            sig.eye_avoidance = True

    # 2. Arms crossed: elbows close together horizontally
    if le and re:
        elbow_span = abs(le.x - re.x)
        ref_width  = max(le.x, re.x, 1)
        if elbow_span / ref_width < 0.12:
            sig.arms_crossed = True

    # 3. Wrists near face
    for wrist in (lw, rw):
        if wrist and nose and wrist.dist(nose) < 80:
            sig.wrist_near_face = True
            break

    # 4. Shoulders raised (above nose — tension/cowering)
    if ls and rs and nose:
        shoulder_avg_y = (ls.y + rs.y) / 2
        if shoulder_avg_y < nose.y * 0.93:
            sig.shoulder_raised = True

    # 5. Body contracted: shoulder-to-hip distance significantly shorter than expected
    if ls and rs and lh and rh:
        sh_center = ((ls.x + rs.x) / 2, (ls.y + rs.y) / 2)
        hip_center = ((lh.x + rh.x) / 2, (lh.y + rh.y) / 2)
        torso_h = hip_center[1] - sh_center[1]
        # Estimate expected torso based on shoulder width
        sh_width = abs(ls.x - rs.x)
        if sh_width > 0 and torso_h < sh_width * 0.9:
            sig.body_contracted = True

    # Composite score
    sig.discomfort_score = sum([
        sig.eye_avoidance,
        sig.arms_crossed,
        sig.wrist_near_face,
        sig.shoulder_raised,
        sig.body_contracted,
    ])

    if sig.discomfort_score == 0:
        sig.level, sig.level_color = "Neutro",      C["grey"]
    elif sig.discomfort_score == 1:
        sig.level, sig.level_color = "Observação",  C["green"]
    elif sig.discomfort_score == 2:
        sig.level, sig.level_color = "Atenção",     C["yellow"]
    elif sig.discomfort_score == 3:
        sig.level, sig.level_color = "Desconforto", C["orange"]
    else:
        sig.level, sig.level_color = "Alerta",      C["red"]

    return sig


def _analyze_physiotherapy(kps: list[Keypoint]) -> PhysiotherapySignals:
    """
    Avalia qualidade de movimento e recuperação em fisioterapia pós-parto.

    Métricas calculadas:
    - ROM braço (esq/dir): elevação do pulso em relação ao ombro (0–1)
    - Simetria: diferença absoluta entre ROM esquerdo e direito
    - Inclinação dos ombros e quadril (°)
    - Inclinação do tronco (°)
    - Atividade dos membros inferiores: joelhos/tornozelos em movimento
    """
    sig = PhysiotherapySignals()
    m = _kp_map(kps)

    ls  = m.get("left_shoulder")
    rs  = m.get("right_shoulder")
    lw  = m.get("left_wrist")
    rw  = m.get("right_wrist")
    lh  = m.get("left_hip")
    rh  = m.get("right_hip")
    lk  = m.get("left_knee")
    rk  = m.get("right_knee")
    la  = m.get("left_ankle")
    ra  = m.get("right_ankle")

    # ROM: how far the wrist is elevated above the shoulder (0 = at shoulder, 1 = full overhead)
    if lw and ls and ls.y > 0:
        elev = max(0.0, ls.y - lw.y)
        sig.left_rom = min(1.0, elev / max(ls.y, 1))
    if rw and rs and rs.y > 0:
        elev = max(0.0, rs.y - rw.y)
        sig.right_rom = min(1.0, elev / max(rs.y, 1))

    # Arm symmetry (1 = symmetric, 0 = completely asymmetric)
    if lw and rw and (ls or rs):
        sig.arm_symmetry = max(0.0, 1.0 - abs(sig.left_rom - sig.right_rom) / max(max(sig.left_rom, sig.right_rom), 0.01))
        sig.compensation = abs(sig.left_rom - sig.right_rom) > 0.30

    # Shoulder tilt angle (°) — 0 = perfectly horizontal
    if ls and rs:
        dx = rs.x - ls.x
        dy = rs.y - ls.y
        sig.shoulder_tilt_deg = abs(math.degrees(math.atan2(dy, dx)))

    # Hip tilt angle (°)
    if lh and rh:
        dx = rh.x - lh.x
        dy = rh.y - lh.y
        sig.hip_tilt_deg = abs(math.degrees(math.atan2(dy, dx)))

    # Trunk lean (° from vertical): angle between mid-shoulder and mid-hip
    if ls and rs and lh and rh:
        ms_x = (ls.x + rs.x) / 2; ms_y = (ls.y + rs.y) / 2
        mh_x = (lh.x + rh.x) / 2; mh_y = (lh.y + rh.y) / 2
        dx = ms_x - mh_x
        dy = mh_y - ms_y  # positive = trunk above hip
        sig.trunk_lean_deg = abs(math.degrees(math.atan2(dx, max(dy, 1))))

    # Lower limb activity: any knee or ankle visible and elevated
    for jt in (lk, rk, la, ra):
        if jt and jt.visible:
            sig.lower_limb_active = True
            break

    # Recovery label based on metrics
    issues = sum([
        sig.compensation,
        sig.shoulder_tilt_deg > 10,
        sig.hip_tilt_deg > 10,
        sig.trunk_lean_deg > 15,
    ])

    if not (ls or rs or lw or rw):
        sig.recovery_label, sig.recovery_color = "Sem dados",    C["grey"]
    elif issues == 0:
        sig.recovery_label, sig.recovery_color = "Adequado",     C["green"]
    elif issues == 1:
        sig.recovery_label, sig.recovery_color = "Observar",     C["yellow"]
    elif issues == 2:
        sig.recovery_label, sig.recovery_color = "Compensação",  C["orange"]
    else:
        sig.recovery_label, sig.recovery_color = "Limitado",     C["red"]

    return sig


def _analyze_violence(kps: list[Keypoint]) -> ViolenceSignals:
    """
    Detecta linguagem corporal indicativa de abuso ou violência doméstica.

    Indicadores avaliados (princípio de não exposição da vítima):
    - Braços cruzados / postura fechada
    - Pulsos/mãos perto do rosto (proteção facial)
    - Ombros elevados (medo / encolhimento)
    - Corpo contraído / encolhido
    - Cabeça desviada / evitação visual sustentada

    O risco é apresentado como nível progressivo, nunca como conclusão.
    """
    sig = ViolenceSignals()
    m = _kp_map(kps)

    nose = m.get("nose")
    ls   = m.get("left_shoulder")
    rs   = m.get("right_shoulder")
    le   = m.get("left_elbow")
    re   = m.get("right_elbow")
    lw   = m.get("left_wrist")
    rw   = m.get("right_wrist")
    lh   = m.get("left_hip")
    rh   = m.get("right_hip")

    # 1. Arms crossed
    if le and re:
        elbow_span = abs(le.x - re.x)
        ref        = max(le.x, re.x, 1)
        if elbow_span / ref < 0.12:
            sig.arms_crossed = True

    # 2. Wrists near face (protecting face)
    for wrist in (lw, rw):
        if wrist and nose and wrist.dist(nose) < 80:
            sig.wrist_near_face = True
            break

    # 3. Shoulders raised above nose line
    if ls and rs and nose:
        avg_sh_y = (ls.y + rs.y) / 2
        if avg_sh_y < nose.y * 0.93:
            sig.shoulder_raised = True

    # 4. Body contracted
    if ls and rs and lh and rh:
        sh_w     = abs(ls.x - rs.x)
        hip_w    = abs(lh.x - rh.x)
        torso_h  = abs(((lh.y + rh.y) / 2) - ((ls.y + rs.y) / 2))
        # Contracted: narrow shoulders or torso shorter than shoulder width
        if sh_w > 0 and (hip_w / max(sh_w, 1) < 0.65 or torso_h < sh_w * 0.80):
            sig.body_contracted = True

    # 5. Head avoidance: nose strongly offset from shoulder midpoint
    if nose and ls and rs:
        mid_x = (ls.x + rs.x) / 2
        if abs(nose.x - mid_x) > 80:
            sig.head_avoidance = True

    sig.risk_score = sum([
        sig.arms_crossed,
        sig.wrist_near_face,
        sig.shoulder_raised,
        sig.body_contracted,
        sig.head_avoidance,
    ])

    if sig.risk_score == 0:
        sig.risk_label, sig.risk_color = "Neutro",            C["grey"]
    elif sig.risk_score == 1:
        sig.risk_label, sig.risk_color = "Observação",        C["green"]
    elif sig.risk_score == 2:
        sig.risk_label, sig.risk_color = "Atenção",           C["yellow"]
    elif sig.risk_score == 3:
        sig.risk_label, sig.risk_color = "Suspeita moderada", C["orange"]
    else:
        sig.risk_label, sig.risk_color = "Suspeita alta",     C["red"]

    return sig


# ── Drawing helpers ───────────────────────────────────────────────────────────

def _draw_box(frame: np.ndarray, x1, y1, x2, y2, label: str, color: tuple):
    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    (tw, th), bl = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.52, 1)
    by = max(y1 - th - 6, 0)
    cv2.rectangle(frame, (x1, by), (x1 + tw + 6, by + th + bl + 4), color, -1)
    cv2.putText(frame, label, (x1 + 3, by + th + 2),
                cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 0, 0), 1, cv2.LINE_AA)


def _draw_skeleton(frame: np.ndarray, kps: list[Keypoint],
                   bone_color: tuple = (255, 200, 50),
                   joint_color: tuple = (50, 230, 230)):
    for (a, b) in SKELETON:
        if a >= len(kps) or b >= len(kps): continue
        ka, kb = kps[a], kps[b]
        if ka.visible and kb.visible:
            cv2.line(frame, ka.pt(), kb.pt(), bone_color, 2, cv2.LINE_AA)
    for kp in kps:
        if kp.visible:
            cv2.circle(frame, kp.pt(), 4, joint_color, -1, cv2.LINE_AA)


def _draw_badge(frame: np.ndarray, x: int, y: int, text: str, color: tuple,
                font_scale: float = 0.55):
    (tw, th), bl = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
    cv2.rectangle(frame, (x, y), (x + tw + 8, y + th + bl + 6), color, -1)
    cv2.putText(frame, text, (x + 4, y + th + 3),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), 1, cv2.LINE_AA)
    return tw + 10, th + bl + 8


def _draw_angle_line(frame: np.ndarray, kp_a: Keypoint, kp_b: Keypoint,
                     angle_deg: float, color: tuple):
    if kp_a.visible and kp_b.visible:
        cv2.line(frame, kp_a.pt(), kp_b.pt(), color, 2, cv2.LINE_AA)
        mid = ((kp_a.x + kp_b.x) / 2, (kp_a.y + kp_b.y) / 2)
        cv2.putText(frame, f"{angle_deg:.1f}°",
                    (int(mid[0]) + 4, int(mid[1]) - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)


def _draw_meter(frame: np.ndarray, x: int, y: int, w: int,
                value: int, max_value: int, label: str, color: tuple):
    """Horizontal progress bar for score visualization."""
    bar_h = 14
    fill  = int(w * value / max(max_value, 1))
    cv2.rectangle(frame, (x, y), (x + w, y + bar_h), C["dark"], -1)
    if fill > 0:
        cv2.rectangle(frame, (x, y), (x + fill, y + bar_h), color, -1)
    cv2.rectangle(frame, (x, y), (x + w, y + bar_h), C["grey"], 1)
    cv2.putText(frame, f"{label}: {value}/{max_value}",
                (x, y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, C["white"], 1, cv2.LINE_AA)


def _draw_signal_row(frame: np.ndarray, x: int, y: int, active: bool, label: str):
    """One indicator row: colored circle + label text."""
    color  = C["green"] if not active else C["red"]
    symbol = "●" if active else "○"
    cv2.putText(frame, f"{symbol} {label}", (x, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1, cv2.LINE_AA)


# ── Context-specific overlay drawers ─────────────────────────────────────────

def _overlay_consultation(frame: np.ndarray, sig: ConsultationSignals,
                          x1: int, y1: int, x2: int, y2: int):
    """Draws discomfort-level box around person + signal panel."""
    # Person box colored by discomfort level
    cv2.rectangle(frame, (x1, y1), (x2, y2), sig.level_color, 2)
    _draw_badge(frame, x1, max(y1 - 26, 0), f"CONSULTA: {sig.level}", sig.level_color)

    # Signal panel (top-right corner of bounding box)
    px, py = x2 + 6, y1
    panel_w = 180
    overlay  = frame.copy()
    cv2.rectangle(overlay, (px, py), (px + panel_w, py + 110), C["dark"], -1)
    cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

    cv2.putText(frame, "Sinais detectados:", (px + 4, py + 14),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, C["white"], 1, cv2.LINE_AA)

    rows = [
        (sig.eye_avoidance,   "Evitação visual"),
        (sig.arms_crossed,    "Braços cruzados"),
        (sig.wrist_near_face, "Mãos perto do rosto"),
        (sig.shoulder_raised, "Ombros elevados"),
        (sig.body_contracted, "Corpo contraído"),
    ]
    for i, (active, label) in enumerate(rows):
        _draw_signal_row(frame, px + 4, py + 30 + i * 16, active, label)

    # Discomfort meter below panel
    _draw_meter(frame, px, py + 116, panel_w - 4,
                sig.discomfort_score, 5, "Desconforto", sig.level_color)


def _overlay_physiotherapy(frame: np.ndarray, sig: PhysiotherapySignals,
                            kps: list[Keypoint], x1: int, y2: int, x2: int):
    """Draws ROM arcs, angle lines and recovery panel."""
    m = _kp_map(kps)
    ls, rs = m.get("left_shoulder"), m.get("right_shoulder")
    lw, rw = m.get("left_wrist"),    m.get("right_wrist")
    lh, rh = m.get("left_hip"),      m.get("right_hip")

    # Shoulder tilt line
    if ls and rs:
        col = C["green"] if sig.shoulder_tilt_deg < 10 else C["orange"]
        _draw_angle_line(frame, ls, rs, sig.shoulder_tilt_deg, col)

    # Hip tilt line
    if lh and rh:
        col = C["green"] if sig.hip_tilt_deg < 10 else C["orange"]
        _draw_angle_line(frame, lh, rh, sig.hip_tilt_deg, col)

    # ROM vertical lines per arm
    for wrist, shoulder, rom, label in [
        (lw, ls, sig.left_rom,  "E"),
        (rw, rs, sig.right_rom, "D"),
    ]:
        if wrist and shoulder:
            rom_color = C["green"] if rom > 0.5 else (C["yellow"] if rom > 0.2 else C["red"])
            cv2.line(frame, shoulder.pt(), wrist.pt(), rom_color, 3, cv2.LINE_AA)
            cv2.putText(frame, f"{label}:{rom:.0%}",
                        (int(wrist.x) + 5, int(wrist.y)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, rom_color, 1, cv2.LINE_AA)

    # Recovery badge below person box
    _draw_badge(frame, x1, y2 + 4, f"FISIO: {sig.recovery_label}", sig.recovery_color)

    # Side panel
    px, py = x2 + 6, int((frame.shape[0] * 0.10))
    panel_w = 190
    overlay  = frame.copy()
    cv2.rectangle(overlay, (px, py), (px + panel_w, py + 140), C["dark"], -1)
    cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

    def row(txt, val, thresh, unit=""):
        return txt, val, thresh, unit

    metrics = [
        ("ROM Esq.",    f"{sig.left_rom:.0%}",           sig.left_rom < 0.3),
        ("ROM Dir.",    f"{sig.right_rom:.0%}",           sig.right_rom < 0.3),
        ("Simetria",    f"{sig.arm_symmetry:.0%}",        sig.arm_symmetry < 0.70),
        ("Ombros",      f"{sig.shoulder_tilt_deg:.1f}°",  sig.shoulder_tilt_deg > 10),
        ("Quadril",     f"{sig.hip_tilt_deg:.1f}°",       sig.hip_tilt_deg > 10),
        ("Tronco",      f"{sig.trunk_lean_deg:.1f}°",     sig.trunk_lean_deg > 15),
        ("M. Inferiores", "Ativo" if sig.lower_limb_active else "—", False),
    ]

    cv2.putText(frame, "Análise de Movimento:", (px + 4, py + 14),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, C["white"], 1, cv2.LINE_AA)

    for i, (label, val, issue) in enumerate(metrics):
        color = C["red"] if issue else C["green"]
        cv2.putText(frame, f"{label}: {val}",
                    (px + 4, py + 30 + i * 16),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, color, 1, cv2.LINE_AA)

    # Symmetry meter
    _draw_meter(frame, px, py + 150, panel_w - 4,
                int(sig.arm_symmetry * 5), 5, "Simetria", sig.recovery_color)


def _overlay_violence(frame: np.ndarray, sig: ViolenceSignals,
                      x1: int, y1: int, x2: int, y2: int, sustained: int):
    """Draws risk-colored bounding box + risk meter + indicator checklist."""
    color = sig.risk_color

    # Thick person box colored by risk
    thickness = 3 if sig.risk_score >= 3 else 2
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)

    # Risk badge above person
    _draw_badge(frame, x1, max(y1 - 26, 0),
                f"TRIAGEM: {sig.risk_label}", color)

    # Side panel
    px, py = x2 + 6, y1
    panel_w = 185
    panel_h = 145
    overlay  = frame.copy()
    cv2.rectangle(overlay, (px, py), (px + panel_w, py + panel_h), C["dark"], -1)
    cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

    cv2.putText(frame, "Indicadores:", (px + 4, py + 14),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, C["white"], 1, cv2.LINE_AA)

    indicators = [
        (sig.arms_crossed,     "Braços cruzados"),
        (sig.wrist_near_face,  "Mãos/pulsos c/ rosto"),
        (sig.shoulder_raised,  "Ombros elevados"),
        (sig.body_contracted,  "Corpo contraído"),
        (sig.head_avoidance,   "Evitação de contato"),
    ]
    for i, (active, label) in enumerate(indicators):
        _draw_signal_row(frame, px + 4, py + 30 + i * 18, active, label)

    # Risk score meter
    _draw_meter(frame, px, py + 125, panel_w - 4,
                sig.risk_score, 5, "Risco", color)

    # Sustained frame counter
    if sustained > 0:
        cv2.putText(frame, f"Persistência: {sustained} frames",
                    (px + 4, py + 148),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, C["orange"], 1, cv2.LINE_AA)

    # Red vignette border when alert
    if sig.risk_score >= 3:
        h, w = frame.shape[:2]
        vig = frame.copy()
        cv2.rectangle(vig, (0, 0), (w, h), C["red"], 18)
        cv2.addWeighted(vig, 0.35, frame, 0.65, 0, frame)


# ── HUD ───────────────────────────────────────────────────────────────────────

_MODE_LABELS = {
    "auto":          "AUTO",
    "consultation":  "CONSULTA",
    "physiotherapy": "FISIOTERAPIA",
    "violence":      "TRIAGEM VIOLÊNCIA",
}

_MODE_COLORS = {
    "auto":          C["grey"],
    "consultation":  C["cyan"],
    "physiotherapy": C["green"],
    "violence":      C["orange"],
}


def _draw_hud(frame: np.ndarray, mode: str, fps: float,
              n_persons: int, alert_msg: str | None):
    h, w = frame.shape[:2]
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (300, 95), C["dark"], -1)
    cv2.addWeighted(overlay, 0.60, frame, 0.40, 0, frame)

    mode_color = _MODE_COLORS.get(mode, C["grey"])
    mode_label = _MODE_LABELS.get(mode, mode.upper())

    cv2.putText(frame, f"Modo: {mode_label}",
                (10, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, mode_color, 1, cv2.LINE_AA)
    cv2.putText(frame, f"FPS: {fps:.1f}   Pessoas: {n_persons}",
                (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.50, C["white"], 1, cv2.LINE_AA)

    if alert_msg:
        # Flashing alert bar at top of frame
        ov = frame.copy()
        cv2.rectangle(ov, (0, 0), (w, 28), C["red"], -1)
        cv2.addWeighted(ov, 0.55, frame, 0.45, 0, frame)
        cv2.putText(frame, f"⚠  {alert_msg}", (8, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, C["white"], 1, cv2.LINE_AA)

    # Key hints at bottom
    cv2.putText(frame, "Q: sair  P: pausar  M: modo", (10, h - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, C["grey"], 1, cv2.LINE_AA)


# ── Auto mode classifier ──────────────────────────────────────────────────────

def _auto_classify(postures: list[str], detections: list[dict]) -> str:
    surgical = any(
        d.get("cls_id") in {43, 76} or d.get("surgical_label") is not None
        for d in detections
    )
    if surgical:
        return "surgery"
    exercise = postures.count("exercise")
    defensive = postures.count("defensive") + postures.count("distress")
    if exercise > defensive:
        return "physiotherapy"
    if defensive > 0:
        return "violence"
    return "consultation"


# ── Main realtime loop ────────────────────────────────────────────────────────

_MODES_CYCLE = ["auto", "consultation", "physiotherapy", "violence"]


def run(source, conf_threshold: float = 0.35,
        enable_pose: bool = True, initial_mode: str = "auto"):

    print("[realtime] Carregando modelos YOLOv8...")
    obj_model  = YOLO("yolov8n.pt")
    pose_model = YOLO("yolov8n-pose.pt") if enable_pose else None
    print(f"[realtime] Modelos carregados. Fonte: {source} | Modo: {initial_mode}")

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[realtime] ERRO: não foi possível abrir: {source}", file=sys.stderr)
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("[realtime] Iniciado. Q=sair  P=pausar  M=trocar modo")

    mode          = initial_mode
    paused        = False
    fps           = 0.0
    frame_count   = 0
    fps_timer     = cv2.TickMeter()
    fps_timer.start()
    last_frame    = None

    # Multi-frame alert history (rolling window)
    violence_history: deque[int]  = deque(maxlen=40)
    consult_history:  deque[int]  = deque(maxlen=40)
    sustained_alert_frames: int   = 0

    try:
        while True:
            if not paused:
                ret, frame = cap.read()
                if not ret:
                    print("[realtime] Fim do vídeo ou falha de captura.")
                    break
                last_frame = frame.copy()

                frame_count += 1
                if frame_count % 15 == 0:
                    fps_timer.stop()
                    fps = 15 / max(fps_timer.getTimeSec(), 0.001)
                    fps_timer.reset(); fps_timer.start()

                # ── Object detection ─────────────────────────────────────
                obj_results = obj_model(frame, verbose=False, conf=conf_threshold)

                detections_raw = []
                person_boxes   = []     # [(x1,y1,x2,y2), ...]
                n_persons      = 0

                clf = get_classifier()
                _SURGICAL_COCO = {43, 76}
                has_coco_surgical = False

                for result in obj_results:
                    for box in result.boxes:
                        cls_id = int(box.cls[0])
                        conf   = float(box.conf[0])
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        name   = result.names[cls_id]
                        color  = CLASS_COLORS.get(cls_id, DEFAULT_CLASS_COLOR)

                        surgical_label = None
                        # Enrich knife/scissors with custom instrument label
                        if cls_id in _SURGICAL_COCO:
                            has_coco_surgical = True
                            if clf.available:
                                custom = clf.classify_region(frame, int(x1), int(y1), int(x2), int(y2))
                                if custom:
                                    surgical_label = custom["label"]

                        display_name = surgical_label if surgical_label else name
                        detections_raw.append({"cls_id": cls_id, "name": display_name, "conf": conf,
                                                "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                                                "surgical_label": surgical_label})

                        # Only draw bare box for non-person objects here;
                        # person boxes are drawn by the context overlay.
                        if cls_id != 0:
                            _draw_box(frame, x1, y1, x2, y2, f"{display_name} {conf:.0%}", color)
                        else:
                            n_persons += 1
                            person_boxes.append((int(x1), int(y1), int(x2), int(y2)))

                # Full-frame surgical classification when COCO missed instruments
                if not has_coco_surgical and clf.available:
                    full = clf.classify(frame)
                    if full:
                        h_f, w_f = frame.shape[:2]
                        detections_raw.append({
                            "cls_id": -1, "name": full["label"], "conf": full["confidence"],
                            "x1": 0.0, "y1": 0.0, "x2": float(w_f), "y2": float(h_f),
                            "surgical_label": full["label"],
                        })
                        # Draw subtle full-frame border for classifier-only match
                        _draw_box(frame, 4, 4, w_f - 4, h_f - 4,
                                  f"INSTRUMENTO: {full['label']} {full['confidence']:.0%}",
                                  CLASS_COLORS.get(43, DEFAULT_CLASS_COLOR))

                # ── Pose estimation ──────────────────────────────────────
                all_keypoints: list[list[Keypoint]] = []
                postures: list[str] = []

                if enable_pose and pose_model is not None:
                    pose_results = pose_model(frame, verbose=False)

                    for result in pose_results:
                        if result.keypoints is None: continue
                        kps_xy   = result.keypoints.xy
                        kps_conf = result.keypoints.conf

                        for pid in range(len(kps_xy)):
                            xy      = kps_xy[pid].tolist()
                            conf_kp = kps_conf[pid].tolist() if kps_conf is not None else [1.0] * 17
                            kps     = _extract_keypoints(xy, conf_kp)
                            all_keypoints.append(kps)

                            # Base skeleton (always drawn)
                            _draw_skeleton(frame, kps)

                            # Quick posture label for auto mode
                            from services.detector import _classify_posture as _cp_srv
                            # Adapt our Keypoint objects to the dict format used by services/detector.py
                            kp_dicts = [{"name": k.name, "x": k.x, "y": k.y, "confidence": k.conf} for k in kps]
                            posture = _cp_srv(kp_dicts)
                            postures.append(posture)

                # ── Determine active clinical mode ────────────────────────
                active_mode = mode
                if active_mode == "auto":
                    active_mode = _auto_classify(postures, detections_raw)

                # ── Context-specific overlay per person ───────────────────
                alert_msg: str | None = None

                for pid, (px1, py1, px2, py2) in enumerate(person_boxes):
                    kps = all_keypoints[pid] if pid < len(all_keypoints) else []

                    if active_mode == "consultation":
                        sig = _analyze_consultation(kps)
                        consult_history.append(sig.discomfort_score)
                        _overlay_consultation(frame, sig, px1, py1, px2, py2)

                        # Sustained discomfort alert
                        if len(consult_history) >= 20:
                            avg = sum(consult_history) / len(consult_history)
                            if avg >= 2.5:
                                alert_msg = "Desconforto persistente detectado — avaliação clínica recomendada"

                    elif active_mode == "physiotherapy":
                        sig = _analyze_physiotherapy(kps)
                        _overlay_physiotherapy(frame, sig, kps, px1, py2, px2)

                        if sig.compensation:
                            alert_msg = "Compensação motora detectada — ajustar exercício"

                    elif active_mode == "violence":
                        sig = _analyze_violence(kps)
                        violence_history.append(sig.risk_score)

                        # Sustained risk: count consecutive frames with risk_score >= 2
                        if sig.risk_score >= 2:
                            sustained_alert_frames += 1
                        else:
                            sustained_alert_frames = max(0, sustained_alert_frames - 1)

                        sig.sustained_frames = sustained_alert_frames
                        _overlay_violence(frame, sig, px1, py1, px2, py2,
                                          sustained_alert_frames)

                        if sustained_alert_frames >= 15:
                            alert_msg = "Indicadores de violência persistentes — triagem clínica urgente"

                    else:
                        # Unknown/surgery — just draw person box
                        cv2.rectangle(frame, (px1, py1), (px2, py2), C["green"], 2)
                        if pid < len(postures):
                            _draw_badge(frame, px1, py2 + 4, postures[pid].upper(),
                                        POSTURE_COLORS.get(postures[pid], C["grey"]))

                # ── HUD ──────────────────────────────────────────────────
                _draw_hud(frame, mode, fps, n_persons, alert_msg)

            # Display
            display = frame if not paused else (last_frame if last_frame is not None else frame)
            win_title = f"YOLOv8 — Saúde da Mulher | {_MODE_LABELS.get(mode, mode)}"
            cv2.imshow(win_title, display)

            key = cv2.waitKey(1) & 0xFF
            if key in (ord('q'), 27):
                break
            elif key == ord('p'):
                paused = not paused
                print(f"[realtime] {'PAUSADO' if paused else 'RETOMADO'}")
            elif key == ord('m'):
                idx  = _MODES_CYCLE.index(mode) if mode in _MODES_CYCLE else 0
                mode = _MODES_CYCLE[(idx + 1) % len(_MODES_CYCLE)]
                violence_history.clear()
                consult_history.clear()
                sustained_alert_frames = 0
                print(f"[realtime] Modo → {mode}")

    except KeyboardInterrupt:
        print("\n[realtime] Interrompido pelo usuário.")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("[realtime] Encerrado.")


# ── CLI ──────────────────────────────────────────────────────────────────────

def _parse_args():
    parser = argparse.ArgumentParser(
        description="YOLOv8 Realtime Clinical Detector — Saúde da Mulher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Modos clínicos:
  auto           Detecta automaticamente o contexto (padrão)
  consultation   Sinais não-verbais de desconforto ou medo
  physiotherapy  Análise de movimentos e recuperação pós-parto
  violence       Linguagem corporal indicativa de abuso/violência

Teclas durante execução:
  Q / Esc  Sair
  P        Pausar / Retomar
  M        Trocar modo clínico
        """
    )
    parser.add_argument("--source", default=0,
        help="Webcam index (0, 1, …) ou caminho para arquivo de vídeo. Padrão: 0")
    parser.add_argument("--mode", default="auto",
        choices=["auto", "consultation", "physiotherapy", "violence"],
        help="Modo clínico ativo. Padrão: auto")
    parser.add_argument("--conf", type=float, default=0.35,
        help="Limiar de confiança YOLOv8 (0–1). Padrão: 0.35")
    parser.add_argument("--no-pose", action="store_true",
        help="Desativa estimação de pose (mais rápido em CPU)")
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    source = args.source
    try:
        source = int(source)
    except (ValueError, TypeError):
        pass
    run(source=source, conf_threshold=args.conf,
        enable_pose=not args.no_pose, initial_mode=args.mode)
