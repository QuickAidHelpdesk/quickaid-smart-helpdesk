"""
All database operations for teams and team-user mappings.
"""

import uuid
from datetime import datetime, timezone
from utils.cosmos_client import get_container, TEAMS_CONTAINER, USERS_TEAMS_CONTAINER, USERS_CONTAINER


# %% Team Operations %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

def create_team(data: dict) -> dict:
    container = get_container(TEAMS_CONTAINER)
    team_id = str(uuid.uuid4())
    
    team = {
        "id": team_id,
        "team_id": team_id,
        "name": data["name"].strip(),
        "category": data.get("category", "General").strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    container.create_item(body=team)
    return team

def get_all_teams() -> list:
    container = get_container(TEAMS_CONTAINER)
    query = "SELECT * FROM c ORDER BY c.name ASC"
    teams = list(container.query_items(
        query=query,
        enable_cross_partition_query=True
    ))
    
    ut_container = get_container(USERS_TEAMS_CONTAINER)
    for team in teams:
        q = "SELECT VALUE COUNT(1) FROM c WHERE c.team_id = @team_id"
        p = [{"name": "@team_id", "value": team["team_id"]}]
        count_res = list(ut_container.query_items(query=q, parameters=p, enable_cross_partition_query=True))
        team["member_count"] = count_res[0] if count_res else 0
        
    return teams

def get_team_by_id(team_id: str) -> dict | None:
    container = get_container(TEAMS_CONTAINER)
    query = "SELECT * FROM c WHERE c.team_id = @team_id"
    params = [{"name": "@team_id", "value": team_id}]
    
    results = list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True
    ))
    return results[0] if results else None

def update_team(team_id: str, updates: dict) -> dict | None:
    container = get_container(TEAMS_CONTAINER)
    team = get_team_by_id(team_id)
    if not team:
        return None
    
    if "name" in updates:
        team["name"] = updates["name"].strip()
    if "category" in updates:
        team["category"] = updates["category"].strip()
        
    team["updated_at"] = datetime.now(timezone.utc).isoformat()
    container.upsert_item(body=team)
    return team

def delete_team(team_id: str):
    container = get_container(TEAMS_CONTAINER)
    team = get_team_by_id(team_id)
    if team:
        container.delete_item(item=team["id"], partition_key=team["id"])
        # Also remove all user mappings for this team
        remove_all_users_from_team(team_id)


# %% Team-User Mapping Operations %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

def add_user_to_team(user_id: str, team_id: str) -> dict:
    container = get_container(USERS_TEAMS_CONTAINER)
    
    # Check if already in team
    query = "SELECT * FROM c WHERE c.user_id = @user_id AND c.team_id = @team_id"
    params = [
        {"name": "@user_id", "value": user_id},
        {"name": "@team_id", "value": team_id}
    ]
    existing = list(container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
    if existing:
        return existing[0]

    mapping_id = str(uuid.uuid4())
    mapping = {
        "id": mapping_id,
        "users_teams_id": mapping_id,
        "user_id": user_id,
        "team_id": team_id,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    
    container.create_item(body=mapping)
    return mapping

def remove_user_from_team(user_id: str, team_id: str):
    container = get_container(USERS_TEAMS_CONTAINER)
    query = "SELECT * FROM c WHERE c.user_id = @user_id AND c.team_id = @team_id"
    params = [
        {"name": "@user_id", "value": user_id},
        {"name": "@team_id", "value": team_id}
    ]
    results = list(container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
    for item in results:
        container.delete_item(item=item["id"], partition_key=item["id"])

def remove_all_users_from_team(team_id: str):
    container = get_container(USERS_TEAMS_CONTAINER)
    query = "SELECT * FROM c WHERE c.team_id = @team_id"
    params = [{"name": "@team_id", "value": team_id}]
    results = list(container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
    for item in results:
        container.delete_item(item=item["id"], partition_key=item["id"])

def get_users_in_team(team_id: str) -> list:
    ut_container = get_container(USERS_TEAMS_CONTAINER)
    u_container = get_container(USERS_CONTAINER)
    
    # Get all user_ids for the team
    query = "SELECT c.user_id FROM c WHERE c.team_id = @team_id"
    params = [{"name": "@team_id", "value": team_id}]
    mappings = list(ut_container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
    
    if not mappings:
        return []
        
    user_ids = [m["user_id"] for m in mappings]
    
    # Get user details
    # Cosmos DB doesn't support JOIN across containers easily, so we fetch details separately
    # For small teams, this is fine.
    users = []
    for uid in user_ids:
        query_u = "SELECT c.user_id, c.display_name, c.email, c.role FROM c WHERE c.user_id = @user_id"
        params_u = [{"name": "@user_id", "value": uid}]
        res = list(u_container.query_items(query=query_u, parameters=params_u, enable_cross_partition_query=True))
        if res:
            users.append(res[0])
            
    return users

def get_teams_for_user(user_id: str) -> list:
    ut_container = get_container(USERS_TEAMS_CONTAINER)
    t_container = get_container(TEAMS_CONTAINER)
    
    query = "SELECT c.team_id FROM c WHERE c.user_id = @user_id"
    params = [{"name": "@user_id", "value": user_id}]
    mappings = list(ut_container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
    
    if not mappings:
        return []
        
    team_ids = [m["team_id"] for m in mappings]
    teams = []
    for tid in team_ids:
        team = get_team_by_id(tid)
        if team:
            teams.append(team)
    return teams
