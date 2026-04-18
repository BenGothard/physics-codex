#!/usr/bin/env python3
"""Transform raw lecture text files into normalized versioned JSON content."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

FIELD_LABELS = {
    "volume": "volume",
    "chapter": "chapter",
    "section": "section",
    "title": "title",
    "summary": "summary",
    "key concepts": "key_concepts",
    "examples": "examples",
    "source reference": "source_reference",
}

SLUG_PATTERN = re.compile(r"[^a-z0-9]+")


@dataclass
class Lecture:
    volume: int
    chapter: int
    section: int
    title: str
    summary: str
    key_concepts: list[str]
    examples: list[str]
    source_reference: str

    def to_dict(self, source_file: Path, version: str) -> dict:
        return {
            "volume": self.volume,
            "chapter": self.chapter,
            "section": self.section,
            "title": self.title,
            "summary": self.summary,
            "key_concepts": self.key_concepts,
            "examples": self.examples,
            "source_reference": self.source_reference,
            "source_file": source_file.name,
            "schema_version": version,
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        }


def slugify(value: str) -> str:
    cleaned = SLUG_PATTERN.sub("-", value.lower()).strip("-")
    return cleaned or "lecture"


def parse_multiline_items(lines: list[str], start_index: int) -> tuple[list[str], int]:
    items: list[str] = []
    index = start_index
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if re.match(r"^[A-Za-z ]+:", line):
            break
        if line.startswith("- "):
            items.append(line[2:].strip())
        else:
            items.append(line)
        index += 1
    return items, index


def parse_lecture(raw_text: str) -> Lecture:
    lines = raw_text.splitlines()
    parsed: dict[str, object] = {}
    index = 0
    while index < len(lines):
        raw_line = lines[index].strip()
        index += 1
        if not raw_line or ":" not in raw_line:
            continue

        label, value = [part.strip() for part in raw_line.split(":", 1)]
        normalized = FIELD_LABELS.get(label.lower())
        if normalized is None:
            continue

        if normalized in {"key_concepts", "examples"}:
            items: list[str] = []
            if value:
                items.append(value.removeprefix("- ").strip())
            parsed_items, new_index = parse_multiline_items(lines, index)
            items.extend(parsed_items)
            parsed[normalized] = [item for item in items if item]
            index = new_index
        elif normalized == "summary" and not value:
            collected, new_index = parse_multiline_items(lines, index)
            parsed[normalized] = " ".join(collected).strip()
            index = new_index
        else:
            parsed[normalized] = value

    required = [
        "volume",
        "chapter",
        "section",
        "title",
        "summary",
        "key_concepts",
        "examples",
        "source_reference",
    ]
    missing = [field for field in required if field not in parsed or parsed[field] in ("", [])]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    return Lecture(
        volume=int(parsed["volume"]),
        chapter=int(parsed["chapter"]),
        section=int(parsed["section"]),
        title=str(parsed["title"]),
        summary=str(parsed["summary"]),
        key_concepts=list(parsed["key_concepts"]),
        examples=list(parsed["examples"]),
        source_reference=str(parsed["source_reference"]),
    )


def ingest(raw_dir: Path, output_dir: Path, version: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    entries: list[dict] = []

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
