"""
Treinamento do classificador customizado de instrumentos cirúrgicos ginecológicos.

Classes detectadas:
  bisturi      → bisturi/escalpelo (740 imagens)
  pinca        → pinça cirúrgica   (686 imagens)
  tesouracurva → tesoura curva     (812 imagens)
  tesourareta  → tesoura reta      (671 imagens)
  separado     → afastador/sepador (100 imagens)

O modelo treinado é salvo em:
  assets/models/surgical_classifier.pt

Uso:
  cd modules/yolo
  source .venv/bin/activate
  python scripts/train_surgical_classifier.py
  python scripts/train_surgical_classifier.py --epochs 50 --imgsz 224
  python scripts/train_surgical_classifier.py --validate-only   # valida modelo existente
"""

import argparse
import random
import re
import shutil
import sys
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
YOLO_DIR    = Path(__file__).parent.parent           # modules/yolo/
ASSETS_DIR  = YOLO_DIR / "assets"
IMAGES_DIR  = ASSETS_DIR / "images"
DATASET_DIR = ASSETS_DIR / "dataset"
MODELS_DIR  = ASSETS_DIR / "models"
OUTPUT_MODEL = MODELS_DIR / "surgical_classifier.pt"

# Maps image filename prefix → class label
CLASS_PREFIXES = {
    "bisturi":      "bisturi",
    "pinca":        "pinca",
    "tesouracurva": "tesouracurva",
    "tesourareta":  "tesourareta",
    "separado":     "separado",
}

TRAIN_RATIO = 0.80  # 80% train, 20% val


# ── Dataset preparation ───────────────────────────────────────────────────────

def _get_class(filename: str) -> str | None:
    """Extract the class label from a filename like 'bisturi123.jpg'."""
    stem = Path(filename).stem.lower()
    # Match by longest prefix first to avoid 'tesoura' matching 'tesouracurva'
    for prefix in sorted(CLASS_PREFIXES, key=len, reverse=True):
        if stem.startswith(prefix):
            return CLASS_PREFIXES[prefix]
    return None


def prepare_dataset(images_dir: Path, dataset_dir: Path, seed: int = 42) -> dict:
    """
    Organizes images from a flat directory into YOLOv8-classify dataset format:

      dataset/
        train/
          bisturi/      (80%)
          pinca/        (80%)
          ...
        val/
          bisturi/      (20%)
          ...

    Returns a summary dict with per-class counts.
    """
    random.seed(seed)

    # Clean existing dataset
    if dataset_dir.exists():
        shutil.rmtree(dataset_dir)

    for split in ("train", "val"):
        for cls in CLASS_PREFIXES.values():
            (dataset_dir / split / cls).mkdir(parents=True, exist_ok=True)

    # Group images by class
    class_files: dict[str, list[Path]] = {cls: [] for cls in CLASS_PREFIXES.values()}

    for img_path in sorted(images_dir.glob("*.jpg")):
        cls = _get_class(img_path.name)
        if cls:
            class_files[cls].append(img_path)
        else:
            print(f"  [WARN] Ignorado: {img_path.name} (prefixo não reconhecido)")

    summary = {}
    for cls, files in class_files.items():
        random.shuffle(files)
        n_train = max(1, int(len(files) * TRAIN_RATIO))
        train_files = files[:n_train]
        val_files   = files[n_train:]

        for f in train_files:
            shutil.copy2(f, dataset_dir / "train" / cls / f.name)
        for f in val_files:
            shutil.copy2(f, dataset_dir / "val"   / cls / f.name)

        summary[cls] = {"total": len(files), "train": len(train_files), "val": len(val_files)}
        print(f"  {cls:<16} total={len(files):>4}  train={len(train_files):>4}  val={len(val_files):>4}")

    return summary


# ── Training ──────────────────────────────────────────────────────────────────

