"""
User service — replaces Django users app.
Handles user CRUD operations against Cosmos DB.
"""

import uuid
from datetime import datetime, timezone

from .cosmos_client import (
    USERS_CONTAINER,
    create_item,
    query_items,
    read_item,
)


def get_or_create_user_by_email(email: str, display_name: str) -> dict:
    """Find existing user by email or create a new one with role='student'."""
    results = query_items(
        USERS_CONTAINER,
        "SELECT * FROM c WHERE c.email = @email",
        [{"name": "@email", "value": email}],
    )
    if results:
        return results[0]

    user = {
        "id": str(uuid.uuid4()),
        "user_id": str(uuid.uuid4()),
        "display_name": display_name,
        "email": email,
        "role": "student",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return create_item(USERS_CONTAINER, user)


def get_user_by_id(user_id: str) -> dict | None:
    """Return a user by their user_id, or None if not found."""
    results = query_items(
        USERS_CONTAINER,
        "SELECT * FROM c WHERE c.user_id = @user_id",
        [{"name": "@user_id", "value": user_id}],
    )
    return results[0] if results else None


def get_support_staff() -> list[dict]:
    """Return all users with role 'staff' or 'admin'."""
    return query_items(
        USERS_CONTAINER,
        "SELECT * FROM c WHERE c.role IN ('staff', 'admin')",
    )
