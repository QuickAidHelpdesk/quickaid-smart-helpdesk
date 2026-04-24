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


def _validate_password(password: str) -> list:
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters")
    if len(password) > 128:
        errors.append("Password must not exceed 128 characters")
    if not re.search(r"[A-Za-z]", password):
        errors.append("Password must contain at least one letter")
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one number")
    return errors


def validate_password_registration(data: dict) -> list:
    errors = []

    for field in ["display_name", "email", "password"]:
        if field not in data or not str(data[field]).strip():
            errors.append(f"{field} is required")
    if errors:
        return errors

    errors.extend(validate_user({
        "display_name": data["display_name"],
        "email": data["email"],
    }))

    errors.extend(_validate_password(data["password"]))

    return errors


def validate_password_login(data: dict) -> list:
    errors = []
    for field in ["email", "password"]:
        if field not in data or not str(data[field]).strip():
            errors.append(f"{field} is required")
    if errors:
        return errors

    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data["email"]):
        errors.append("Invalid email format")

    return errors