def train(epochs: int = 10, imgsz: int = 224, batch: int = 16, device: str = "cpu"):
    """
    Fine-tunes YOLOv8n-cls on the surgical instrument dataset.

    Args:
        epochs:  Number of training epochs. Default 30 (fast baseline).
        imgsz:   Input image size. Default 224.
        batch:   Batch size. Reduce if OOM.
        device:  'cpu', '0' (first GPU), 'mps' (Apple Silicon).
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] ultralytics não instalado. Execute: pip install ultralytics")
        sys.exit(1)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n[train] Iniciando fine-tuning  epochs={epochs}  imgsz={imgsz}  batch={batch}  device={device}")
    model = YOLO("yolov8n-cls.pt")   # lightweight classification backbone

    results = model.train(
        data=str(DATASET_DIR),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device,
        project=str(MODELS_DIR / "runs"),
        name="surgical_cls",
        exist_ok=True,
        verbose=True,
        # Augmentation helps generalize to real surgical footage
        degrees=15,
        translate=0.1,
        scale=0.3,
        fliplr=0.5,
        flipud=0.1,
        hsv_h=0.015,
        hsv_s=0.4,
        hsv_v=0.3,
    )

    # Copy best model to standard output path
    best_pt = MODELS_DIR / "runs" / "surgical_cls" / "weights" / "best.pt"
    if best_pt.exists():
        shutil.copy2(best_pt, OUTPUT_MODEL)
        print(f"\n[train] Modelo salvo em: {OUTPUT_MODEL}")
    else:
        print(f"[WARN] best.pt não encontrado em {best_pt}")

    return results


# ── Validation ────────────────────────────────────────────────────────────────

def validate():
    """Run validation on the existing trained model."""
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] ultralytics não instalado.")
        sys.exit(1)

    if not OUTPUT_MODEL.exists():
        print(f"[ERROR] Modelo não encontrado: {OUTPUT_MODEL}")
        print("Execute o treinamento primeiro: python scripts/train_surgical_classifier.py")
        sys.exit(1)

    print(f"[validate] Carregando modelo: {OUTPUT_MODEL}")
    model  = YOLO(str(OUTPUT_MODEL))
    results = model.val(data=str(DATASET_DIR), imgsz=224, verbose=True)
    print("\n[validate] Métricas:")
    print(f"  top1_acc = {results.top1:.4f}")
    print(f"  top5_acc = {results.top5:.4f}")
    return results


# ── Quick inference test ──────────────────────────────────────────────────────

def test_inference(n_samples: int = 3):
    """Runs inference on a few val images to verify the trained model."""
    try:
        from ultralytics import YOLO
    except ImportError:
        return

    if not OUTPUT_MODEL.exists():
        return

    model = YOLO(str(OUTPUT_MODEL))
    print("\n[test] Amostras de inferência:")

    for cls in CLASS_PREFIXES.values():
        val_dir = DATASET_DIR / "val" / cls
        samples = list(val_dir.glob("*.jpg"))[:n_samples]
        for img in samples:
            res = model(str(img), verbose=False)
            top1 = res[0].probs.top1
            top1_name = res[0].names[top1]
            conf      = float(res[0].probs.top1conf)
            status    = "✓" if top1_name == cls else "✗"
            print(f"  {status} {cls:<16} → {top1_name:<16} ({conf:.1%})")


# ── CLI ───────────────────────────────────────────────────────────────────────

def _parse_args():
    parser = argparse.ArgumentParser(
        description="Treina classificador customizado de instrumentos cirúrgicos"
    )
    parser.add_argument("--epochs",        type=int,   default=30)
    parser.add_argument("--imgsz",         type=int,   default=224)
    parser.add_argument("--batch",         type=int,   default=16)
    parser.add_argument("--device",        type=str,   default="cpu",
                        help="cpu | 0 | mps (Apple Silicon)")
    parser.add_argument("--skip-dataset",  action="store_true",
                        help="Pula a preparação do dataset (usa dataset existente)")
    parser.add_argument("--validate-only", action="store_true",
                        help="Apenas valida modelo já treinado")
    parser.add_argument("--seed",          type=int,   default=42)
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()

    print("╔══════════════════════════════════════════════════════╗")
    print("║  Classificador de Instrumentos Cirúrgicos — YOLOv8  ║")
    print("╚══════════════════════════════════════════════════════╝\n")

    if args.validate_only:
        validate()
        sys.exit(0)

    if not IMAGES_DIR.exists():
        print(f"[ERROR] Diretório de imagens não encontrado: {IMAGES_DIR}")
        sys.exit(1)

    if not args.skip_dataset:
        print("[1/3] Preparando dataset...")
        summary = prepare_dataset(IMAGES_DIR, DATASET_DIR, seed=args.seed)
        total_imgs = sum(v["total"] for v in summary.values())
        print(f"\n  Total de imagens: {total_imgs}")
        print(f"  Classes:          {list(summary.keys())}")
        print(f"  Dataset salvo em: {DATASET_DIR}\n")
    else:
        print("[1/3] Pulando preparação do dataset (--skip-dataset)\n")

    print("[2/3] Treinando modelo...")
    train(epochs=args.epochs, imgsz=args.imgsz,
          batch=args.batch, device=args.device)

    print("\n[3/3] Testando inferência...")
    test_inference()

    print(f"\n✓ Treinamento concluído.")
    print(f"  Modelo: {OUTPUT_MODEL}")
    print(f"  Integração automática em realtime.py e main.py ao iniciar.\n")
