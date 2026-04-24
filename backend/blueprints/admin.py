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

from shared.ticket.email_service import send_assignment_email
from shared.ticket.ticket_service import (
    get_ticket_by_id,
    get_all_tickets,
    assign_ticket,
)
from shared.ticket.validator import validate_assignment
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


# ── PATCH /api/manage/tickets/{ticketId}/assign ───────────────────
# FR-10-02: Assign ticket to a support agent member (admin only)
@bp.route(route="manage/tickets/{ticketId}/assign", methods=["PATCH", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def assign_ticket_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    # Role check: admin only
    user, err = require_role(req, ["admin"])
    if err:
        return err

    ticket_id = req.route_params.get("ticketId")

    # Parse and validate request body
    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_assignment(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    # Get the ticket
    try:
        ticket = get_ticket_by_id(ticket_id)
    except Exception as e:
        logger.error("Failed to retrieve ticket %s: %s", ticket_id, e)
        return error_response("Failed to retrieve ticket.", 500)

    if not ticket:
        return error_response("Ticket not found.", 404)

    # Verify the target agent member exists and has the right role
    agent_email = data["assigned_to"].strip().lower()
    try:
        agent_user = get_user_by_email(agent_email)
    except Exception as e:
        logger.error("Failed to look up agent user %s: %s", agent_email, e)
        return error_response("Failed to verify agent member.", 500)

    if not agent_user:
        return error_response(f"Agent member '{agent_email}' not found.", 404)

    if agent_user.get("role") not in ["agent", "admin"]:
        return error_response(
            f"User '{agent_email}' is not a agent member or admin.", 400
        )

    # Assign the ticket
    try:
        updated_ticket = assign_ticket(ticket, agent_user)
    except Exception as e:
        logger.error("Failed to assign ticket %s: %s", ticket_id, e)
        return error_response("Failed to assign ticket.", 500)

    # FR-11-02: custom event for ticket assignment
    track_event("TicketAssigned", {
        "ticket_id": updated_ticket["ticket_id"],
        "assigned_to": agent_user["email"],
        "assigned_by": user["email"],
    })

    # FR-09-01: Send assignment notification email (fire-and-forget)
    try:
        send_assignment_email(
            to_email=agent_user["email"],
            ticket_id=updated_ticket["ticket_id"],
            subject=updated_ticket["subject"],
        )
    except Exception as e:
        logger.error("Assignment email failed for ticket %s: %s", ticket_id, e)

    return json_response({
        "success": True,
        "message": (
            f"Ticket {updated_ticket['ticket_id']} assigned to "
            f"{agent_user['display_name']}."
        ),
        "ticket": updated_ticket,
    })


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
        
    from shared.user.user_service import update_user
    try:
        updated_user = update_user(user_id, updates)
        if not updated_user:
            return error_response("User not found.", 404)
        return json_response({"success": True, "user": updated_user})
    except Exception as e:
        return error_response(str(e), 500)
