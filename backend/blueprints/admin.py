"""
Admin Blueprint — endpoints for admin portal (UC-10)
API:
  GET   /api/manage/tickets                    - View all tickets with filters
  PATCH /api/manage/tickets/{ticketId}/assign  - Assign ticket to agent
  GET   /api/manage/agent                      - List all agent members
  GET   /api/manage/users                      - List all users (for user management)
  PATCH /api/manage/users/{userId}             - Update user role and name

Note: Uses 'manage' prefix instead of 'admin' because Azure Functions
reserves the 'admin' route segment for its built-in admin API.
"""

import logging
import azure.functions as func

from shared.ticket.ticket_service import (
    get_ticket_by_id,
    get_all_tickets,
)
from shared.user.user_service import get_user_by_email, get_users_by_role
from utils.auth import require_role
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)
from utils.telemetry import track_event

bp = func.Blueprint()
logger = logging.getLogger(__name__)


# ── GET /api/manage/tickets ────────────────────────────────────────
# FR-10-01: View all tickets (admin only)
@bp.route(route="manage/tickets", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_admin_tickets(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    # Role check: admin only
    user, err = require_role(req, ["admin"])
    if err:
        return err

    # FR-10-04: Filter by status, category, priority, date range
    filters = {
        "status": req.params.get("status"),
        "category": req.params.get("category"),
        "priority": req.params.get("priority"),
        "date_from": req.params.get("date_from"),
        "date_to": req.params.get("date_to"),
    }
    filters = {k: v for k, v in filters.items() if v}

    try:
        tickets = get_all_tickets(filters)
        return json_response({"tickets": tickets})

    except Exception as e:
        logger.error("Failed to retrieve all tickets: %s", e)
        return error_response("Failed to retrieve tickets.", 500)




# ── GET /api/manage/agent ─────────────────────────────────────────
# List all agent members (admin only, for ticket assignment UI)
@bp.route(route="manage/agent", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_agent_list(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    # Role check: admin only
    user, err = require_role(req, ["admin"])
    if err:
        return err

    try:
        agent = get_users_by_role("agent")
        return json_response({"agent": agent})

    except Exception as e:
        logger.error("Failed to retrieve agent list: %s", e)
        return error_response("Failed to retrieve agent list.", 500)

from shared.user.user_service import get_all_users

# ── GET /api/manage/users ─────────────────────────────────────────
# List all users (admin only, for user management UI)
@bp.route(route="manage/users", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_all_users_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return preflight_response()

    # Role check: admin only
    user, err = require_role(req, ["admin"])
    if err:
        return err

    filters = {
        "role": req.params.get("role"),
        "q": req.params.get("q")
    }

    try:
        users = get_all_users(filters)
        return json_response({"users": users})
    except Exception as e:
        logger.error("Failed to retrieve all users: %s", e)
        return error_response("Failed to retrieve users.", 500)


# ── PATCH /api/manage/users/{userId} ───────────────────
# Update a user's role or display name (admin only)
@bp.route(route="manage/users/{userId}", methods=["PATCH", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def update_user_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return preflight_response()
    
    user, err = require_role(req, ["admin"])
    if err:
        return err
        
    user_id = req.route_params.get("userId")
    
    try:
        updates = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.", 400)
        
    from shared.user.user_service import update_user, _strip_password_hash
    try:
        updated_user = update_user(user_id, updates)
        if not updated_user:
            return error_response("User not found.", 404)
        return json_response({"success": True, "user": _strip_password_hash(updated_user)})
    except Exception as e:
        return error_response(str(e), 500)
