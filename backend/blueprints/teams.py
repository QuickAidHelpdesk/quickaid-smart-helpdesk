"""
Teams Blueprint — admin endpoints for team management
API:
  GET    /api/manage/teams           - List all teams
  POST   /api/manage/teams           - Create a team
  PATCH  /api/manage/teams/{teamId}  - Update name/category
  DELETE /api/manage/teams/{teamId}  - Delete (rejected if any agent references it)
  GET    /api/manage/agents          - List users with role=agent (for assignment UIs)
"""

import logging
import azure.functions as func

from shared.team.team_service import (
    create_team,
    delete_team,
    get_team_by_id,
    get_team_by_name,
    list_teams,
    update_team,
    count_users_in_team,
)
from shared.team.validator import validate_team, validate_team_update
from shared.user.user_service import get_users_by_role
from utils.auth import require_role
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)

bp = func.Blueprint()
logger = logging.getLogger(__name__)


# ── GET /api/manage/teams ─────────────────────────────────────────
@bp.route(route="manage/teams", methods=["GET", "POST", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def teams_collection(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["admin"])
    if err:
        return err

    if req.method == "GET":
        try:
            teams = list_teams()
            return json_response({"teams": teams})
        except Exception as e:
            logger.error("Failed to list teams: %s", e)
            return error_response("Failed to list teams.", 500)

    # POST
    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_team(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    # Enforce unique team name
    try:
        existing = get_team_by_name(data["name"])
    except Exception as e:
        logger.error("Failed to check team name uniqueness: %s", e)
        return error_response("Failed to verify team name.", 500)

    if existing:
        return error_response(f"A team named '{data['name'].strip()}' already exists.", 400)

    try:
        team = create_team(data)
        return json_response({"success": True, "team": team}, 201)
    except Exception as e:
        logger.error("Failed to create team: %s", e)
        return error_response("Failed to create team.", 500)


# ── PATCH/DELETE /api/manage/teams/{teamId} ───────────────────────
@bp.route(route="manage/teams/{teamId}", methods=["PATCH", "DELETE", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def team_by_id(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["admin"])
    if err:
        return err

    team_id = req.route_params.get("teamId")

    if req.method == "PATCH":
        try:
            data = req.get_json()
        except ValueError:
            return error_response("Invalid JSON format.")

        errors = validate_team_update(data)
        if errors:
            return json_response({"error": "Validation failed", "details": errors}, 400)

        # If renaming, ensure the new name doesn't collide with another team
        if "name" in data:
            try:
                existing = get_team_by_name(data["name"])
            except Exception as e:
                logger.error("Failed to check team name uniqueness: %s", e)
                return error_response("Failed to verify team name.", 500)
            if existing and existing.get("team_id") != team_id:
                return error_response(
                    f"A team named '{data['name'].strip()}' already exists.", 400
                )

        try:
            updated = update_team(team_id, data)
        except Exception as e:
            logger.error("Failed to update team %s: %s", team_id, e)
            return error_response("Failed to update team.", 500)

        if not updated:
            return error_response("Team not found.", 404)

        return json_response({"success": True, "team": updated})

    # DELETE
    try:
        team = get_team_by_id(team_id)
    except Exception as e:
        logger.error("Failed to look up team %s: %s", team_id, e)
        return error_response("Failed to verify team.", 500)

    if not team:
        return error_response("Team not found.", 404)

    try:
        agent_count = count_users_in_team(team_id)
    except Exception as e:
        logger.error("Failed to count agents in team %s: %s", team_id, e)
        return error_response("Failed to verify team membership.", 500)

    if agent_count > 0:
        return error_response(
            f"Cannot delete team: {agent_count} agent(s) still belong to it. "
            f"Reassign them first.",
            409,
        )

    try:
        delete_team(team_id)
        return json_response({"success": True, "message": f"Team '{team['name']}' deleted."})
    except Exception as e:
        logger.error("Failed to delete team %s: %s", team_id, e)
        return error_response("Failed to delete team.", 500)


# ── GET /api/manage/agents ────────────────────────────────────────
# List all users with role=agent (for ticket-assignment UIs).
@bp.route(route="manage/agents", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_agents_list(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["admin"])
    if err:
        return err

    try:
        agents = get_users_by_role("agent")
        return json_response({"agents": agents})
    except Exception as e:
        logger.error("Failed to retrieve agents list: %s", e)
        return error_response("Failed to retrieve agents list.", 500)
