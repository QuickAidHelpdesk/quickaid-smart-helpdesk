"""
All database operations for tickets.
The functions are organized according to their CRUD functionality.
"""

from datetime import datetime, timezone

from utils.cosmos_client import get_container, TICKETS_CONTAINER, STATUS_HISTORY_CONTAINER


# %% Create (C) %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
# Generates unique ticket ID.
def generate_ticket_id(container) -> str:
    try:
        query = "SELECT VALUE COUNT(1) FROM c"
        result = list(container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        count = result[0] if result else 0
        next_number = count + 1
        return f"QA-{str(next_number).zfill(5)}"

    except Exception:
        import uuid
        return f"QA-{str(uuid.uuid4())[:8].upper()}"


# Create ticket object and saves to Cosmos DB with default status Open.
def create_ticket(data: dict) -> dict:
    container = get_container(TICKETS_CONTAINER)
    ticket_id = generate_ticket_id(container)

    ticket = {
        "id": ticket_id,
        "ticket_id": ticket_id,
        "email": data["email"],
        "subject": data["subject"],
        "description": data["description"],
        "category": data["category"],
        "priority": data["priority"],
        "status": "Open",
        "assigned_to": None,
        "assigned_to_name": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
    }

    container.create_item(body=ticket)
    return ticket


# %% Read (R) %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
# Get a list of submitted tickets by user email.
def get_tickets_by_user_id(email: str, filters: dict = {}) -> list:
    container = get_container(TICKETS_CONTAINER)

    query = """
        SELECT
            c.ticket_id,
            c.subject,
            c.category,
            c.status,
            c.priority,
            c.assigned_to_name,
            c.created_at
        FROM c
        WHERE c.email = @email
    """
    params = [
        {"name": "@email", "value": email}
    ]

    if "status" in filters:
        query += " AND c.status = @status"
        params.append({
            "name": "@status",
            "value": filters["status"]
        })

    if "category" in filters:
        query += " AND c.category = @category"
        params.append({
            "name": "@category",
            "value": filters["category"]
        })

    query += " ORDER BY c.created_at DESC"

    return list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))


# Get full ticket details by ticket ID.
def get_ticket_by_id(ticket_id: str) -> dict | None:
    container = get_container(TICKETS_CONTAINER)

    query = "SELECT * FROM c WHERE c.ticket_id = @ticket_id"
    params = [
        {"name": "@ticket_id", "value": ticket_id}
    ]

    results = list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))

    return results[0] if results else None


# Search tickets by subject or ticket ID.
def search_tickets(q: str) -> list:
    container = get_container(TICKETS_CONTAINER)

    query = """
        SELECT
            c.ticket_id,
            c.subject,
            c.category,
            c.status,
            c.priority,
            c.assigned_to_name,
            c.created_at
        FROM c
        WHERE
            c.ticket_id = @q_exact OR
            CONTAINS(LOWER(c.subject), @q, true)
        ORDER BY c.created_at DESC
    """

    params = [
        {"name": "@q_exact", "value": q},
        {"name": "@q", "value": q.lower()},
    ]

    return list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))


# FR-07-01: Get tickets assigned to a specific agent member.
def get_tickets_by_assignee(email: str, filters: dict = {}) -> list:
    container = get_container(TICKETS_CONTAINER)

    query = """
        SELECT
            c.ticket_id,
            c.subject,
            c.category,
            c.status,
            c.priority,
            c.email,
            c.assigned_to_name,
            c.created_at
        FROM c
        WHERE c.assigned_to = @email
    """
    params = [
        {"name": "@email", "value": email.strip().lower()}
    ]

    if "status" in filters:
        query += " AND c.status = @status"
        params.append({"name": "@status", "value": filters["status"]})

    if "priority" in filters:
        query += " AND c.priority = @priority"
        params.append({"name": "@priority", "value": filters["priority"]})

    query += " ORDER BY c.created_at DESC"

    return list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))


