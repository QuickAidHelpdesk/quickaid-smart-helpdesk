"""
QuickAid — Azure Functions API
Replaces the Django REST Framework backend.

All endpoints are prefixed with /api/ (configured in host.json).
"""

import json
import logging

import azure.functions as func

from shared.email_service import (
    send_assignment_notification_email,
    send_status_update_email,
    send_ticket_confirmation_email,
)
from shared.ticket_service import (
    add_admin_note,
    assign_ticket,
    create_ticket,
    get_all_tickets,
    get_ticket_by_id,
    get_tickets_by_email,
    search_tickets,
    update_ticket_status,
)
from shared.user_service import get_user_by_id
from shared.validators import (
    validate_admin_note,
    validate_status_update,
    validate_ticket_assign,
    validate_ticket_create,
)

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)
logger = logging.getLogger(__name__)


# ── Helper ──────────────────────────────────────────────────────────

def _json_response(body: dict | list, status_code: int = 200) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(body, default=str),
        status_code=status_code,
        mimetype="application/json",
    )


def _error_response(message, status_code: int = 400) -> func.HttpResponse:
    if isinstance(message, list):
        return _json_response({"errors": message}, status_code)
    return _json_response({"error": message}, status_code)


# ═══════════════════════════════════════════════════════════════════
# POST /api/tickets — Create Ticket (no auth)
# GET  /api/tickets?email= — Get Tickets by Email (no auth)
# GET  /api/tickets?search= — Search Tickets (no auth)
# ═══════════════════════════════════════════════════════════════════

@app.route(route="tickets", methods=["POST"])
def create_ticket_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    """POST /api/tickets — Create a new helpdesk ticket."""
    try:
        body = req.get_json()
    except ValueError:
        return _error_response("Invalid JSON body.")

    try:
        validated = validate_ticket_create(body)
    except ValueError as e:
        return _error_response(e.args[0])

    try:
        ticket = create_ticket(validated)

        # Trigger confirmation email (non-blocking)
        try:
            send_ticket_confirmation_email(ticket)
        except Exception as email_err:
            logger.error("Email send failed: %s", email_err)

        return _json_response(ticket, 201)

    except Exception as e:
        logger.error("Failed to create ticket: %s", str(e))
        return _error_response("Failed to create ticket.", 500)


@app.route(route="tickets", methods=["GET"])
def get_tickets_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/tickets?email= or GET /api/tickets?search="""
    try:
        # Search mode
        search = req.params.get("search")
        if search:
            tickets = search_tickets(search)
            if not tickets:
                return _json_response(
                    {"message": "No tickets matched your search. Try different keywords.", "tickets": []}
                )
            return _json_response({"tickets": tickets})

        # Email filter mode
        email = req.params.get("email")
        if not email:
            return _error_response("email or search query parameter is required.")

        tickets = get_tickets_by_email(email)
        if not tickets:
            return _json_response(
                {"message": "No tickets found for this email address.", "tickets": []}
            )
        return _json_response({"tickets": tickets})

    except Exception as e:
        logger.error("Failed to retrieve tickets: %s", str(e))
        return _error_response("Failed to retrieve tickets.", 500)


# ═══════════════════════════════════════════════════════════════════
# GET /api/tickets/{ticketId} — Get Ticket by ID
# ═══════════════════════════════════════════════════════════════════

@app.route(route="tickets/{ticketId}", methods=["GET"])
def get_ticket_by_id_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/tickets/{ticketId} — Get full ticket details."""
    ticket_id = req.route_params.get("ticketId")

    try:
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            return _error_response("Ticket not found.", 404)
        return _json_response(ticket)

    except Exception as e:
        logger.error("Failed to retrieve ticket: %s", str(e))
        return _error_response("Failed to retrieve ticket.", 500)


# ═══════════════════════════════════════════════════════════════════
# PUT /api/tickets/{ticketId}/status — Update Ticket Status (auth)
# ═══════════════════════════════════════════════════════════════════

