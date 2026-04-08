"""
API:
  POST/api/submit_ticket — Submit a new helpdesk ticket
"""

import logging

import azure.functions as func

from _backend.shared.ticket.email_service import send_confirmation_email
from _backend.shared.ticket.ticket_service import create_ticket
from _backend.shared.ticket.validator import validate_ticket
from utils.http_helpers import error_response, json_response, preflight_response

bp = func.Blueprint()
logger = logging.getLogger(__name__)


# ── POST /api/submit_ticket ──────────────────────────────────────────
# Submit a new helpdesk ticket
@bp.route(route="submit_ticket", methods=["POST", "OPTIONS"])
def submit_ticket(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    # Validate fields (FR-02-02)
    errors = validate_ticket(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    # Create ticket (FR-02-04)
    try:
        ticket = create_ticket(data)
    except Exception as e:
        logger.error("Failed to create ticket: %s", e)
        return error_response("Failed to create ticket.", 500)

    # Send confirmation email (FR-02-05)
    try:
        send_confirmation_email(
            to_email=ticket["email"],
            ticket_id=ticket["ticket_id"],
            subject=ticket["subject"],
        )
    except Exception as e:
        # Email failure should not block the success response
        logger.error("Confirmation email failed: %s", e)

    # Return success (FR-02-05)
    return json_response(
        {
            "success": True,
            "ticket_id": ticket["ticket_id"],
            "message": (
                f"Ticket submitted! Your ID is {ticket['ticket_id']}. "
                f"Confirmation sent to {ticket['email']}."
            ),
            "ticket": ticket,
        },
        201,
    )