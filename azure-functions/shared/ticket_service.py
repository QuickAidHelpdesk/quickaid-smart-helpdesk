"""
Ticket service — replaces Django tickets app.
Handles all ticket CRUD and status operations against Cosmos DB.
"""

import uuid
from datetime import datetime, timezone

from .cosmos_client import (
    ADMIN_NOTES_CONTAINER,
    STATUS_HISTORY_CONTAINER,
    TICKETS_CONTAINER,
    create_item,
    query_items,
    read_item,
    replace_item,
)
from .user_service import get_or_create_user_by_email, get_user_by_id


def _generate_ticket_id() -> str:
    """Generate next sequential ticket ID like QA-00001."""
    results = query_items(
        TICKETS_CONTAINER,
        "SELECT TOP 1 c.ticket_id FROM c ORDER BY c.created_at DESC",
    )
    if results:
        last_num = int(results[0]["ticket_id"].split("-")[1])
        return f"QA-{last_num + 1:05d}"
    return "QA-00001"


def create_ticket(validated_data: dict) -> dict:
    """Create a new ticket, get-or-create the user by email,
    generate QA-XXXXX ID, and return the ticket document."""
    user = get_or_create_user_by_email(
        validated_data["email"], validated_data["display_name"]
    )

    ticket_id = _generate_ticket_id()
    now = datetime.now(timezone.utc).isoformat()

    ticket = {
        "id": ticket_id,
        "ticket_id": ticket_id,
        "user_id": user["user_id"],
        "user_email": user["email"],
        "user_display_name": user["display_name"],
        "subject": validated_data["subject"],
        "description": validated_data["description"],
        "category": validated_data["category"],
        "priority": validated_data["priority"],
        "status": "Open",
        "assigned_to": None,
        "assigned_to_name": None,
        "created_at": now,
        "updated_at": now,
        "resolved_at": None,
    }
    return create_item(TICKETS_CONTAINER, ticket)


def get_tickets_by_email(email: str) -> list[dict]:
    """Return all tickets submitted by the given email address."""
    return query_items(
        TICKETS_CONTAINER,
        "SELECT * FROM c WHERE c.user_email = @email ORDER BY c.created_at DESC",
        [{"name": "@email", "value": email}],
    )


def get_ticket_by_id(ticket_id: str) -> dict | None:
    """Return a single ticket by its ticket_id, or None if not found."""
    item = read_item(TICKETS_CONTAINER, ticket_id, ticket_id)
    if not item:
        return None

    # Attach status history
    item["status_history"] = query_items(
        STATUS_HISTORY_CONTAINER,
        "SELECT * FROM c WHERE c.ticket_id = @tid ORDER BY c.changed_at DESC",
        [{"name": "@tid", "value": ticket_id}],
    )

    # Attach admin notes
    item["admin_notes"] = query_items(
        ADMIN_NOTES_CONTAINER,
        "SELECT * FROM c WHERE c.ticket_id = @tid ORDER BY c.created_at DESC",
        [{"name": "@tid", "value": ticket_id}],
    )

    return item


def update_ticket_status(
    ticket_id: str, validated_data: dict, changed_by_id: str
) -> dict:
    """Update ticket status, create StatusHistory record,
    set resolved_at if status is 'Resolved'."""
    ticket = read_item(TICKETS_CONTAINER, ticket_id, ticket_id)
    if not ticket:
        raise ValueError(["Ticket not found."])

    previous_status = ticket["status"]
    new_status = validated_data["status"]
    now = datetime.now(timezone.utc).isoformat()

    # Update ticket
    ticket["status"] = new_status
    ticket["updated_at"] = now
    if new_status == "Resolved":
        ticket["resolved_at"] = now

    replace_item(TICKETS_CONTAINER, ticket_id, ticket)

    # Create status history record
    history = {
        "id": str(uuid.uuid4()),
        "history_id": str(uuid.uuid4()),
        "ticket_id": ticket_id,
        "previous_status": previous_status,
        "new_status": new_status,
        "changed_by": changed_by_id,
        "notes": validated_data.get("notes", ""),
        "changed_at": now,
    }
    create_item(STATUS_HISTORY_CONTAINER, history)

    return ticket


