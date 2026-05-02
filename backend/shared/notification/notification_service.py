"""
Notification service — CRUD operations and fan-out helpers for the notifications container.
All write operations are wrapped in try/except so callers never fail due to notification errors.
"""

import logging
import uuid
from datetime import datetime, timezone

from utils.cosmos_client import get_container, NOTIFICATIONS_CONTAINER

logger = logging.getLogger(__name__)


def create_notification(
    recipient_email: str,
    notification_type: str,
    title: str,
    message: str,
    ticket_id: str | None = None,
) -> dict | None:
    """Write a single notification document. Returns the created doc or None on failure."""
    try:
        container = get_container(NOTIFICATIONS_CONTAINER)
        notification_id = str(uuid.uuid4())
        doc = {
            "id": notification_id,
            "notification_id": notification_id,
            "recipient_email": recipient_email.lower().strip(),
            "type": notification_type,
            "title": title,
            "message": message,
            "ticket_id": ticket_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        container.create_item(body=doc)
        return doc
    except Exception as e:
        logger.error("Failed to create notification for %s: %s", recipient_email, e)
        return None


def get_notifications_for_user(email: str, unread_only: bool = False) -> list:
    """Return notifications for a user, newest first. Optionally filter to unread only."""
    try:
        container = get_container(NOTIFICATIONS_CONTAINER)
        if unread_only:
            query = (
                "SELECT * FROM c WHERE c.recipient_email = @email "
                "AND c.is_read = false ORDER BY c.created_at DESC"
            )
        else:
            query = (
                "SELECT * FROM c WHERE c.recipient_email = @email "
                "ORDER BY c.created_at DESC"
            )
        params = [{"name": "@email", "value": email.lower().strip()}]
        return list(container.query_items(
            query=query,
            parameters=params,
            partition_key=email.lower().strip(),
        ))
    except Exception as e:
        logger.error("Failed to fetch notifications for %s: %s", email, e)
        return []


def mark_notification_read(notification_id: str, email: str) -> bool:
    """Mark a single notification as read. Returns True on success."""
    try:
        container = get_container(NOTIFICATIONS_CONTAINER)
        items = list(container.query_items(
            query=(
                "SELECT * FROM c WHERE c.notification_id = @nid "
                "AND c.recipient_email = @email"
            ),
            parameters=[
                {"name": "@nid", "value": notification_id},
                {"name": "@email", "value": email.lower().strip()},
            ],
            partition_key=email.lower().strip(),
        ))
        if not items:
            return False
        doc = items[0]
        doc["is_read"] = True
        container.upsert_item(body=doc)
        return True
    except Exception as e:
        logger.error("Failed to mark notification %s as read: %s", notification_id, e)
        return False


def mark_all_read(email: str) -> int:
    """Mark all unread notifications as read for a user. Returns count updated."""
    try:
        container = get_container(NOTIFICATIONS_CONTAINER)
        items = list(container.query_items(
            query=(
                "SELECT * FROM c WHERE c.recipient_email = @email "
                "AND c.is_read = false"
            ),
            parameters=[{"name": "@email", "value": email.lower().strip()}],
            partition_key=email.lower().strip(),
        ))
        count = 0
        for doc in items:
            doc["is_read"] = True
            container.upsert_item(body=doc)
            count += 1
        return count
    except Exception as e:
        logger.error("Failed to mark all notifications read for %s: %s", email, e)
        return 0


def notify_agents_in_category(
    category: str,
    notification_type: str,
    title: str,
    message: str,
    ticket_id: str | None = None,
) -> None:
    """Fan-out a notification to every agent whose team handles `category`."""
    if not category:
        return
    try:
        from shared.team.team_service import get_agents_for_category
        agents = get_agents_for_category(category)
    except Exception as e:
        logger.error("notify_agents_in_category: failed to get agents for %s: %s", category, e)
        return

    for agent in agents:
        agent_email = agent.get("email")
        if not agent_email:
            continue
        create_notification(agent_email, notification_type, title, message, ticket_id)


def notify_all_admins(
    notification_type: str,
    title: str,
    message: str,
    ticket_id: str | None = None,
) -> None:
    """Fan-out a notification to every admin user."""
    try:
        from shared.user.user_service import get_users_by_role
        admins = get_users_by_role("admin")
    except Exception as e:
        logger.error("notify_all_admins: failed to get admins: %s", e)
        return

    for admin in admins:
        admin_email = admin.get("email")
        if not admin_email:
            continue
        create_notification(admin_email, notification_type, title, message, ticket_id)
