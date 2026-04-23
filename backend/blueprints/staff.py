"""
Staff Blueprint — endpoints for support staff portal (UC-7, UC-8)
API:
  GET   /api/staff/tickets                    - View assigned tickets
  PATCH /api/staff/tickets/{ticketId}/status  - Update ticket status

Note: "staff" here refers to ticket-handlers (legacy `staff` role + new `agent`
role + `admin`). Agents additionally see all tickets in their team's category,
not just those directly assigned to them.
"""

import logging
import azure.functions as func

from shared.ticket.email_service import send_status_update_email
from shared.ticket.ticket_service import (
    get_ticket_by_id,
    get_tickets_for_handler,
    update_ticket_status,
)
from shared.ticket.validator import validate_status_update
from shared.team.team_service import get_team_by_id
from utils.auth import require_role
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)
from utils.telemetry import track_event

bp = func.Blueprint()
logger = logging.getLogger(__name__)


def _resolve_team_category(user: dict) -> str | None:
    """For agents with a team_id, resolve the team's category. Else None."""
    if user.get("role") != "agent":
        return None
    team_id = user.get("team_id")
    if not team_id:
        return None
    team = get_team_by_id(team_id)
    return team["category"] if team else None


# ── GET /api/staff/tickets ─────────────────────────────────────────
# FR-07-01: View tickets visible to the logged-in handler
@bp.route(route="staff/tickets", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_staff_tickets(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    # Role check: ticket-handlers
    user, err = require_role(req, ["staff", "admin", "agent"])
    if err:
        return err

    # FR-07-03: Filter by priority and status
    filters = {
        "status": req.params.get("status"),
        "priority": req.params.get("priority"),
    }
    filters = {k: v for k, v in filters.items() if v}

    team_category = _resolve_team_category(user)

    try:
        tickets = get_tickets_for_handler(user["email"], team_category, filters)

        # FR-07-04
        if not tickets:
            return json_response({
                "message": "You have no tickets currently assigned to you.",
                "tickets": []
            })

        return json_response({"tickets": tickets})

    except Exception as e:
        logger.error("Failed to retrieve assigned tickets for %s: %s", user["email"], e)
        return error_response("Failed to retrieve assigned tickets.", 500)


# ── PATCH /api/staff/tickets/{ticketId}/status ─────────────────────
# FR-08-01: Update ticket status (handlers update tickets in their queue)
@bp.route(route="staff/tickets/{ticketId}/status", methods=["PATCH", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def update_ticket_status_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    # Role check: ticket-handlers
    user, err = require_role(req, ["staff", "admin", "agent"])
    if err:
        return err

    ticket_id = req.route_params.get("ticketId")

    # Get the ticket
    try:
        ticket = get_ticket_by_id(ticket_id)
    except Exception as e:
        logger.error("Failed to retrieve ticket %s: %s", ticket_id, e)
        return error_response("Failed to retrieve ticket.", 500)

    if not ticket:
        return error_response("Ticket not found.", 404)

    # Authorization:
    #   - admin: any ticket
    #   - staff (legacy): only directly-assigned tickets
    #   - agent: directly-assigned OR same-category as their team
    role = user.get("role")
    if role == "staff" and ticket.get("assigned_to") != user["email"]:
        return error_response("You can only update tickets assigned to you.", 403)
    if role == "agent":
        team_category = _resolve_team_category(user)
        directly_assigned = ticket.get("assigned_to") == user["email"]
        same_team_category = team_category and ticket.get("category") == team_category
        if not (directly_assigned or same_team_category):
            return error_response(
                "You can only update tickets assigned to you or in your team's category.",
                403,
            )

    # Parse and validate request body
    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_status_update(data, ticket["status"])
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    # Update status
    previous_status = ticket["status"]
    try:
        updated_ticket = update_ticket_status(ticket, data["status"].strip(), user["email"])
    except Exception as e:
        logger.error("Failed to update ticket %s status: %s", ticket_id, e)
        return error_response("Failed to update ticket status.", 500)

    # FR-11-02: custom event for status change
    track_event("TicketStatusChanged", {
        "ticket_id": updated_ticket["ticket_id"],
        "previous_status": previous_status,
        "new_status": updated_ticket["status"],
        "changed_by": user["email"],
    })

    # FR-08-03: Send status update email (fire-and-forget)
    try:
        send_status_update_email(
            to_email=updated_ticket["email"],
            ticket_id=updated_ticket["ticket_id"],
            new_status=updated_ticket["status"],
        )
    except Exception as e:
        logger.error("Status update email failed for ticket %s: %s", ticket_id, e)

    # FR-08-02: Return refreshed list of visible tickets
    try:
        tickets = get_tickets_for_handler(user["email"], _resolve_team_category(user))
    except Exception as e:
        logger.error("Failed to retrieve refreshed ticket list: %s", e)
        tickets = []

    return json_response({
        "success": True,
        "message": f"Status updated to '{updated_ticket['status']}'.",
        "ticket": updated_ticket,
        "tickets": tickets,
    })
