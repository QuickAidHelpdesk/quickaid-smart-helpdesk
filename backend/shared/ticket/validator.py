"""
    # FR-02-02: Validate all required fields
    # FR-02-03: Validate ticket categories
"""

VALID_CATEGORIES = [
    "IT Support",
    "Facilities",
    "Academic Services",
    "Library",
    "Finance",
    "General Inquiry"
]

VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"]

VALID_STATUSES = ["Open", "In Progress", "Resolved", "Closed"]

VALID_STATUS_TRANSITIONS = {
    "Open": ["In Progress", "Closed"],
    "In Progress": ["Resolved", "Closed"],
    "Resolved": ["Closed", "In Progress"],
    "Closed": [],
}

def validate_ticket(data: dict) -> list:

    # List of error(s) identified
    errors = []

    # Check required fields
    required_fields = ["subject", "description", "category", "priority", "email"]
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            errors.append(f"{field} is required")

    # Return if missing fields
    if errors:
        return errors

    # Validate subject length
    if len(data["subject"].strip()) < 5:
        errors.append("Subject must be at least 5 characters")
    if len(data["subject"].strip()) > 100:
        errors.append("Subject must not exceed 100 characters")

    # Validate description length
    if len(data["description"].strip()) < 10:
        errors.append("Description must be at least 10 characters")
    if len(data["description"].strip()) > 1000:
        errors.append("Description must not exceed 1000 characters")

    # Validate category  FR-02-03
    if data["category"] not in VALID_CATEGORIES:
        errors.append(
            f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}"
        )

    # Validate priority
    if data["priority"] not in VALID_PRIORITIES:
        errors.append(
            f"Invalid priority. Choose from: {', '.join(VALID_PRIORITIES)}"
        )

    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data["email"]):
        errors.append("Invalid email format")

    return errors


# FR-08-01: Validate status update request
def validate_status_update(data: dict, current_status: str = None) -> list:
    errors = []

    if "status" not in data or not str(data["status"]).strip():
        errors.append("status is required")
        return errors

    new_status = data["status"].strip()

    if new_status not in VALID_STATUSES:
        errors.append(
            f"Invalid status. Choose from: {', '.join(VALID_STATUSES)}"
        )
        return errors

    # Validate transition if current status is provided
    if current_status:
        allowed = VALID_STATUS_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            errors.append(
                f"Cannot transition from '{current_status}' to '{new_status}'. "
                f"Allowed: {', '.join(allowed) if allowed else 'none (terminal state)'}."
            )

    return errors


# Validate partial ticket edit (subject, description, category, priority)
EDITABLE_FIELDS = ["subject", "description", "category", "priority"]

def validate_ticket_update(data: dict) -> list:
    errors = []

    provided = {k: data[k] for k in EDITABLE_FIELDS if k in data}
    if not provided:
        errors.append(
            f"At least one editable field required: {', '.join(EDITABLE_FIELDS)}"
        )
        return errors

    if "subject" in provided:
        subject = str(provided["subject"]).strip()
        if len(subject) < 5:
            errors.append("Subject must be at least 5 characters")
        if len(subject) > 100:
            errors.append("Subject must not exceed 100 characters")

    if "description" in provided:
        description = str(provided["description"]).strip()
        if len(description) < 10:
            errors.append("Description must be at least 10 characters")
        if len(description) > 1000:
            errors.append("Description must not exceed 1000 characters")

    if "category" in provided and provided["category"] not in VALID_CATEGORIES:
        errors.append(
            f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}"
        )

    if "priority" in provided and provided["priority"] not in VALID_PRIORITIES:
        errors.append(
            f"Invalid priority. Choose from: {', '.join(VALID_PRIORITIES)}"
        )

    return errors


# FR-10-02: Validate ticket assignment request
def validate_assignment(data: dict) -> list:
    import re

    errors = []

    if "assigned_to" not in data or not str(data["assigned_to"]).strip():
        errors.append("assigned_to (staff email) is required")
        return errors

    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data["assigned_to"].strip()):
        errors.append("Invalid email format for assigned_to")

    return errors
