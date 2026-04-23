import logging
import azure.functions as func
from shared.team import (
    create_team,
    get_all_teams,
    get_team_by_id,
    update_team,
    delete_team,
    add_user_to_team,
    remove_user_from_team,
    get_users_in_team,
)
from shared.team.validator import validate_team
from utils.auth import require_role
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)

bp = func.Blueprint()
logger = logging.getLogger(__name__)

# %% Teams Management %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

@bp.route(route="manage/teams", methods=["GET", "POST", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def manage_teams_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return preflight_response()
    
    user, err = require_role(req, ["admin"])
    if err:
        return err
        
    if req.method == "GET":
        try:
            teams = get_all_teams()
            return json_response({"teams": teams})
        except Exception as e:
            logger.error(f"Failed to retrieve teams: {e}")
            return error_response("Failed to retrieve teams.", 500)

    elif req.method == "POST":
        try:
            data = req.get_json()
        except ValueError:
            return error_response("Invalid JSON format.")
            
        errors = validate_team(data)
        if errors:
            return json_response({"error": "Validation failed", "details": errors}, 400)
            
        try:
            team = create_team(data)
            return json_response({"success": True, "team": team}, 201)
        except Exception as e:
            logger.error(f"Failed to create team: {e}")
            return error_response("Failed to create team.", 500)

@bp.route(route="manage/teams/{teamId}", methods=["PATCH", "DELETE", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def manage_team_endpoint(req: func.HttpRequest) -> func.HttpResponse:
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
            
        try:
            updated = update_team(team_id, data)
            if not updated:
                return error_response("Team not found.", 404)
            return json_response({"success": True, "team": updated})
        except Exception as e:
            logger.error(f"Failed to update team {team_id}: {e}")
            return error_response("Failed to update team.", 500)

    elif req.method == "DELETE":
        try:
            delete_team(team_id)
            return json_response({"success": True, "message": "Team deleted."})
        except Exception as e:
            logger.error(f"Failed to delete team {team_id}: {e}")
            return error_response("Failed to delete team.", 500)


# %% Team-User Mapping %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

@bp.route(route="manage/teams/{teamId}/users", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_team_users_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return preflight_response()
    
    user, err = require_role(req, ["admin"])
    if err:
        return err
        
    team_id = req.route_params.get("teamId")
    try:
        users = get_users_in_team(team_id)
        return json_response({"users": users})
    except Exception as e:
        logger.error(f"Failed to retrieve team users for {team_id}: {e}")
        return error_response("Failed to retrieve team users.", 500)

@bp.route(route="manage/teams/{teamId}/users/{userId}", methods=["POST", "DELETE", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def manage_team_user_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return preflight_response()
    
    user, err = require_role(req, ["admin"])
    if err:
        return err
        
    team_id = req.route_params.get("teamId")
    user_id = req.route_params.get("userId")
    
    if req.method == "POST":
        try:
            mapping = add_user_to_team(user_id, team_id)
            return json_response({"success": True, "mapping": mapping}, 201)
        except Exception as e:
            logger.error(f"Failed to add user {user_id} to team {team_id}: {e}")
            return error_response("Failed to add user to team.", 500)

    elif req.method == "DELETE":
        try:
            remove_user_from_team(user_id, team_id)
            return json_response({"success": True, "message": "User removed from team."})
        except Exception as e:
            logger.error(f"Failed to remove user {user_id} from team {team_id}: {e}")
            return error_response("Failed to remove user from team.", 500)
