"""
Converts uml_dataset.csv + images into the Unsloth/Qwen-VL fine-tuning format.

Output formats:
  1. data/finetune_chat.jsonl  — chat-format (messages list with image_url)
  2. data/finetune_hf/        — HuggingFace Dataset (Parquet) ready for push_to_hub

Instruction templates produce 3 variants per diagram:
  - "describe" : full structural description
  - "entities" : list entities present
  - "mermaid"  : generate mermaid code from description (inverse task)
"""

import base64
import csv
import json
import os
from pathlib import Path

import pandas as pd
from datasets import Dataset, Features, Sequence, Value, Image as HFImage

DATA_DIR = Path("data")
IMAGES_DIR = Path("images")
CSV_PATH = DATA_DIR / "uml_dataset.csv"
JSONL_PATH = DATA_DIR / "finetune_chat.jsonl"
HF_DIR = DATA_DIR / "finetune_hf"


INSTRUCTION_TEMPLATES = [
    {
        "variant": "describe",
        "instruction": "Analyze this UML diagram and provide a complete description of its structure, including all entities, components, and relationships shown.",
        "output_field": "description",
    },
    {
        "variant": "entities",
        "instruction": "List all entities, classes, actors, or components visible in this UML diagram.",
        "output_field": "entities",
    },
    {
        "variant": "relationships",
        "instruction": "Describe all relationships, connections, and interactions between components in this UML diagram.",
        "output_field": "relationships",
    },
    {
        "variant": "diagram_type",
        "instruction": "What type of UML diagram is shown? Explain the diagram's purpose based on its structure.",
        "output_field": "diagram_type_answer",
    },
    {
        "variant": "mermaid",
        "instruction": "Based on the structure visible in this diagram image, write the equivalent Mermaid diagram code.",
        "output_field": "mermaid_code",
    },
]

DIAGRAM_TYPE_DESCRIPTIONS = {
    "class": "This is a Class diagram (UML). It shows the static structure of a system by depicting classes, their attributes, methods, and the relationships between them.",
    "sequence": "This is a Sequence diagram (UML). It illustrates object interactions arranged in time sequence, showing the messages exchanged between participants.",
    "flowchart": "This is a Flowchart diagram. It represents a process or workflow using decision nodes, process steps, and directional arrows.",
    "stateDiagram": "This is a State diagram (UML). It models the behavior of a system by showing states and the transitions triggered by events.",
    "erDiagram": "This is an Entity-Relationship (ER) diagram. It models the data structure of a system showing entities, their attributes, and relationships.",
    "gantt": "This is a Gantt chart. It shows a project schedule with tasks, durations, dependencies, and their timeline.",
    "mindmap": "This is a Mind Map diagram. It visually organizes information hierarchically around a central concept.",
}


def image_to_base64(path: Path) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def build_record(row: dict, template: dict) -> dict | None:
    img_path = Path(row.get("image_path", ""))
    if not img_path.exists():
        return None

    output_value = row.get(template["output_field"], "")
    if template["output_field"] == "diagram_type_answer":
        output_value = DIAGRAM_TYPE_DESCRIPTIONS.get(row["diagram_type"], row["diagram_type"])

    if not output_value:
        return None

    b64 = image_to_base64(img_path)

    return {
        "id": f"{row['id']}_{template['variant']}",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64}"},
                    },
                    {"type": "text", "text": template["instruction"]},
                ],
            },
            {
                "role": "assistant",
                "content": output_value,
            },
        ],
        "metadata": {
            "diagram_id": row["id"],
            "diagram_type": row["diagram_type"],
            "variant": template["variant"],
        },
    }


def build_jsonl(rows: list[dict]) -> list[dict]:
    records = []
    for row in rows:
        for tmpl in INSTRUCTION_TEMPLATES:
            rec = build_record(row, tmpl)
            if rec:
                records.append(rec)
    return records


def save_jsonl(records: list[dict]):
    with open(JSONL_PATH, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"JSONL written: {JSONL_PATH} ({len(records)} records)")


def build_hf_dataset(rows: list[dict]) -> Dataset:
    flat = []
    for row in rows:
        img_path = Path(row.get("image_path", ""))
        if not img_path.exists():
            continue
        for tmpl in INSTRUCTION_TEMPLATES:
            output_value = row.get(tmpl["output_field"], "")
            if tmpl["output_field"] == "diagram_type_answer":
                output_value = DIAGRAM_TYPE_DESCRIPTIONS.get(row["diagram_type"], row["diagram_type"])
            if not output_value:
                continue
            flat.append(
                {
                    "id": f"{row['id']}_{tmpl['variant']}",
                    "image": str(img_path),
                    "instruction": tmpl["instruction"],
                    "output": output_value,
                    "diagram_type": row["diagram_type"],
                    "variant": tmpl["variant"],
                    "mermaid_code": row["mermaid_code"],
                }
            )

    df = pd.DataFrame(flat)
    ds = Dataset.from_pandas(df)
    return ds


if __name__ == "__main__":
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"Loaded {len(rows)} rows from CSV")

    records = build_jsonl(rows)
    save_jsonl(records)

    print("Building HuggingFace Dataset...")
    ds = build_hf_dataset(rows)
    HF_DIR.mkdir(parents=True, exist_ok=True)
    ds.save_to_disk(str(HF_DIR))
    print(f"HF Dataset saved: {HF_DIR} ({len(ds)} examples)")

    print("\nSummary:")
    print(f"  Source diagrams : {len(rows)}")
    print(f"  Training records: {len(records)} (chat JSONL)")
    print(f"  HF examples     : {len(ds)}")
    print(f"\nUnsloth usage:")
    print(f"  dataset = load_from_disk('{HF_DIR}')")
    print(f"  # or load chat format: {JSONL_PATH}")
