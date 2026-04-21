#!/usr/bin/env python3
"""Transform raw lecture text files into normalized versioned JSON content."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

FIELD_LABELS = {
    "volume": "volume",
    "chapter": "chapter",
    "section": "section",
    "unit title": "unit_title",
    "unit slug": "unit_slug",
    "unit summary": "unit_summary",
    "title": "title",
    "estimated minutes": "estimated_minutes",
    "summary": "summary",
    "learning objectives": "learning_objectives",
    "key concepts": "key_concepts",
    "examples": "examples",
    "quick recap": "quick_recap",
    "equations": "equations",
    "worked examples": "worked_examples",
    "common mistakes": "common_mistakes",
    "checkpoints": "checkpoints",
    "interactive lab": "interactive_lab",
    "challenge sets": "challenge_sets",
    "source reference": "source_reference",
}

LIST_FIELDS = {"learning_objectives", "key_concepts", "examples"}
OBJECT_LIST_FIELDS = {"equations", "worked_examples", "common_mistakes", "checkpoints", "challenge_sets"}
SIMPLE_TEXT_FIELDS = {"summary", "unit_summary", "quick_recap"}

PIPE_SPLIT_PATTERN = re.compile(r"\s+\|\s+")
SLUG_PATTERN = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    cleaned = SLUG_PATTERN.sub("-", value.lower()).strip("-")
    return cleaned or "lecture"


def parse_sections(raw_text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current_field: str | None = None

    for line in raw_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        if ":" in stripped:
            label, value = [part.strip() for part in stripped.split(":", 1)]
            normalized = FIELD_LABELS.get(label.lower())
            if normalized is not None:
                current_field = normalized
                sections.setdefault(normalized, [])
                if value:
                    sections[normalized].append(value)
                continue

        if current_field is not None:
            sections.setdefault(current_field, []).append(stripped)

    return sections


def strip_bullet(value: str) -> str:
    return value[2:].strip() if value.startswith("- ") else value.strip()


def parse_object_item(raw_item: str) -> dict[str, object]:
    item = strip_bullet(raw_item)
    parts = PIPE_SPLIT_PATTERN.split(item)
    parsed: dict[str, object] = {}

    for part in parts:
        if ":" not in part:
            continue
        key, value = [token.strip() for token in part.split(":", 1)]
        normalized_key = key.lower().replace(" ", "_")

        if normalized_key in {"options", "steps"}:
            parsed[normalized_key] = [segment.strip() for segment in value.split("||") if segment.strip()]
        elif normalized_key == "pairs":
            parsed[normalized_key] = [
                {
                    "term": pair.split("=>", 1)[0].strip(),
                    "match": pair.split("=>", 1)[1].strip(),
                }
                for pair in value.split("||")
                if "=>" in pair
            ]
        elif normalized_key == "solution_order":
            parsed[normalized_key] = [int(segment.strip()) for segment in value.split(",") if segment.strip()]
        elif normalized_key in {
            "x_min",
            "x_max",
            "x_step",
            "x_default",
            "y_min",
            "y_max",
            "y_step",
            "y_default",
            "output_precision",
        }:
            parsed[normalized_key] = int(value)
        elif normalized_key == "answer" and value.isdigit():
            parsed[normalized_key] = int(value)
        else:
            parsed[normalized_key] = value

    return parsed


@dataclass
class Lecture:
    volume: int
    chapter: int
    section: int
    unit_title: str
    unit_slug: str
    unit_summary: str
    title: str
    estimated_minutes: int
    summary: str
    learning_objectives: list[str]
    key_concepts: list[str]
    examples: list[str]
    quick_recap: str
    equations: list[dict[str, object]]
    worked_examples: list[dict[str, object]]
    common_mistakes: list[dict[str, object]]
    checkpoints: list[dict[str, object]]
    interactive_lab: dict[str, object]
    challenge_sets: list[dict[str, object]]
    source_reference: str

    def to_dict(self, source_file: Path, version: str) -> dict:
        return {
            "volume": self.volume,
            "chapter": self.chapter,
            "section": self.section,
            "unit_title": self.unit_title,
            "unit_slug": self.unit_slug,
            "unit_summary": self.unit_summary,
            "title": self.title,
            "estimated_minutes": self.estimated_minutes,
            "summary": self.summary,
            "learning_objectives": self.learning_objectives,
            "key_concepts": self.key_concepts,
            "examples": self.examples,
            "quick_recap": self.quick_recap,
            "equations": self.equations,
            "worked_examples": self.worked_examples,
            "common_mistakes": self.common_mistakes,
            "checkpoints": self.checkpoints,
            "interactive_lab": self.interactive_lab,
            "challenge_sets": self.challenge_sets,
            "source_reference": self.source_reference,
            "source_file": source_file.name,
            "schema_version": version,
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        }


def parse_lecture(raw_text: str) -> Lecture:
    sections = parse_sections(raw_text)

    parsed: dict[str, object] = {}
    for field, values in sections.items():
      stripped_values = [strip_bullet(value) for value in values if strip_bullet(value)]
      if field in SIMPLE_TEXT_FIELDS:
          parsed[field] = " ".join(stripped_values).strip()
      elif field in LIST_FIELDS:
          parsed[field] = stripped_values
      elif field in OBJECT_LIST_FIELDS:
          parsed[field] = [parse_object_item(value) for value in stripped_values]
      elif field == "interactive_lab":
          parsed[field] = parse_object_item(stripped_values[0]) if stripped_values else {}
      else:
          parsed[field] = stripped_values[0] if stripped_values else ""

    required = [
        "volume",
        "chapter",
        "section",
        "unit_title",
        "unit_slug",
        "unit_summary",
        "title",
        "estimated_minutes",
        "summary",
        "learning_objectives",
        "key_concepts",
        "examples",
        "quick_recap",
        "equations",
        "worked_examples",
        "common_mistakes",
        "checkpoints",
        "interactive_lab",
        "challenge_sets",
        "source_reference",
    ]
    missing = [field for field in required if field not in parsed or parsed[field] in ("", [], {})]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    challenge_sets = list(parsed["challenge_sets"])
    for challenge in challenge_sets:
        if "type_label" not in challenge and "type" in challenge:
            challenge["type_label"] = str(challenge["type"]).replace("_", " ").title()

    return Lecture(
        volume=int(parsed["volume"]),
        chapter=int(parsed["chapter"]),
        section=int(parsed["section"]),
        unit_title=str(parsed["unit_title"]),
        unit_slug=str(parsed["unit_slug"]),
        unit_summary=str(parsed["unit_summary"]),
        title=str(parsed["title"]),
        estimated_minutes=int(parsed["estimated_minutes"]),
        summary=str(parsed["summary"]),
        learning_objectives=list(parsed["learning_objectives"]),
        key_concepts=list(parsed["key_concepts"]),
        examples=list(parsed["examples"]),
        quick_recap=str(parsed["quick_recap"]),
        equations=list(parsed["equations"]),
        worked_examples=list(parsed["worked_examples"]),
        common_mistakes=list(parsed["common_mistakes"]),
        checkpoints=list(parsed["checkpoints"]),
        interactive_lab=dict(parsed["interactive_lab"]),
        challenge_sets=challenge_sets,
        source_reference=str(parsed["source_reference"]),
    )


def ingest(raw_dir: Path, output_dir: Path, version: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []

    for raw_file in sorted(raw_dir.glob("*.txt")):
        lecture = parse_lecture(raw_file.read_text(encoding="utf-8"))
        payload = lecture.to_dict(raw_file, version)
        slug = f"v{lecture.volume:02d}-c{lecture.chapter:02d}-s{lecture.section:02d}-{slugify(lecture.title)}"
        output_path = output_dir / f"{slug}.json"
        output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        entries.append(
            {
                "id": slug,
                "title": lecture.title,
                "volume": lecture.volume,
                "chapter": lecture.chapter,
                "section": lecture.section,
                "unit_title": lecture.unit_title,
                "unit_slug": lecture.unit_slug,
                "unit_summary": lecture.unit_summary,
                "estimated_minutes": lecture.estimated_minutes,
                "summary": lecture.summary,
                "source_reference": lecture.source_reference,
                "path": str(output_path.as_posix()),
            }
        )

    manifest = {
        "schema_version": version,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "lectures": entries,
    }
    (output_dir / "index.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", default="content/raw", type=Path)
    parser.add_argument("--version", default="v1")
    parser.add_argument("--output-root", default="content/lectures", type=Path)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    output_dir = args.output_root / args.version
    ingest(args.raw_dir, output_dir, args.version)
    print(f"Ingested lectures from {args.raw_dir} into {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
