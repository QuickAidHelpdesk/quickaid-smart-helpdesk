"""
All database operations for teams.
A team handles one ticket category; agents belong to a team.
"""

import uuid
from datetime import datetime, timezone

from utils.cosmos_client import get_container, TEAMS_CONTAINER, USERS_CONTAINER


# %% Create (C) %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
def create_team(data: dict) -> dict:
    container = get_container(TEAMS_CONTAINER)

    team_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    team = {
        "id": team_id,
        "team_id": team_id,
        "name": data["name"].strip(),
        "category": data["category"],
        "created_at": now,
        "updated_at": now,
    }

    container.create_item(body=team)
    return team


# %% Read (R) %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
def get_team_by_id(team_id: str) -> dict | None:
    container = get_container(TEAMS_CONTAINER)

    query = "SELECT * FROM c WHERE c.team_id = @team_id"
    params = [{"name": "@team_id", "value": team_id}]

    results = list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))

    return results[0] if results else None


def get_team_by_name(name: str) -> dict | None:
    container = get_container(TEAMS_CONTAINER)

    query = "SELECT * FROM c WHERE LOWER(c.name) = @name"
    params = [{"name": "@name", "value": name.strip().lower()}]

    results = list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))

    return results[0] if results else None


def get_team_by_category(category: str) -> dict | None:
    container = get_container(TEAMS_CONTAINER)

    query = "SELECT * FROM c WHERE c.category = @category"
    params = [{"name": "@category", "value": category}]

    results = list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))

    return results[0] if results else None


def list_teams() -> list:
    container = get_container(TEAMS_CONTAINER)

    query = "SELECT * FROM c ORDER BY c.name"

    return list(container.query_items(
        query=query,
        enable_cross_partition_query=True,
    ))


# %% Update (U) %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
def update_team(team_id: str, updates: dict) -> dict | None:
    container = get_container(TEAMS_CONTAINER)
    team = get_team_by_id(team_id)
    if not team:
        return None

    if "name" in updates:
        team["name"] = updates["name"].strip()
    if "category" in updates:
        team["category"] = updates["category"]

    team["updated_at"] = datetime.now(timezone.utc).isoformat()
    container.upsert_item(body=team)
    return team


# %% Delete (D) %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
def count_users_in_team(team_id: str) -> int:
    container = get_container(USERS_CONTAINER)

    query = "SELECT VALUE COUNT(1) FROM c WHERE c.team_id = @team_id"
    params = [{"name": "@team_id", "value": team_id}]

    result = list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))
    return result[0] if result else 0


def delete_team(team_id: str) -> bool:
    container = get_container(TEAMS_CONTAINER)
    team = get_team_by_id(team_id)
    if not team:
        return False

    container.delete_item(item=team["id"], partition_key=team["category"])
    return True
