"""
All database operations for tickets.
The functions are organized according to their CRUD functionality.
"""

from datetime import datetime, timezone

from utils.cosmos_client import get_container, TICKETS_CONTAINER


# ──  Create (C) ──────────────────────────────────────
# ──  Generates unique ticket ID.
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


# ── Create ticket object and saves to Cosmos DB with default status Open.
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


# ──  Read (R) ──────────────────────────────────────
# ── Get a list of submitted tickets by user email.
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


# ── Get full ticket details by ticket ID.
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


# ──  Search tickets by subject or ticket ID.
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