@app.route(route="tickets/{ticketId}/status", methods=["PUT"])
def update_ticket_status_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    """PUT /api/tickets/{ticketId}/status — Update ticket status."""
    ticket_id = req.route_params.get("ticketId")

    try:
        body = req.get_json()
    except ValueError:
        return _error_response("Invalid JSON body.")

    try:
        validated = validate_status_update(body)
    except ValueError as e:
        return _error_response(e.args[0])

    # Get user ID from header (set by Azure AD auth middleware)
    changed_by = req.headers.get("X-User-Id", "system")

    try:
        previous_status = None
        ticket_before = get_ticket_by_id(ticket_id)
        if ticket_before:
            previous_status = ticket_before["status"]

        ticket = update_ticket_status(ticket_id, validated, changed_by)

        # Trigger status update email
        try:
            send_status_update_email(ticket, previous_status, validated["status"])
        except Exception as email_err:
            logger.error("Email send failed: %s", email_err)

        return _json_response(ticket)

    except ValueError as e:
        return _error_response(e.args[0], 404)
    except Exception as e:
        logger.error("Failed to update ticket status: %s", str(e))
        return _error_response("Failed to update ticket status.", 500)


# ═══════════════════════════════════════════════════════════════════
# PUT /api/tickets/{ticketId}/assign — Assign Ticket (admin only)
# ═══════════════════════════════════════════════════════════════════

@app.route(route="tickets/{ticketId}/assign", methods=["PUT"])
def assign_ticket_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    """PUT /api/tickets/{ticketId}/assign — Assign ticket to staff."""
    ticket_id = req.route_params.get("ticketId")

    try:
        body = req.get_json()
    except ValueError:
        return _error_response("Invalid JSON body.")

    try:
        validated = validate_ticket_assign(body)
    except ValueError as e:
        return _error_response(e.args[0])

    assigned_by = req.headers.get("X-User-Id", "system")

    try:
        ticket = assign_ticket(ticket_id, validated, assigned_by)

        # Trigger assignment notification email
        try:
            assigned_user = get_user_by_id(validated["assigned_to"])
            if assigned_user:
                send_assignment_notification_email(ticket, assigned_user)
        except Exception as email_err:
            logger.error("Email send failed: %s", email_err)

        return _json_response(ticket)

    except ValueError as e:
        return _error_response(e.args[0], 404)
    except Exception as e:
        logger.error("Failed to assign ticket: %s", str(e))
        return _error_response("Failed to assign ticket.", 500)


# ═══════════════════════════════════════════════════════════════════
# GET /api/admin/tickets — Get All Tickets with Filters (admin)
# ═══════════════════════════════════════════════════════════════════

@app.route(route="management/tickets", methods=["GET"])
def get_all_tickets_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/management/tickets — All tickets with optional filters."""
    try:
        filters = {
            "status": req.params.get("status"),
            "category": req.params.get("category"),
            "priority": req.params.get("priority"),
            "assigned_to": req.params.get("assigned_to"),
            "date_from": req.params.get("date_from"),
            "date_to": req.params.get("date_to"),
        }
        # Remove None values
        filters = {k: v for k, v in filters.items() if v}

        tickets = get_all_tickets(filters)
        return _json_response({"tickets": tickets})

    except Exception as e:
        logger.error("Failed to retrieve all tickets: %s", str(e))
        return _error_response("Failed to retrieve tickets.", 500)


# ═══════════════════════════════════════════════════════════════════
# POST /api/tickets/{ticketId}/notes — Add Admin Note
# ═══════════════════════════════════════════════════════════════════

@app.route(route="tickets/{ticketId}/notes", methods=["POST"])
def add_admin_note_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    """POST /api/tickets/{ticketId}/notes — Add internal note."""
    ticket_id = req.route_params.get("ticketId")

    try:
        body = req.get_json()
    except ValueError:
        return _error_response("Invalid JSON body.")

    try:
        validated = validate_admin_note(body)
    except ValueError as e:
        return _error_response(e.args[0])

    author_id = req.headers.get("X-User-Id", "system")

    try:
        note = add_admin_note(ticket_id, validated, author_id)
        return _json_response(note, 201)

    except ValueError as e:
        return _error_response(e.args[0], 404)
    except Exception as e:
        logger.error("Failed to add admin note: %s", str(e))
        return _error_response("Failed to add note.", 500)
