"""Database operations for admin-only ticket notes (UC-16 / FR-16).

Distinct from `ticket_comments` — these notes are internal and visible only
to admin users. Stored in the `admin_notes` Cosmos container with partition
key `/ticket_id`.
"""

import uuid
from datetime import datetime, timezone

from utils.cosmos_client import get_container, ADMIN_NOTES_CONTAINER


def create_admin_note(ticket_id: str, content: str, author: dict) -> dict:
    container = get_container(ADMIN_NOTES_CONTAINER)
    note_id = str(uuid.uuid4())

    note = {
        "id": note_id,
        "note_id": note_id,
        "ticket_id": ticket_id,
        "author_id": author.get("user_id"),
        "author_email": author.get("email"),
        "author_display_name": author.get("display_name"),
        "content": content.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    container.create_item(body=note)
    return note


def get_admin_notes_for_ticket(ticket_id: str) -> list:
    container = get_container(ADMIN_NOTES_CONTAINER)

    query = """
        SELECT * FROM c
        WHERE c.ticket_id = @ticket_id
        ORDER BY c.created_at DESC
    """
    params = [{"name": "@ticket_id", "value": ticket_id}]

    return list(container.query_items(
        query=query,
        parameters=params,
        partition_key=ticket_id,
    ))


def get_admin_note_by_id(note_id: str, ticket_id: str) -> dict | None:
    container = get_container(ADMIN_NOTES_CONTAINER)
    try:
        return container.read_item(item=note_id, partition_key=ticket_id)
    except Exception:
        return None


def delete_admin_note(note_id: str, ticket_id: str) -> None:
    container = get_container(ADMIN_NOTES_CONTAINER)
    container.delete_item(item=note_id, partition_key=ticket_id)
