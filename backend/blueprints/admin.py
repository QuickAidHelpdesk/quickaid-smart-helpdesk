"""
Admin Blueprint — endpoints for admin portal (UC-10)
API:
  GET   /api/admin/tickets                    - View all tickets with filters
  PATCH /api/admin/tickets/{ticketId}/assign  - Assign ticket to staff
  GET   /api/admin/staff                      - List all staff members
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


# ── GET /api/admin/tickets ─────────────────────────────────────────
# FR-10-01: View all tickets (admin only)
@bp.route(route="admin/tickets", methods=["GET", "OPTIONS"])
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


# ── PATCH /api/admin/tickets/{ticketId}/assign ───��─────────────────
# FR-10-02: Assign ticket to a support staff member (admin only)
@bp.route(route="admin/tickets/{ticketId}/assign", methods=["PATCH", "OPTIONS"])
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


# ── GET /api/admin/staff ────��─────────────────────────────────────
# List all staff members (admin only, for ticket assignment UI)
@bp.route(route="admin/staff", methods=["GET", "OPTIONS"])
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