# FR-10-01: Get all tickets with optional filters (admin).
def get_all_tickets(filters: dict = {}) -> list:
    container = get_container(TICKETS_CONTAINER)

    query = """
        SELECT
            c.ticket_id,
            c.subject,
            c.email,
            c.category,
            c.status,
            c.priority,
            c.assigned_to,
            c.assigned_to_name,
            c.created_at
        FROM c
        WHERE 1=1
    """
    params = []

    if "status" in filters:
        query += " AND c.status = @status"
        params.append({"name": "@status", "value": filters["status"]})

    if "category" in filters:
        query += " AND c.category = @category"
        params.append({"name": "@category", "value": filters["category"]})

    if "priority" in filters:
        query += " AND c.priority = @priority"
        params.append({"name": "@priority", "value": filters["priority"]})

    if "date_from" in filters:
        query += " AND c.created_at >= @date_from"
        params.append({"name": "@date_from", "value": filters["date_from"]})

    if "date_to" in filters:
        query += " AND c.created_at <= @date_to"
        params.append({"name": "@date_to", "value": filters["date_to"]})

    query += " ORDER BY c.created_at DESC"

    return list(container.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True,
    ))


# %% Update (U) %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
# FR-08-01: Update ticket status.
def update_ticket_status(ticket: dict, new_status: str, changed_by: str) -> dict:
    container = get_container(TICKETS_CONTAINER)

    old_status = ticket["status"]
    ticket["status"] = new_status
    ticket["updated_at"] = datetime.now(timezone.utc).isoformat()

    if new_status == "Resolved":
        ticket["resolved_at"] = datetime.now(timezone.utc).isoformat()

    container.upsert_item(body=ticket)

    # Write status history (best-effort)
    add_status_history(ticket["ticket_id"], old_status, new_status, changed_by)

    return ticket


# Apply partial updates to a ticket's editable fields.
def update_ticket(ticket: dict, updates: dict) -> tuple[dict, dict]:
    container = get_container(TICKETS_CONTAINER)

    editable = ["subject", "description", "category", "priority"]
    changes = {}

    for field in editable:
        if field in updates:
            new_value = str(updates[field]).strip() if isinstance(updates[field], str) else updates[field]
            if ticket.get(field) != new_value:
                changes[field] = {"from": ticket.get(field), "to": new_value}
                ticket[field] = new_value

    if changes:
        ticket["updated_at"] = datetime.now(timezone.utc).isoformat()
        container.upsert_item(body=ticket)

    return ticket, changes


# FR-10-02, FR-10-03: Assign ticket to a agent member.
def assign_ticket(ticket: dict, agent_user: dict) -> dict:
    container = get_container(TICKETS_CONTAINER)

    old_status = ticket["status"]
    ticket["assigned_to"] = agent_user["email"]
    ticket["assigned_to_name"] = agent_user["display_name"]
    ticket["updated_at"] = datetime.now(timezone.utc).isoformat()

    # FR-10-03: Auto-change Open to In Progress on assignment
    if ticket["status"] == "Open":
        ticket["status"] = "In Progress"

    container.upsert_item(body=ticket)

    # Write status history if status changed
    if ticket["status"] != old_status:
        add_status_history(
            ticket["ticket_id"], old_status, ticket["status"], agent_user["email"]
        )

    return ticket


# Write a status change record to the status_history container (best-effort).
def add_status_history(
    ticket_id: str, old_status: str, new_status: str, changed_by: str
) -> None:
    import uuid
    import logging

    logger = logging.getLogger(__name__)

    try:
        container = get_container(STATUS_HISTORY_CONTAINER)
        history_id = str(uuid.uuid4())

        record = {
            "id": history_id,
            "history_id": history_id,
            "ticket_id": ticket_id,
            "previous_status": old_status,
            "new_status": new_status,
            "changed_by": changed_by,
            "changed_at": datetime.now(timezone.utc).isoformat(),
        }

        container.create_item(body=record)
    except Exception as e:
        logger.error(
            "Failed to write status history for ticket %s: %s", ticket_id, e
        )
