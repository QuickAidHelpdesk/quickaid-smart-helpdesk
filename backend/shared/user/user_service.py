"""
All database operations for users.
The functions are organized according to their CRUD functionality.
"""

import uuid
from datetime import datetime, timezone

from utils.cosmos_client import get_container, USERS_CONTAINER


# %% Create (C) %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
# Create user document and save to Cosmos DB.
def create_user(data: dict) -> dict:
    container = get_container(USERS_CONTAINER)

    user_id = data.get("user_id") or str(uuid.uuid4())

    user = {
        "id": user_id,
        "user_id": user_id,
        "display_name": data["display_name"].strip(),
        "email": data["email"].strip().lower(),
        "role": data.get("role", "student"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    container.create_item(body=user)
    return user


# %% Read (R) %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
# Get user by email address.
def get_user_by_email(email: str) -> dict | None:
    container = get_container(USERS_CONTAINER)

    query = "SELECT * FROM c WHERE c.email = @email"
    params = [
        {"name": "@email", "value": email.strip().lower()}
    ]

    results = list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))

    return results[0] if results else None


# Get user by user ID.
def get_user_by_id(user_id: str) -> dict | None:
    container = get_container(USERS_CONTAINER)

    query = "SELECT * FROM c WHERE c.user_id = @user_id"
    params = [
        {"name": "@user_id", "value": user_id}
    ]

    results = list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))

    return results[0] if results else None


# %% Upsert %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
# Upsert user on login: create if new, update display_name if existing.
def upsert_user(data: dict) -> dict:
    container = get_container(USERS_CONTAINER)
    email = data["email"].strip().lower()

    existing = get_user_by_email(email)

    if existing:
        # Update display_name and updated_at
        existing["display_name"] = data["display_name"].strip()
        existing["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Update user_id if Entra OID is provided and differs
        if data.get("user_id") and data["user_id"] != existing["user_id"]:
            existing["user_id"] = data["user_id"]

        container.upsert_item(body=existing)
        return existing

    # Create new user
    return create_user(data)


# Get all users with a specific role.
def get_users_by_role(role: str) -> list:
    container = get_container(USERS_CONTAINER)

    query = """
        SELECT c.user_id, c.display_name, c.email
        FROM c
        WHERE c.role = @role
        ORDER BY c.display_name
    """
    params = [
        {"name": "@role", "value": role}
    ]

    return list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))
