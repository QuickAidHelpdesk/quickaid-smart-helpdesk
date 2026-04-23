"""
    # FR-01-01: Validate user data for login/registration
    # FR-01-02: Validate user roles
"""

import re

VALID_ROLES = ["student", "staff", "admin", "agent"]


def validate_user(data: dict) -> list:

    # List of error(s) identified
    errors = []

    # Check required fields
    required_fields = ["display_name", "email"]
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            errors.append(f"{field} is required")

    # Return if missing fields
    if errors:
        return errors

    # Validate display_name length
    if len(data["display_name"].strip()) < 2:
        errors.append("Display name must be at least 2 characters")
    if len(data["display_name"].strip()) > 100:
        errors.append("Display name must not exceed 100 characters")

    # Validate email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data["email"]):
        errors.append("Invalid email format")

    # Validate role (optional field, defaults to "student" in service layer)
    role = data.get("role")
    if role and role not in VALID_ROLES:
        errors.append(
            f"Invalid role. Choose from: {', '.join(VALID_ROLES)}"
        )

    return errors
