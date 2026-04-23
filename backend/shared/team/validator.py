"""
Validate team data for create/update.
"""

from shared.ticket.validator import VALID_CATEGORIES


def validate_team(data: dict) -> list:
    errors = []

    required = ["name", "category"]
    for field in required:
        if field not in data or not str(data[field]).strip():
            errors.append(f"{field} is required")

    if errors:
        return errors

    name = data["name"].strip()
    if len(name) < 2:
        errors.append("Team name must be at least 2 characters")
    if len(name) > 60:
        errors.append("Team name must not exceed 60 characters")

    if data["category"] not in VALID_CATEGORIES:
        errors.append(
            f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}"
        )

    return errors


def validate_team_update(data: dict) -> list:
    errors = []

    editable = ["name", "category"]
    provided = {k: data[k] for k in editable if k in data}

    if not provided:
        errors.append(f"At least one editable field required: {', '.join(editable)}")
        return errors

    if "name" in provided:
        name = str(provided["name"]).strip()
        if len(name) < 2:
            errors.append("Team name must be at least 2 characters")
        if len(name) > 60:
            errors.append("Team name must not exceed 60 characters")

    if "category" in provided and provided["category"] not in VALID_CATEGORIES:
        errors.append(
            f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}"
        )

    return errors
