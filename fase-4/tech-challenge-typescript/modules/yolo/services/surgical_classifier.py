"""
Serviço de classificação de instrumentos cirúrgicos ginecológicos.

Usa o modelo customizado treinado em assets/images/ (YOLOv8n-cls) para
identificar 5 instrumentos específicos:

  bisturi      → bisturi / escalpelo
  pinca        → pinça cirúrgica
  tesouracurva → tesoura Mayo curva / Metzenbaum
  tesourareta  → tesoura reta
  separado     → afastador / separador

O serviço é OPCIONAL: se o modelo ainda não foi treinado, retorna None
sem interromper o restante do pipeline de detecção.

Para treinar o modelo:
  cd modules/yolo && source .venv/bin/activate
  python scripts/train_surgical_classifier.py
"""

import os
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

# Relative to modules/yolo/
_MODEL_PATH = Path(__file__).parent.parent / "assets" / "models" / "surgical_classifier.pt"

# Human-readable Portuguese labels per class key
INSTRUMENT_LABELS: dict[str, str] = {
    "bisturi":      "Bisturi",
    "pinca":        "Pinça cirúrgica",
    "tesouracurva": "Tesoura curva",
    "tesourareta":  "Tesoura reta",
    "separado":     "Afastador",
}

# Minimum confidence to report a detection
CONFIDENCE_THRESHOLD = 0.50

# Clinical risk weight per instrument (used by clinical context logic)
INSTRUMENT_RISK: dict[str, str] = {
    "bisturi":      "high",     # active cutting — highest monitoring priority
    "pinca":        "medium",
    "tesouracurva": "medium",
    "tesourareta":  "medium",
    "separado":     "low",
}


class SurgicalClassifier:
    """
    Lazy-loading wrapper around the custom YOLOv8-cls surgical instrument model.

    Usage:
        clf = SurgicalClassifier()

        # Classify a full frame
        result = clf.classify(frame)
        if result:
            print(result["label"], result["confidence"])

        # Classify a crop (e.g., inside a detected bounding box)
        crop = frame[y1:y2, x1:x2]
        result = clf.classify(crop)
    """

    def __init__(self, model_path: Path = _MODEL_PATH):
        self._model_path = model_path
        self._model = None
        self._available: bool | None = None   # None = not yet checked

    @property
    def available(self) -> bool:
        """Returns True if the trained model file exists."""
        if self._available is None:
            self._available = self._model_path.exists()
            if not self._available:
                print(
                    f"[SurgicalClassifier] Modelo não encontrado: {self._model_path}\n"
                    f"  Execute o treinamento: python scripts/train_surgical_classifier.py"
                )
        return self._available

    def _load(self):
        if self._model is None and self.available:
            try:
                from ultralytics import YOLO
                self._model = YOLO(str(self._model_path))
                print(f"[SurgicalClassifier] Modelo carregado: {self._model_path.name}")
            except Exception as exc:
                print(f"[SurgicalClassifier] Falha ao carregar modelo: {exc}")
                self._available = False

    def classify(self, image: np.ndarray) -> Optional[dict]:
        """
        Classifies a frame or crop as one of the 5 surgical instrument classes.

        Args:
            image: BGR NumPy array (any size — resized internally to 224×224).

        Returns:
            dict with keys:
                class_key:   str   — e.g. "bisturi"
                label:       str   — e.g. "Bisturi"
                confidence:  float — 0.0–1.0
                risk:        str   — "high" | "medium" | "low"
                top3:        list  — [{class_key, label, confidence}, ...]

            Returns None if model is unavailable or confidence < threshold.
        """
        if not self.available:
            return None

        self._load()
        if self._model is None:
            return None

        if image is None or image.size == 0:
            return None

        try:
            results = self._model(image, verbose=False, imgsz=224)
        except Exception as exc:
            print(f"[SurgicalClassifier] Erro de inferência: {exc}")
            return None

        if not results:
            return None

        probs    = results[0].probs
        names    = results[0].names          # {idx: class_key}
        top1_idx = int(probs.top1)
        top1_conf = float(probs.top1conf)

        if top1_conf < CONFIDENCE_THRESHOLD:
            return None

        top1_key = names[top1_idx]

        # Top-3 results
        top3 = []
        top5_idxs = probs.top5
        top5_confs = probs.top5conf.tolist()
        for idx, conf in zip(top5_idxs[:3], top5_confs[:3]):
            key = names[int(idx)]
            top3.append({
                "class_key":  key,
                "label":      INSTRUMENT_LABELS.get(key, key),
                "confidence": round(float(conf), 3),
            })

        return {
            "class_key":  top1_key,
            "label":      INSTRUMENT_LABELS.get(top1_key, top1_key),
            "confidence": round(top1_conf, 3),
            "risk":       INSTRUMENT_RISK.get(top1_key, "medium"),
            "top3":       top3,
        }

    def classify_region(
        self,
        frame: np.ndarray,
        x1: int, y1: int, x2: int, y2: int,
        padding: float = 0.10,
    ) -> Optional[dict]:
        """
        Classifies a bounding-box region inside a frame.

        Args:
            frame:   Full BGR frame.
            x1,y1,x2,y2: Bounding box coordinates (pixels).
            padding: Fractional padding to add around the box (default 10%).

        Returns:
            Same as classify(), or None.
        """
        h, w = frame.shape[:2]
        pad_x = int((x2 - x1) * padding)
        pad_y = int((y2 - y1) * padding)
        cx1 = max(0, x1 - pad_x)
        cy1 = max(0, y1 - pad_y)
        cx2 = min(w, x2 + pad_x)
        cy2 = min(h, y2 + pad_y)

        if cx2 <= cx1 or cy2 <= cy1:
            return None

        crop = frame[cy1:cy2, cx1:cx2]
        return self.classify(crop)


# Module-level singleton (shared across detector + realtime)
_instance: SurgicalClassifier | None = None


def get_classifier() -> SurgicalClassifier:
    """Returns the module-level SurgicalClassifier singleton."""
    global _instance
    if _instance is None:
        _instance = SurgicalClassifier()
    return _instance
