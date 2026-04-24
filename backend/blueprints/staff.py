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

from shared.ticket.email_service import (
    send_reassignment_email,
    send_status_update_email,
)
from shared.ticket.ticket_service import (
    get_ticket_by_id,
    get_tickets_for_handler,
    reassign_ticket,
    update_ticket_status,
)
from shared.ticket.validator import validate_assignment, validate_status_update
from shared.team.team_service import get_team_by_id, get_team_by_category
from shared.user.user_service import get_user_by_email, list_users_by_team_id
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


# ── GET /api/staff/team ────────────────────────────────────────────
# Return the requester's team + its members (agents & staff).
# Used by the "Agents & Teams" page for the team overview, the members
# table, and the reassignment dialog.
@bp.route(route="staff/team", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_staff_team(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["staff", "admin", "agent"])
    if err:
        return err

    team_id = user.get("team_id")
    if not team_id:
        return json_response({"team": None, "members": []})

    try:
        team = get_team_by_id(team_id)
    except Exception as e:
        logger.error("Failed to look up team %s: %s", team_id, e)
        return error_response("Failed to retrieve team.", 500)

    if not team:
        return json_response({"team": None, "members": []})

    try:
        members = list_users_by_team_id(team_id, roles=["staff", "agent"])
    except Exception as e:
        logger.error("Failed to list team members for %s: %s", team_id, e)
        return error_response("Failed to retrieve team members.", 500)

    return json_response({"team": team, "members": members})


# ── PATCH /api/staff/tickets/{ticketId}/reassign ───────────────────
# Within-team reassignment: any staff/agent in the same team can pass
# a ticket to a teammate. Admins may reassign across the ticket's
# category team.
@bp.route(route="staff/tickets/{ticketId}/reassign", methods=["PATCH", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def reassign_ticket_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["staff", "admin", "agent"])
    if err:
        return err

    ticket_id = req.route_params.get("ticketId")

    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_assignment(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    try:
        ticket = get_ticket_by_id(ticket_id)
    except Exception as e:
        logger.error("Failed to retrieve ticket %s: %s", ticket_id, e)
        return error_response("Failed to retrieve ticket.", 500)

    if not ticket:
        return error_response("Ticket not found.", 404)

    role = user.get("role")
    is_admin = role == "admin"

    # Resolve the requester's team (skipped for admins — they borrow the
    # ticket-category team).
    requester_team = None
    if not is_admin:
        requester_team_id = user.get("team_id")
        if not requester_team_id:
            return error_response(
                "You must belong to a team to reassign tickets.", 403
            )
        try:
            requester_team = get_team_by_id(requester_team_id)
        except Exception as e:
            logger.error("Failed to look up team %s: %s", requester_team_id, e)
            return error_response("Failed to verify your team.", 500)
        if not requester_team:
            return error_response(
                "Your team no longer exists. Please contact an admin.", 403
            )
        if requester_team["category"] != ticket["category"]:
            return error_response(
                "You can only reassign tickets in your team's category.", 403
            )
    else:
        # Admin bypass: resolve the team that owns this ticket's category
        # so we can scope the new assignee check consistently.
        try:
            requester_team = get_team_by_category(ticket["category"])
        except Exception as e:
            logger.error("Failed to look up team for category %s: %s", ticket["category"], e)
            return error_response("Failed to resolve ticket's team.", 500)
        if not requester_team:
            return error_response(
                f"No team exists for ticket category '{ticket['category']}'.", 400
            )

    # Resolve the new assignee.
    new_email = data["assigned_to"].strip().lower()
    try:
        new_assignee = get_user_by_email(new_email)
    except Exception as e:
        logger.error("Failed to look up user %s: %s", new_email, e)
        return error_response("Failed to verify new assignee.", 500)

    if not new_assignee:
        return error_response(f"User '{new_email}' not found.", 404)

    if new_assignee.get("role") not in ("staff", "agent"):
        return error_response(
            f"User '{new_email}' is not a staff or agent member.", 400
        )

    if new_assignee.get("team_id") != requester_team["team_id"]:
        return error_response(
            "The new assignee is not on your team.", 403
        )

    if ticket.get("assigned_to") == new_assignee["email"]:
        return error_response(
            "This ticket is already assigned to that team member.", 409
        )

    previous_assignee_name = ticket.get("assigned_to_name") or "Unassigned"

    try:
        updated_ticket = reassign_ticket(ticket, new_assignee, user["email"])
    except Exception as e:
        logger.error("Failed to reassign ticket %s: %s", ticket_id, e)
        return error_response("Failed to reassign ticket.", 500)

    track_event("TicketReassigned", {
        "ticket_id": updated_ticket["ticket_id"],
        "previous_assignee": ticket.get("assigned_to"),
        "new_assignee": new_assignee["email"],
        "changed_by": user["email"],
        "team_id": requester_team["team_id"],
    })

    try:
        send_reassignment_email(
            to_email=new_assignee["email"],
            ticket_id=updated_ticket["ticket_id"],
            subject=updated_ticket["subject"],
            previous_assignee_name=previous_assignee_name,
            new_assignee_name=new_assignee["display_name"],
            transferred_by_name=user.get("display_name") or user["email"],
        )
    except Exception as e:
        logger.error("Reassignment email failed for ticket %s: %s", ticket_id, e)

    return json_response({
        "success": True,
        "message": (
            f"Ticket {updated_ticket['ticket_id']} transferred to "
            f"{new_assignee['display_name']}."
        ),
        "ticket": updated_ticket,
    })
