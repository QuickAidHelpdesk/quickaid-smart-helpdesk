"""Database operations for ticket comments / progress entries."""

import uuid
from datetime import datetime, timezone

from utils.cosmos_client import get_container, COMMENTS_CONTAINER


def create_comment(
    ticket_id: str,
    entry_type: str,
    topic: str,
    description: str,
    location: str | None,
    author: dict,
    resolved_in_seconds: int | None = None,
) -> dict:
    container = get_container(COMMENTS_CONTAINER)
    comment_id = str(uuid.uuid4())

    comment = {
        "id": comment_id,
        "comment_id": comment_id,
        "ticket_id": ticket_id,
        "entry_type": entry_type,
        "topic": topic.strip(),
        "description": description.strip(),
        "location": location.strip() if isinstance(location, str) and location.strip() else None,
        "author_email": author.get("email"),
        "author_role": author.get("role"),
        "author_display_name": author.get("display_name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "resolved_in_seconds": resolved_in_seconds,
    }

    container.create_item(body=comment)
    return comment


def get_comments_for_ticket(ticket_id: str) -> list:
    container = get_container(COMMENTS_CONTAINER)

    query = """
        SELECT * FROM c
        WHERE c.ticket_id = @ticket_id
        ORDER BY c.created_at ASC
    """
    params = [{"name": "@ticket_id", "value": ticket_id}]

    return list(container.query_items(
        query=query,
        parameters=params,
        partition_key=ticket_id,
    ))
