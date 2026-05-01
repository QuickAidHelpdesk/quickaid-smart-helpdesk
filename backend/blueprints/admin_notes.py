"""
Admin Notes Blueprint — internal admin-only notes on tickets.

Distinct from the public `ticket_comments` thread: notes are visible only to
users with role `admin` and are intended for internal triage / handover
context that should never reach the user or assigned agent.

API:
  GET    /api/manage/tickets/{ticketId}/notes              - List admin notes for a ticket
  POST   /api/manage/tickets/{ticketId}/notes              - Add an admin note
  DELETE /api/manage/tickets/{ticketId}/notes/{noteId}     - Delete an admin note (author or admin)
"""

import logging
import azure.functions as func

from shared.ticket.ticket_service import get_ticket_by_id
from shared.ticket.admin_note_service import (
    create_admin_note,
    get_admin_notes_for_ticket,
    get_admin_note_by_id,
    delete_admin_note,
)
from shared.ticket.admin_note_validator import validate_admin_note
from utils.auth import require_role
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)

bp = func.Blueprint()
logger = logging.getLogger(__name__)


# ── /api/manage/tickets/{ticketId}/notes ─────────────────────────────
# GET:  list admin notes on a ticket
# POST: add an admin note
@bp.route(
    route="manage/tickets/{ticketId}/notes",
    methods=["GET", "POST", "OPTIONS"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
def admin_notes_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["admin"])
    if err:
        return err

    ticket_id = req.route_params.get("ticketId")

    try:
        ticket = get_ticket_by_id(ticket_id)
    except Exception as e:
        logger.error("Failed to retrieve ticket %s: %s", ticket_id, e)
        return error_response("Failed to retrieve ticket.", 500)

    if not ticket:
        return error_response("Ticket not found.", 404)

    if req.method == "GET":
        try:
            notes = get_admin_notes_for_ticket(ticket_id)
            return json_response({"notes": notes})
        except Exception as e:
            logger.error("Failed to load admin notes for ticket %s: %s", ticket_id, e)
            return error_response("Failed to load admin notes.", 500)

    # POST
    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_admin_note(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    try:
        note = create_admin_note(
            ticket_id=ticket_id,
            content=data["content"],
            author=user,
        )
    except Exception as e:
        logger.error("Failed to create admin note on ticket %s: %s", ticket_id, e)
        return error_response("Failed to create admin note.", 500)

    return json_response({"success": True, "note": note}, 201)


# ── DELETE /api/manage/tickets/{ticketId}/notes/{noteId} ─────────────
@bp.route(
    route="manage/tickets/{ticketId}/notes/{noteId}",
    methods=["DELETE", "OPTIONS"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
def admin_note_delete_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["admin"])
    if err:
        return err

    ticket_id = req.route_params.get("ticketId")
    note_id = req.route_params.get("noteId")

    note = get_admin_note_by_id(note_id, ticket_id)
    if not note:
        return error_response("Admin note not found.", 404)

    try:
        delete_admin_note(note_id, ticket_id)
    except Exception as e:
        logger.error("Failed to delete admin note %s: %s", note_id, e)
        return error_response("Failed to delete admin note.", 500)

    return json_response({"success": True, "message": "Note deleted."})
