"""Validation for admin-only ticket notes."""


def validate_admin_note(data: dict) -> list:
    errors = []

    if "content" not in data or not str(data["content"]).strip():
        errors.append("content is required")
        return errors

    content = str(data["content"]).strip()
    if len(content) < 3:
        errors.append("Content must be at least 3 characters")
    if len(content) > 2000:
        errors.append("Content must not exceed 2000 characters")

    return errors
