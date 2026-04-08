"""
Request validators — replaces Django REST Framework serializers.
Simple validation functions that raise ValueError on invalid input.
"""

VALID_CATEGORIES = [
    "IT Support", "Facilities", "Academic Services",
    "Library", "Finance", "General Inquiry",
]

VALID_PRIORITIES = ["Low", "Medium", "High", "Urgent"]

VALID_STATUSES = ["Open", "In Progress", "Resolved", "Closed"]


def validate_ticket_create(data: dict) -> dict:
    """Validate ticket creation payload. Returns cleaned data."""
    errors = []

    email = data.get("email", "").strip()
    if not email or "@" not in email:
        errors.append("A valid email is required.")

    display_name = data.get("display_name", "").strip()
    if not display_name:
        errors.append("display_name is required.")

    subject = data.get("subject", "").strip()
    if not subject:
        errors.append("subject is required.")

    description = data.get("description", "").strip()
    if not description:
        errors.append("description is required.")

    category = data.get("category", "").strip()
    if category not in VALID_CATEGORIES:
        errors.append(f"category must be one of: {VALID_CATEGORIES}")

    priority = data.get("priority", "Medium").strip()
    if priority not in VALID_PRIORITIES:
        errors.append(f"priority must be one of: {VALID_PRIORITIES}")

    if errors:
        raise ValueError(errors)

    return {
        "email": email,
        "display_name": display_name,
        "subject": subject,
        "description": description,
        "category": category,
        "priority": priority,
    }


def validate_status_update(data: dict) -> dict:
    """Validate ticket status update payload."""
    errors = []

    status = data.get("status", "").strip()
    if status not in VALID_STATUSES:
        errors.append(f"status must be one of: {VALID_STATUSES}")

    notes = data.get("notes", "").strip()

    if errors:
        raise ValueError(errors)

    return {"status": status, "notes": notes}


def validate_ticket_assign(data: dict) -> dict:
    """Validate ticket assignment payload."""
    assigned_to = data.get("assigned_to", "").strip()
    if not assigned_to:
        raise ValueError(["assigned_to (user_id) is required."])
    return {"assigned_to": assigned_to}


def validate_admin_note(data: dict) -> dict:
    """Validate admin note creation payload."""
    content = data.get("content", "").strip()
    if not content:
        raise ValueError(["content is required."])
    return {"content": content}
