#!/usr/bin/env python3
"""Validate normalized lecture JSON content before publishing."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

REQUIRED_FIELDS = {
    "volume": int,
    "chapter": int,
    "section": int,
    "title": str,
    "summary": str,
    "key_concepts": list,
    "examples": list,
    "source_reference": str,
}


def validate_file(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [f"{path}: invalid JSON ({exc})"]

    for field, field_type in REQUIRED_FIELDS.items():
        if field not in data:
            errors.append(f"{path}: missing required field '{field}'")
            continue

        value = data[field]
        if not isinstance(value, field_type):
            errors.append(
                f"{path}: field '{field}' expected {field_type.__name__}, got {type(value).__name__}"
            )
            continue

        if field_type is str and not value.strip():
            errors.append(f"{path}: field '{field}' must be a non-empty string")
        if field_type is list and not value:
            errors.append(f"{path}: field '{field}' must be a non-empty list")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lectures-dir", default="content/lectures", type=Path)
    args = parser.parse_args()

    lecture_files = sorted(
        p for p in args.lectures_dir.glob("**/*.json") if p.name != "index.json"
    )

    if not lecture_files:
        print(f"No lecture JSON files found under {args.lectures_dir}")
        return 1

    all_errors: list[str] = []
    for lecture_file in lecture_files:
        all_errors.extend(validate_file(lecture_file))

    if all_errors:
        print("Validation failed:")
        for error in all_errors:
            print(f"- {error}")
        return 1

    print(f"Validated {len(lecture_files)} lecture files under {args.lectures_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
