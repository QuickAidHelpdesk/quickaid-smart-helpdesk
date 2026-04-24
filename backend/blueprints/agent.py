"""
Agent Blueprint — endpoints for support agent portal (UC-7, UC-8)
API:
  GET   /api/agent/tickets                    - View assigned tickets
  PATCH /api/agent/tickets/{ticketId}/status  - Update ticket status
"""

import logging
import azure.functions as func

from shared.ticket.email_service import send_status_update_email
from shared.ticket.ticket_service import (
    get_ticket_by_id,
    get_tickets_by_assignee,
    update_ticket_status,
)
from shared.ticket.validator import validate_status_update
from utils.auth import require_role
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)
from utils.telemetry import track_event

bp = func.Blueprint()
logger = logging.getLogger(__name__)


# ── GET /api/agent/tickets ─────────────────────────────────────────
# FR-07-01: View tickets assigned to the logged-in agent member
@bp.route(route="agent/tickets", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_agent_tickets(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    # Role check: agent or admin
    user, err = require_role(req, ["agent", "admin"])
    if err:
        return err

    # FR-07-03: Filter by priority and status
    filters = {
        "status": req.params.get("status"),
        "priority": req.params.get("priority"),
    }
    filters = {k: v for k, v in filters.items() if v}

    try:
        tickets = get_tickets_by_assignee(user["email"], filters)

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


# ── PATCH /api/agent/tickets/{ticketId}/status ─────────────────────
# FR-08-01: Update ticket status (agent updates their assigned tickets)
@bp.route(route="agent/tickets/{ticketId}/status", methods=["PATCH", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def update_ticket_status_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    # Role check: agent or admin
    user, err = require_role(req, ["agent", "admin"])
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

    # Agent can only update tickets assigned to them; admin can update any
    if user["role"] == "agent" and ticket.get("assigned_to") != user["email"]:
        return error_response("You can only update tickets assigned to you.", 403)

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

    # FR-08-02: Return refreshed list of assigned tickets
    try:
        tickets = get_tickets_by_assignee(user["email"])
    except Exception as e:
        logger.error("Failed to retrieve refreshed ticket list: %s", e)
        tickets = []

    return json_response({
        "success": True,
        "message": f"Status updated to '{updated_ticket['status']}'.",
        "ticket": updated_ticket,
        "tickets": tickets,
    })
