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

    role = data.get("role", "student")
    user = {
        "id": user_id,
        "user_id": user_id,
        "display_name": data["display_name"].strip(),
        "email": data["email"].strip().lower(),
        "role": role,
        "team_id": data.get("team_id") if role == "agent" else None,
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
        SELECT c.user_id, c.display_name, c.email, c.team_id
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

# Get all users, with optional search and role filters
def get_all_users(filters: dict = None) -> list:
    container = get_container(USERS_CONTAINER)
    
    query = "SELECT c.id, c.user_id, c.display_name, c.email, c.role, c.team_id, c.created_at, c.updated_at FROM c WHERE 1=1"
    params = []
    
    if filters:
        if filters.get("role") and filters.get("role") != "all":
            query += " AND c.role = @role"
            params.append({"name": "@role", "value": filters["role"]})
            
        q = filters.get("q")
        if q:
            query += " AND (CONTAINS(LOWER(c.display_name), @q) OR CONTAINS(LOWER(c.email), @q))"
            params.append({"name": "@q", "value": q.lower()})
            
    query += " ORDER BY c.display_name ASC"
    
    try:
        return list(container.query_items(
            query=query,
            parameters=params,
            enable_cross_partition_query=True,
        ))
    except Exception as e:
        print(f"Error querying users: {e}")
        return []

# Update an existing user
def update_user(user_id: str, updates: dict) -> dict | None:
    container = get_container(USERS_CONTAINER)
    user = get_user_by_id(user_id)
    if not user:
        return None
    if 'role' in updates:
        user['role'] = updates['role']
    if 'display_name' in updates:
        user['display_name'] = updates['display_name'].strip()
    if 'team_id' in updates:
        user['team_id'] = updates['team_id']
    # Defensive: only agents can hold a team_id
    if user.get('role') != 'agent':
        user['team_id'] = None
    user['updated_at'] = datetime.now(timezone.utc).isoformat()
    container.upsert_item(body=user)
    return user