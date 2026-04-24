"""
Tickets Blueprint — public endpoints for ticket submission and tracking (UC-2, UC-4, UC-6)
API:
  POST  /api/submit_ticket        - Submit a new helpdesk ticket
  GET   /api/tickets              - Display a list of tickets with filters
  GET   /api/tickets/{ticketId}   - Display a full ticket details
  GET   /api/tickets/search?q=    - Search ticket by subject or ticket ID
  PATCH /api/tickets/{ticketId}   - Edit a ticket submitted by the current user
"""

import logging
import azure.functions as func

from shared.ticket.email_service import (
    send_confirmation_email,
    send_edit_confirmation_email,
)
from shared.ticket.ticket_service import (
    create_ticket,
    get_tickets_by_user_id,
    search_tickets,
    get_ticket_by_id,
    update_ticket,
)
from shared.ticket.validator import validate_ticket, validate_ticket_update
from utils.auth import require_role
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response
)
from utils.telemetry import track_event

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
    user, err = require_role(req, ["user", "agent", "admin"])
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

    # FR-11-02: custom event for ticket submission
    track_event("TicketSubmitted", {
        "ticket_id": ticket["ticket_id"],
        "category": ticket["category"],
        "priority": ticket["priority"],
        "user_email": ticket["email"],
    })

    # Send confirmation email (FR-03-01, FR-03-03)
    try:
        logger.warning("EMAIL_DEBUG: About to send confirmation email to %s for ticket %s", ticket["email"], ticket["ticket_id"])
        send_confirmation_email(
            to_email=ticket["email"],
            ticket_id=ticket["ticket_id"],
            subject=ticket["subject"],
            category=ticket["category"],
            priority=ticket["priority"],
            description=ticket["description"],
        )
        logger.warning("EMAIL_DEBUG: Confirmation email sent successfully for ticket %s", ticket["ticket_id"])
    except Exception as e:
        # Email failure should not block the success response
        logger.error("EMAIL_DEBUG: Confirmation email FAILED for ticket %s: %s", ticket["ticket_id"], e)
        logger.exception("EMAIL_DEBUG: Full traceback:")

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
    user, err = require_role(req, ["user", "agent", "admin"])
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
    user, err = require_role(req, ["user", "agent", "admin"])
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


# ── /api/tickets/{ticketId} ─────────────────────────────────────────
# GET:   display full ticket details
# PATCH: edit a ticket submitted by the current user
@bp.route(route="tickets/{ticketId}", methods=["GET", "PATCH", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def ticket_by_id_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["user", "agent", "admin"])
    if err:
        return err

    ticket_id = req.route_params.get("ticketId")

    if req.method == "GET":
        try:
            ticket = get_ticket_by_id(ticket_id)
            if not ticket:
                return error_response("Ticket not found.", 404)
            return json_response(ticket)
        except Exception as e:
            logger.error("Failed to retrieve ticket %s: %s", ticket_id, e)
            return error_response("Failed to retrieve ticket. Please try again later.", 500)

    # PATCH — edit a ticket
    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_ticket_update(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    try:
        ticket = get_ticket_by_id(ticket_id)
    except Exception as e:
        logger.error("Failed to retrieve ticket %s: %s", ticket_id, e)
        return error_response("Failed to retrieve ticket. Please try again later.", 500)

    if not ticket:
        return error_response("Ticket not found.", 404)

    if ticket["email"].lower() != user["email"].lower():
        return error_response("You can only edit your own tickets.", 403)

    if ticket["status"] not in ("Open",):
        return error_response(
            f"Ticket cannot be edited while status is '{ticket['status']}'.", 409
        )

    try:
        ticket, changes = update_ticket(ticket, data)
    except Exception as e:
        logger.error("Failed to update ticket %s: %s", ticket_id, e)
        return error_response("Failed to update ticket.", 500)

    if not changes:
        return json_response({"success": True, "message": "No changes applied.", "ticket": ticket})

    try:
        send_edit_confirmation_email(
            to_email=ticket["email"],
            ticket_id=ticket["ticket_id"],
            subject=ticket["subject"],
            changes=changes,
        )
    except Exception as e:
        logger.error("Edit confirmation email failed for ticket %s: %s", ticket["ticket_id"], e)

    return json_response({
        "success": True,
        "message": f"Ticket {ticket['ticket_id']} updated. A confirmation email has been sent.",
        "ticket": ticket,
        "changes": changes,
    })
