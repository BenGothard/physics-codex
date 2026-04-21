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
    "unit_title": str,
    "unit_slug": str,
    "unit_summary": str,
    "title": str,
    "estimated_minutes": int,
    "summary": str,
    "learning_objectives": list,
    "key_concepts": list,
    "examples": list,
    "quick_recap": str,
    "equations": list,
    "worked_examples": list,
    "common_mistakes": list,
    "checkpoints": list,
    "interactive_lab": dict,
    "challenge_sets": list,
    "source_reference": str,
}

REQUIRED_EQUATION_FIELDS = {"name", "expression", "meaning", "variables"}
REQUIRED_EXAMPLE_FIELDS = {"title", "problem", "steps", "answer"}
REQUIRED_MISTAKE_FIELDS = {"mistake", "correction"}
REQUIRED_CHECKPOINT_FIELDS = {"prompt", "prediction", "reveal"}
REQUIRED_LAB_FIELDS = {
    "title",
    "prompt",
    "x_key",
    "x_label",
    "x_min",
    "x_max",
    "x_step",
    "x_default",
    "x_unit",
    "y_key",
    "y_label",
    "y_min",
    "y_max",
    "y_step",
    "y_default",
    "y_unit",
    "formula",
    "output_label",
    "output_unit",
    "output_precision",
    "insight",
}
REQUIRED_CHALLENGE_FIELDS = {"id", "type", "title", "prompt", "explanation"}


def validate_non_empty_list(path: Path, field: str, value: object) -> list[str]:
    if not isinstance(value, list) or not value:
        return [f"{path}: field '{field}' must be a non-empty list"]
    return []


def validate_object_fields(path: Path, field: str, value: object, required_fields: set[str]) -> list[str]:
    if not isinstance(value, dict):
        return [f"{path}: field '{field}' must be an object"]

    missing = sorted(required_fields - value.keys())
    return [f"{path}: field '{field}' is missing keys: {', '.join(missing)}"] if missing else []


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

    if errors:
        return errors

    for equation in data["equations"]:
        errors.extend(validate_object_fields(path, "equations[]", equation, REQUIRED_EQUATION_FIELDS))

    for example in data["worked_examples"]:
        errors.extend(validate_object_fields(path, "worked_examples[]", example, REQUIRED_EXAMPLE_FIELDS))
        if isinstance(example, dict):
          errors.extend(validate_non_empty_list(path, "worked_examples[].steps", example.get("steps")))

    for item in data["common_mistakes"]:
        errors.extend(validate_object_fields(path, "common_mistakes[]", item, REQUIRED_MISTAKE_FIELDS))

    for item in data["checkpoints"]:
        errors.extend(validate_object_fields(path, "checkpoints[]", item, REQUIRED_CHECKPOINT_FIELDS))

    errors.extend(validate_object_fields(path, "interactive_lab", data["interactive_lab"], REQUIRED_LAB_FIELDS))

    for challenge in data["challenge_sets"]:
        errors.extend(validate_object_fields(path, "challenge_sets[]", challenge, REQUIRED_CHALLENGE_FIELDS))
        if not isinstance(challenge, dict):
            continue

        challenge_type = challenge.get("type")
        if challenge_type == "multiple_choice":
            errors.extend(validate_non_empty_list(path, "challenge_sets[].options", challenge.get("options")))
            if not isinstance(challenge.get("answer"), int):
                errors.append(f"{path}: multiple_choice challenge answer must be an integer")
        elif challenge_type == "concept_match":
            errors.extend(validate_non_empty_list(path, "challenge_sets[].pairs", challenge.get("pairs")))
        elif challenge_type == "estimation_puzzle":
            if not str(challenge.get("rubric", "")).strip():
                errors.append(f"{path}: estimation_puzzle challenge requires a non-empty 'rubric'")
            if not str(challenge.get("sample_answer", "")).strip():
                errors.append(f"{path}: estimation_puzzle challenge requires a non-empty 'sample_answer'")
        elif challenge_type == "derivation_steps":
            errors.extend(validate_non_empty_list(path, "challenge_sets[].steps", challenge.get("steps")))
            errors.extend(
                validate_non_empty_list(path, "challenge_sets[].solution_order", challenge.get("solution_order"))
            )
        else:
            errors.append(f"{path}: unsupported challenge type '{challenge_type}'")

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
