"""Validation for ticket comments / progress entries."""


VALID_ENTRY_TYPES = ["comment", "resolution", "escalation", "reopen"]


def validate_comment(data: dict) -> list:
    errors = []

    required_fields = ["topic", "description"]
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            errors.append(f"{field} is required")

    if errors:
        return errors

    topic = str(data["topic"]).strip()
    if len(topic) < 3:
        errors.append("Topic must be at least 3 characters")
    if len(topic) > 100:
        errors.append("Topic must not exceed 100 characters")

    description = str(data["description"]).strip()
    if len(description) < 3:
        errors.append("Description must be at least 3 characters")
    if len(description) > 1000:
        errors.append("Description must not exceed 1000 characters")

    if "location" in data and data["location"] is not None:
        location = str(data["location"]).strip()
        if len(location) > 200:
            errors.append("Location must not exceed 200 characters")

    return errors
