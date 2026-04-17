"""
Admin Blueprint — endpoints for admin portal (UC-10)
API:
  GET   /api/manage/tickets                    - View all tickets with filters
  PATCH /api/manage/tickets/{ticketId}/assign  - Assign ticket to staff
  GET   /api/manage/staff                      - List all staff members
  GET   /api/manage/users                      - List all users (for user management)

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
# FR-10-02: Assign ticket to a support staff member (admin only)
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

    # Verify the target staff member exists and has the right role
    staff_email = data["assigned_to"].strip().lower()
    try:
        staff_user = get_user_by_email(staff_email)
    except Exception as e:
        logger.error("Failed to look up staff user %s: %s", staff_email, e)
        return error_response("Failed to verify staff member.", 500)

    if not staff_user:
        return error_response(f"Staff member '{staff_email}' not found.", 404)

    if staff_user.get("role") not in ["staff", "admin"]:
        return error_response(
            f"User '{staff_email}' is not a staff member or admin.", 400
        )

    # Assign the ticket
    try:
        updated_ticket = assign_ticket(ticket, staff_user)
    except Exception as e:
        logger.error("Failed to assign ticket %s: %s", ticket_id, e)
        return error_response("Failed to assign ticket.", 500)

    # FR-09-01: Send assignment notification email (fire-and-forget)
    try:
        send_assignment_email(
            to_email=staff_user["email"],
            ticket_id=updated_ticket["ticket_id"],
            subject=updated_ticket["subject"],
        )
    except Exception as e:
        logger.error("Assignment email failed for ticket %s: %s", ticket_id, e)

    return json_response({
        "success": True,
        "message": (
            f"Ticket {updated_ticket['ticket_id']} assigned to "
            f"{staff_user['display_name']}."
        ),
        "ticket": updated_ticket,
    })


# ── GET /api/manage/staff ─────────────────────────────────────────
# List all staff members (admin only, for ticket assignment UI)
@bp.route(route="manage/staff", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_staff_list(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    # Role check: admin only
    user, err = require_role(req, ["admin"])
    if err:
        return err

    try:
        staff = get_users_by_role("staff")
        return json_response({"staff": staff})

    except Exception as e:
        logger.error("Failed to retrieve staff list: %s", e)
        return error_response("Failed to retrieve staff list.", 500)

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