def assign_ticket(
    ticket_id: str, validated_data: dict, assigned_by_id: str
) -> dict:
    """Assign ticket to a support staff user. Change status to
    'In Progress' if currently 'Open'. Return updated ticket."""
    ticket = read_item(TICKETS_CONTAINER, ticket_id, ticket_id)
    if not ticket:
        raise ValueError(["Ticket not found."])

    assigned_to_id = validated_data["assigned_to"]
    assigned_user = get_user_by_id(assigned_to_id)
    if not assigned_user:
        raise ValueError(["Assigned user not found."])

    now = datetime.now(timezone.utc).isoformat()
    previous_status = ticket["status"]

    ticket["assigned_to"] = assigned_to_id
    ticket["assigned_to_name"] = assigned_user["display_name"]
    ticket["updated_at"] = now

    # Auto-change status from Open to In Progress
    if ticket["status"] == "Open":
        ticket["status"] = "In Progress"

        # Log status change
        history = {
            "id": str(uuid.uuid4()),
            "history_id": str(uuid.uuid4()),
            "ticket_id": ticket_id,
            "previous_status": previous_status,
            "new_status": "In Progress",
            "changed_by": assigned_by_id,
            "notes": f"Ticket assigned to {assigned_user['display_name']}",
            "changed_at": now,
        }
        create_item(STATUS_HISTORY_CONTAINER, history)

    replace_item(TICKETS_CONTAINER, ticket_id, ticket)
    return ticket


def get_all_tickets(query_params: dict) -> list[dict]:
    """Return all tickets with optional filters:
    status, category, priority, assigned_to, date_from, date_to."""
    conditions = []
    parameters = []

    if query_params.get("status"):
        conditions.append("c.status = @status")
        parameters.append({"name": "@status", "value": query_params["status"]})

    if query_params.get("category"):
        conditions.append("c.category = @category")
        parameters.append({"name": "@category", "value": query_params["category"]})

    if query_params.get("priority"):
        conditions.append("c.priority = @priority")
        parameters.append({"name": "@priority", "value": query_params["priority"]})

    if query_params.get("assigned_to"):
        conditions.append("c.assigned_to = @assigned_to")
        parameters.append({"name": "@assigned_to", "value": query_params["assigned_to"]})

    if query_params.get("date_from"):
        conditions.append("c.created_at >= @date_from")
        parameters.append({"name": "@date_from", "value": query_params["date_from"]})

    if query_params.get("date_to"):
        conditions.append("c.created_at <= @date_to")
        parameters.append({"name": "@date_to", "value": query_params["date_to"]})

    where_clause = " AND ".join(conditions)
    query = "SELECT * FROM c"
    if where_clause:
        query += f" WHERE {where_clause}"
    query += " ORDER BY c.created_at DESC"

    return query_items(TICKETS_CONTAINER, query, parameters)


def search_tickets(search_term: str) -> list[dict]:
    """Search tickets by ticket_id or subject (case-insensitive)."""
    return query_items(
        TICKETS_CONTAINER,
        "SELECT * FROM c WHERE CONTAINS(LOWER(c.ticket_id), LOWER(@term)) "
        "OR CONTAINS(LOWER(c.subject), LOWER(@term)) "
        "ORDER BY c.created_at DESC",
        [{"name": "@term", "value": search_term}],
    )


def add_admin_note(ticket_id: str, validated_data: dict, author_id: str) -> dict:
    """Create an AdminNote attached to the given ticket."""
    ticket = read_item(TICKETS_CONTAINER, ticket_id, ticket_id)
    if not ticket:
        raise ValueError(["Ticket not found."])

    author = get_user_by_id(author_id)
    note = {
        "id": str(uuid.uuid4()),
        "note_id": str(uuid.uuid4()),
        "ticket_id": ticket_id,
        "author_id": author_id,
        "author_name": author["display_name"] if author else "Unknown",
        "content": validated_data["content"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return create_item(ADMIN_NOTES_CONTAINER, note)
