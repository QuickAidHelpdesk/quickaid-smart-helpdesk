"""
Tickets Blueprint — public endpoints for ticket submission and tracking (UC-2, UC-4, UC-6, UC-12, UC-13, UC-14)
API:
  POST   /api/submit_ticket                 - Submit a new helpdesk ticket
  GET    /api/tickets                       - Display a list of tickets with filters
  GET    /api/tickets/{ticketId}            - Display a full ticket details
  GET    /api/tickets/search?q=             - Search ticket by subject or ticket ID
  PATCH  /api/tickets/{ticketId}            - Edit a ticket submitted by the current user
  DELETE /api/tickets/{ticketId}            - Soft-delete a ticket (owner only)
  GET    /api/tickets/{ticketId}/comments   - List progress entries on a ticket
  POST   /api/tickets/{ticketId}/comments   - Add a progress entry
  POST   /api/tickets/{ticketId}/finish     - Resolve ticket + write resolution entry
"""

import logging
from datetime import datetime
import azure.functions as func

from shared.ticket.email_service import (
    send_confirmation_email,
    send_edit_confirmation_email,
    send_status_update_email,
)
from shared.ticket.ticket_service import (
    create_ticket,
    get_tickets_by_user_id,
    search_tickets,
    get_ticket_by_id,
    update_ticket,
    update_ticket_status,
    soft_delete_ticket,
    reopen_ticket,
)
from shared.ticket.comment_service import (
    create_comment,
    get_comments_for_ticket,
)
from shared.ticket.comment_validator import validate_comment
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
# GET:    display full ticket details
# PATCH:  edit a ticket submitted by the current user
# DELETE: soft-delete a ticket (owner only) — UC-14
@bp.route(route="tickets/{ticketId}", methods=["GET", "PATCH", "DELETE", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
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

    if req.method == "DELETE":
        # FR-14-01: owner soft-deletes their own ticket
        try:
            ticket = get_ticket_by_id(ticket_id)
        except Exception as e:
            logger.error("Failed to retrieve ticket %s: %s", ticket_id, e)
            return error_response("Failed to retrieve ticket.", 500)

        if not ticket:
            return error_response("Ticket not found.", 404)

        if ticket["email"].lower() != user["email"].lower():
            return error_response("You can only delete your own tickets.", 403)

        if ticket.get("is_deleted"):
            return error_response("Ticket is already deleted.", 409)

        try:
            soft_delete_ticket(ticket, user["email"])
        except Exception as e:
            logger.error("Failed to soft-delete ticket %s: %s", ticket_id, e)
            return error_response("Failed to delete ticket.", 500)

        return json_response({
            "success": True,
            "message": f"Ticket {ticket_id} deleted. Your support team can still see it.",
        })

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


# ── Visibility helper for ticket comments + finish ─────────────────
# Owner / matching-team agent / admin can see and post on a ticket.
def _can_access_ticket(user: dict, ticket: dict) -> bool:
    role = user.get("role")
    if role == "admin":
        return True
    if role == "agent":
        from shared.team.team_service import get_teams_for_user
        teams = get_teams_for_user(user["user_id"])
        cats = {t.get("category") for t in teams if t.get("category")}
        return ticket.get("category") in cats
    # user role
    return ticket.get("email", "").lower() == user.get("email", "").lower()


# ── /api/tickets/{ticketId}/comments ────────────────────────────────
# GET:  list progress entries on a ticket
# POST: add a new progress entry
# UC-12 / FR-12-01
@bp.route(
    route="tickets/{ticketId}/comments",
    methods=["GET", "POST", "OPTIONS"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
def ticket_comments_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["user", "agent", "admin"])
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

    if not _can_access_ticket(user, ticket):
        return error_response("You are not authorized to view this ticket.", 403)

    if req.method == "GET":
        try:
            comments = get_comments_for_ticket(ticket_id)
            return json_response({"comments": comments})
        except Exception as e:
            logger.error("Failed to load comments for ticket %s: %s", ticket_id, e)
            return error_response("Failed to load progress entries.", 500)

    # POST — add a comment
    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_comment(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    try:
        comment = create_comment(
            ticket_id=ticket_id,
            entry_type="comment",
            topic=data["topic"],
            description=data["description"],
            location=data.get("location"),
            author=user,
        )
    except Exception as e:
        logger.error("Failed to create comment on ticket %s: %s", ticket_id, e)
        return error_response("Failed to post progress entry.", 500)

    return json_response({"success": True, "comment": comment}, 201)


# ── POST /api/tickets/{ticketId}/finish ─────────────────────────────
# UC-13 / FR-13-01: agent or admin finishes the ticket — sets status to
# Resolved (which writes status_history + sends status email) and writes a
# resolution entry with optional location and time-to-resolve.
@bp.route(
    route="tickets/{ticketId}/finish",
    methods=["POST", "OPTIONS"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
def finish_ticket_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["agent", "admin"])
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

    # Agent must be in a team whose category matches this ticket
    if user["role"] == "agent":
        from shared.team.team_service import get_teams_for_user
        teams = get_teams_for_user(user["user_id"])
        cats = {t.get("category") for t in teams if t.get("category")}
        if ticket.get("category") not in cats:
            return error_response(
                "You can only finish tickets for categories assigned to your teams.",
                403,
            )

    if ticket["status"] in ("Resolved", "Closed"):
        return error_response(
            f"Ticket is already '{ticket['status']}' and cannot be finished again.",
            409,
        )

    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_comment(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    previous_status = ticket["status"]

    # Step 1: transition status to Resolved (writes status_history, sets resolved_at)
    try:
        updated_ticket = update_ticket_status(ticket, "Resolved", user["email"])
    except Exception as e:
        logger.error("Failed to resolve ticket %s: %s", ticket_id, e)
        return error_response("Failed to mark ticket resolved.", 500)

    # Step 2: compute time-to-resolve
    resolved_in_seconds = None
    try:
        created = datetime.fromisoformat(updated_ticket["created_at"])
        resolved = datetime.fromisoformat(updated_ticket["resolved_at"])
        resolved_in_seconds = int((resolved - created).total_seconds())
    except Exception as e:
        logger.error("Failed to compute resolved_in_seconds for %s: %s", ticket_id, e)

    # Step 3: write resolution comment (best-effort)
    comment = None
    try:
        comment = create_comment(
            ticket_id=ticket_id,
            entry_type="resolution",
            topic=data["topic"],
            description=data["description"],
            location=data.get("location"),
            author=user,
            resolved_in_seconds=resolved_in_seconds,
        )
    except Exception as e:
        logger.error("Failed to write resolution comment for %s: %s", ticket_id, e)

    # Telemetry
    track_event("TicketResolved", {
        "ticket_id": updated_ticket["ticket_id"],
        "previous_status": previous_status,
        "resolved_by": user["email"],
        "resolved_in_seconds": resolved_in_seconds,
    })

    # Status-update email (fire-and-forget)
    try:
        send_status_update_email(
            to_email=updated_ticket["email"],
            ticket_id=updated_ticket["ticket_id"],
            new_status=updated_ticket["status"],
        )
    except Exception as e:
        logger.error("Status update email failed for ticket %s: %s", ticket_id, e)

    return json_response({
        "success": True,
        "message": f"Ticket {ticket_id} resolved.",
        "ticket": updated_ticket,
        "comment": comment,
    })


# ── POST /api/tickets/{ticketId}/reopen ─────────────────────────────
# UC-17 / FR-17-01: owner re-opens a Resolved ticket if the issue persists.
# Resets status to Open, clears resolved_at, bumps reopen_count, writes a
# `reopen` entry to ticket_comments, sends the status-update email, and
# emits a `TicketReopened` Application Insights event.
@bp.route(
    route="tickets/{ticketId}/reopen",
    methods=["POST", "OPTIONS"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
def reopen_ticket_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["user", "agent", "admin"])
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

    # FR-17-02: only the ticket owner may re-open their own ticket.
    if ticket["email"].lower() != user["email"].lower():
        return error_response("You can only re-open your own tickets.", 403)

    if ticket.get("is_deleted"):
        return error_response("Deleted tickets cannot be re-opened.", 409)

    # FR-17-03: only Resolved tickets may be re-opened. Closed is terminal.
    if ticket["status"] != "Resolved":
        return error_response(
            f"Only Resolved tickets can be re-opened (current: '{ticket['status']}').",
            409,
        )

    try:
        data = req.get_json()
    except ValueError:
        data = {}

    errors = validate_comment(data) if data else []
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    previous_status = ticket["status"]

    try:
        updated_ticket = reopen_ticket(ticket, user["email"])
    except Exception as e:
        logger.error("Failed to re-open ticket %s: %s", ticket_id, e)
        return error_response("Failed to re-open ticket.", 500)

    # Write a `reopen` entry on the timeline (best-effort).
    comment = None
    try:
        topic = (data.get("topic") or "Ticket re-opened").strip() if data else "Ticket re-opened"
        description = (
            data.get("description").strip()
            if data and data.get("description")
            else "The submitter re-opened this ticket — the original issue is not fully resolved."
        )
        location = data.get("location") if data else None
        comment = create_comment(
            ticket_id=ticket_id,
            entry_type="reopen",
            topic=topic,
            description=description,
            location=location,
            author=user,
        )
    except Exception as e:
        logger.error("Failed to write reopen entry for %s: %s", ticket_id, e)

    track_event("TicketReopened", {
        "ticket_id": updated_ticket["ticket_id"],
        "previous_status": previous_status,
        "reopened_by": user["email"],
        "reopen_count": updated_ticket.get("reopen_count", 1),
        "category": updated_ticket.get("category"),
    })

    try:
        send_status_update_email(
            to_email=updated_ticket["email"],
            ticket_id=updated_ticket["ticket_id"],
            new_status=updated_ticket["status"],
        )
    except Exception as e:
        logger.error("Status update email failed for re-opened ticket %s: %s", ticket_id, e)

    return json_response({
        "success": True,
        "message": f"Ticket {ticket_id} re-opened.",
        "ticket": updated_ticket,
        "comment": comment,
    })
