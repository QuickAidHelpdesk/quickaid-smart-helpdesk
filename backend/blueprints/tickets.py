"""
Tickets Blueprint to handle endpoints/API
API:
  POST/api/submit_ticket - Submit a new helpdesk ticket
  GET/api/tickets - Display a list of tickets with filters
  GET/api/tickets/{ticketId} - Display a full ticket details
  GET/api/tickets/search?q= - Search ticket by subject or ticket ID
"""

import logging
import azure.functions as func

from shared.ticket.email_service import send_confirmation_email
from shared.ticket.ticket_service import (
    create_ticket,
    get_tickets_by_user_id,
    search_tickets,
    get_ticket_by_id,
)
from shared.ticket.validator import validate_ticket
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response
)

bp = func.Blueprint()
logger = logging.getLogger(__name__)

# ── POST ─────────────────────────────────────────────────────────────────────
# ── POST/api/submit_ticket
# Submit a new helpdesk ticket
@bp.route(route="submit_ticket", methods=["POST", "OPTIONS"])
def submit_ticket_endpoint(req: func.HttpRequest) -> func.HttpResponse:

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
            to_email = ticket["email"],
            ticket = ticket,
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


# ── GET ─────────────────────────────────────────────────────────────────────
# ── GET/api/tickets 
# Display a list of tickets with filters
# Filter by status and category
@bp.route(route="tickets", methods=["GET", "OPTIONS"])
def get_tickets_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    email = req.params.get("email")
    if not email:
        return error_response("user email is required", 400)

    # Filter by status and category (FR-04-03)
    filters = {
        "status": req.params.get("status"),
        "category": req.params.get("category"),
    }
    filters = {k: v for k, v in filters.items() if v}

    try:
        tickets = get_tickets_by_user_id(email, filters)

        if not tickets:
            return json_response({
                "message": "No tickets found for this email address.",
                "tickets": []
            })
        return json_response({"tickets": tickets})

    except Exception as e:
        logger.error("Failed to retrieve tickets for %s: %s", email, e)
        return error_response("Failed to retrieve tickets. Please try again later.", 500)


# ── GET /api/tickets/search?q=
# Search ticket by subject or ticket ID
@bp.route(route="tickets/search", methods=["GET", "OPTIONS"])
def search_tickets_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    q = req.params.get("q", "").strip()
    if not q:
        return error_response("query or search parameter is required.", 400)

    try:
        tickets = search_tickets(q)

        if not tickets:
            return json_response({
                "message": "No tickets matched your search. Try different keywords",
                "tickets": []
            })

        return json_response({"tickets": tickets})

    except Exception as e:
        logger.error("Search failed for query '%s' : %s", q, e)
        return error_response("Search failed. Please try again later.", 500)


# ── GET/api/tickets/ticketId?id=
# Display a ticket full details
@bp.route(route="tickets/ticketId", methods=["GET", "OPTIONS"])
def get_ticket_by_id_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    # ticket_id = req.route_params.get("ticketId")
    id = req.params.get("id", "").strip()
    if not id:
        return error_response("query or search parameter is required.", 400)

    try:
        ticket = get_ticket_by_id(id)

        if not ticket:
            return error_response("Ticket not found (by ID).", 404)

        return json_response(ticket)

    except Exception as e:
        logger.error("Failed to retrieve ticket %s: %s", ticket_id, e)
        return error_response("Failed to retrieve ticket. Please try again later.", 500)
