"""
Tickets Blueprint — public endpoints for ticket submission and tracking (UC-2, UC-4, UC-6)
API:
  POST /api/submit_ticket        - Submit a new helpdesk ticket
  GET  /api/tickets              - Display a list of tickets with filters
  GET  /api/tickets/{ticketId}   - Display a full ticket details
  GET  /api/tickets/search?q=    - Search ticket by subject or ticket ID
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
from utils.auth import require_role
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response
)

bp = func.Blueprint()
logger = logging.getLogger(__name__)

# ── POST/api/submit_ticket ──────────────────────────────────────────
# Submit a new helpdesk ticket
@bp.route(route="submit_ticket", methods=["POST", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def submit_ticket(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    # Auth check: any logged-in user can submit tickets
    user, err = require_role(req, ["student", "staff", "admin"])
    if err:
        return err

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

    # Send confirmation email (FR-03-01, FR-03-03)
    try:
        send_confirmation_email(
            to_email=ticket["email"],
            ticket_id=ticket["ticket_id"],
            subject=ticket["subject"],
            category=ticket["category"],
            priority=ticket["priority"],
            description=ticket["description"],
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


# ── GET/api/tickets ─────────────────────────────────────────────────
# Display a list of tickets with filters
# Filter by status and category
@bp.route(route="tickets", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_tickets_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    # Auth check: any logged-in user can view their own tickets
    user, err = require_role(req, ["student", "staff", "admin"])
    if err:
        return err

    # Use authenticated user's email to prevent querying other users' tickets
    email = user["email"]

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


# ── GET /api/tickets/search?q= ───────────────────────────────────────
# Search ticket by subject or ticket ID
@bp.route(route="tickets/search", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def search_tickets_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    # Auth check: any logged-in user can search tickets
    user, err = require_role(req, ["student", "staff", "admin"])
    if err:
        return err

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


# ── GET/api/tickets/{ticketId} ──────────────────────────────────────
# Display a ticket full details
@bp.route(route="tickets/{ticketId}", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_ticket_by_id_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    # Auth check: any logged-in user can view ticket details
    user, err = require_role(req, ["student", "staff", "admin"])
    if err:
        return err

    ticket_id = req.route_params.get("ticketId")

    try:
        ticket = get_ticket_by_id(ticket_id)

        if not ticket:
            return error_response("Ticket not found.", 404)

        return json_response(ticket)

    except Exception as e:
        logger.error("Failed to retrieve ticket %s: %s", ticket_id, e)
        return error_response("Failed to retrieve ticket. Please try again later.", 500)
