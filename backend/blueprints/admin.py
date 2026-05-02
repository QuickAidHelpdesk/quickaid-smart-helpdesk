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
    assign_ticket,
)
from shared.ticket.validator import validate_assignment
from shared.ticket.email_service import send_assignment_email
from shared.user.user_service import get_user_by_email, get_users_by_role
from shared.team.team_service import get_teams_for_user, get_agents_for_category
from utils.auth import require_role
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)
from utils.telemetry import track_event
from shared.notification.notification_service import create_notification

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
        category = req.params.get("category")
        if category:
            agent = get_agents_for_category(category)
        else:
            agent = get_users_by_role("agent")
        return json_response({"agent": agent})

    except Exception as e:
        logger.error("Failed to retrieve agent list: %s", e)
        return error_response("Failed to retrieve agent list.", 500)

from shared.user.user_service import get_all_users


# ── PATCH /api/manage/tickets/{ticketId}/assign ───────────────────
# FR-10-02 / FR-10-03: Assign ticket to a support agent (admin only)
@bp.route(route="manage/tickets/{ticketId}/assign", methods=["PATCH", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def assign_ticket_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["admin"])
    if err:
        return err

    ticket_id = req.route_params.get("ticketId")

    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.", 400)

    errors = validate_assignment(data)
    if errors:
        return error_response(errors[0], 400)

    ticket = get_ticket_by_id(ticket_id)
    if not ticket:
        return error_response("Ticket not found.", 404)

    if ticket.get("is_deleted"):
        return error_response("Cannot assign a deleted ticket.", 409)

    agent_email = data["assigned_to"].strip()
    agent_user = get_user_by_email(agent_email)
    if not agent_user:
        return error_response("Agent not found.", 404)

    if agent_user.get("role") not in ("agent", "admin"):
        return error_response("assigned_to must be an agent or admin user.", 400)

    # Validate category match for agents (admins can handle any ticket)
    if agent_user.get("role") == "agent":
        teams = get_teams_for_user(agent_user["user_id"])
        team_categories = {t.get("category") for t in teams if t.get("category")}
        if ticket.get("category") not in team_categories:
            return error_response(
                f"Agent is not in a team that handles {ticket.get('category')} tickets.", 400
            )

    try:
        updated_ticket = assign_ticket(ticket, agent_user)
    except Exception as e:
        logger.error("Failed to assign ticket %s: %s", ticket_id, e)
        return error_response("Failed to assign ticket.", 500)

    try:
        create_notification(
            updated_ticket["email"], "ticket_assigned", "Ticket Assigned",
            f"Your ticket {ticket_id} has been assigned to {agent_user['display_name']}.",
            ticket_id,
        )
    except Exception as e:
        logger.error("Notification failed (ticket_assigned user) for %s: %s", ticket_id, e)
    try:
        create_notification(
            agent_user["email"], "ticket_assigned_to_me", "New Ticket Assigned to You",
            f"Ticket {ticket_id} ({updated_ticket.get('category')}) has been assigned to you: {updated_ticket['subject']}",
            ticket_id,
        )
    except Exception as e:
        logger.error("Notification failed (ticket_assigned_to_me) for %s: %s", ticket_id, e)

    # Best-effort email notification (FR-09-01)
    try:
        send_assignment_email(agent_user["email"], updated_ticket["ticket_id"], updated_ticket["subject"])
    except Exception as e:
        logger.warning("Assignment email failed for ticket %s: %s", ticket_id, e)

    track_event("TicketAssigned", {
        "ticket_id": updated_ticket["ticket_id"],
        "assigned_to": agent_user["email"],
        "assigned_by": user["email"],
        "category": updated_ticket.get("category"),
    })

    return json_response({"success": True, "ticket": updated_ticket})


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
