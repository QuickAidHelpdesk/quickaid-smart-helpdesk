"""
Auto-escalation of stale tickets.

A timer-triggered Azure Function (see blueprints/escalation.py) calls
escalate_stale_tickets() on a recurring schedule. Any Open ticket that has
sat at its current priority for longer than ESCALATION_DAYS_THRESHOLD is
bumped one level (Low -> Medium -> High -> Critical). Critical tickets are
the cap and are never bumped further.

Each escalation:
  - sets priority, last_escalated_at, escalation_count, updated_at on the ticket
  - writes a system entry (entry_type="escalation") to ticket_comments
  - emails the submitter and every agent in a team whose category matches
  - emits a TicketEscalated Application Insights event
"""

import logging
import os
from datetime import datetime, timezone, timedelta

from utils.cosmos_client import get_container, TICKETS_CONTAINER
from utils.telemetry import track_event
from shared.ticket.comment_service import create_comment
from shared.ticket.email_service import send_escalation_email
from shared.team.team_service import get_agents_for_category
from shared.notification.notification_service import create_notification, notify_agents_in_category

logger = logging.getLogger(__name__)

PRIORITY_ORDER = ["Low", "Medium", "High", "Critical"]

SYSTEM_AUTHOR = {
    "email": "system@quickaid",
    "role": "system",
    "display_name": "QuickAid System",
}


def _next_priority(current: str) -> str | None:
    """Return the priority one level above `current`, or None if at the top."""
    try:
        idx = PRIORITY_ORDER.index(current)
    except ValueError:
        return None
    if idx >= len(PRIORITY_ORDER) - 1:
        return None
    return PRIORITY_ORDER[idx + 1]


def _stale_since(ticket: dict) -> str:
    """The timestamp from which staleness is measured for this ticket."""
    return ticket.get("last_escalated_at") or ticket["created_at"]


def _threshold_days() -> int:
    raw = os.environ.get("ESCALATION_DAYS_THRESHOLD", "3")
    try:
        return max(0, int(raw))
    except ValueError:
        logger.warning("Invalid ESCALATION_DAYS_THRESHOLD=%r; falling back to 3", raw)
        return 3


def _query_open_escalation_candidates() -> list:
    """Pull every Open, non-deleted, non-Critical ticket. Time filter is applied in Python
    so that `last_escalated_at` (which may be missing) can be coalesced with `created_at`."""
    container = get_container(TICKETS_CONTAINER)
    query = """
        SELECT * FROM c
        WHERE c.status = 'Open'
          AND c.priority IN ('Low', 'Medium', 'High')
          AND (NOT IS_DEFINED(c.is_deleted) OR c.is_deleted = false)
    """
    return list(container.query_items(query=query, enable_cross_partition_query=True))


def _apply_escalation(ticket: dict, new_priority: str, now: datetime) -> dict:
    container = get_container(TICKETS_CONTAINER)
    ticket["priority"] = new_priority
    ticket["last_escalated_at"] = now.isoformat()
    ticket["escalation_count"] = int(ticket.get("escalation_count", 0)) + 1
    ticket["updated_at"] = now.isoformat()
    container.upsert_item(body=ticket)
    return ticket


def _write_escalation_entry(
    ticket_id: str, old_priority: str, new_priority: str, days_stale: int
) -> None:
    topic = f"Auto-escalated to {new_priority} priority"
    description = (
        f"This ticket was Open at {old_priority} priority for "
        f"{days_stale} day{'s' if days_stale != 1 else ''} without resolution "
        f"and has been auto-escalated to {new_priority}."
    )
    create_comment(
        ticket_id=ticket_id,
        entry_type="escalation",
        topic=topic,
        description=description,
        location=None,
        author=SYSTEM_AUTHOR,
    )


def _notify(ticket: dict, old_priority: str, new_priority: str) -> None:
    """Email the submitter and matching-team agents. Best-effort — never raises."""
    submitter = ticket.get("email")
    if submitter:
        try:
            send_escalation_email(
                to_email=submitter,
                ticket_id=ticket["ticket_id"],
                subject=ticket["subject"],
                old_priority=old_priority,
                new_priority=new_priority,
                recipient_role="user",
            )
        except Exception as e:
            logger.error(
                "Escalation email to submitter failed for %s: %s",
                ticket["ticket_id"], e,
            )

    try:
        agents = get_agents_for_category(ticket.get("category", ""))
    except Exception as e:
        logger.error("Failed to look up agents for category %s: %s", ticket.get("category"), e)
        agents = []

    for agent in agents:
        agent_email = agent.get("email")
        if not agent_email:
            continue
        try:
            send_escalation_email(
                to_email=agent_email,
                ticket_id=ticket["ticket_id"],
                subject=ticket["subject"],
                old_priority=old_priority,
                new_priority=new_priority,
                recipient_role="agent",
            )
        except Exception as e:
            logger.error(
                "Escalation email to agent %s failed for ticket %s: %s",
                agent_email, ticket["ticket_id"], e,
            )


def escalate_stale_tickets(now: datetime | None = None) -> dict:
    """Run one escalation pass. Returns counters for telemetry / logs."""
    if now is None:
        now = datetime.now(timezone.utc)

    threshold_days = _threshold_days()
    cutoff = now - timedelta(days=threshold_days)

    candidates = _query_open_escalation_candidates()
    summary = {"scanned": len(candidates), "escalated": 0, "skipped": 0, "errors": 0}

    for ticket in candidates:
        try:
            stale_since_raw = _stale_since(ticket)
            stale_since = datetime.fromisoformat(stale_since_raw)
            if stale_since.tzinfo is None:
                stale_since = stale_since.replace(tzinfo=timezone.utc)

            if stale_since > cutoff:
                summary["skipped"] += 1
                continue

            old_priority = ticket["priority"]
            new_priority = _next_priority(old_priority)
            if not new_priority:
                summary["skipped"] += 1
                continue

            days_stale = max(1, (now - stale_since).days)
            updated = _apply_escalation(ticket, new_priority, now)

            try:
                _write_escalation_entry(
                    updated["ticket_id"], old_priority, new_priority, days_stale
                )
            except Exception as e:
                logger.error(
                    "Failed to write escalation entry for %s: %s",
                    updated["ticket_id"], e,
                )

            _notify(updated, old_priority, new_priority)

            track_event("TicketEscalated", {
                "ticket_id": updated["ticket_id"],
                "old_priority": old_priority,
                "new_priority": new_priority,
                "escalation_count": updated["escalation_count"],
                "days_since_last_change": days_stale,
                "category": updated.get("category"),
            })

            try:
                create_notification(
                    updated["email"], "ticket_escalated", "Ticket Priority Escalated",
                    f"Your ticket {updated['ticket_id']} priority has been escalated from {old_priority} to {new_priority}.",
                    updated["ticket_id"],
                )
            except Exception as e:
                logger.error("Escalation notification failed (user) for %s: %s", updated["ticket_id"], e)
            try:
                notify_agents_in_category(
                    updated.get("category"), "ticket_escalated", "Ticket Escalated",
                    f"Ticket {updated['ticket_id']} in {updated.get('category')} escalated to {new_priority} priority.",
                    updated["ticket_id"],
                )
            except Exception as e:
                logger.error("Escalation notification failed (agents) for %s: %s", updated["ticket_id"], e)

            summary["escalated"] += 1
        except Exception as e:
            summary["errors"] += 1
            logger.exception(
                "Escalation failed for ticket %s: %s",
                ticket.get("ticket_id"), e,
            )

    logger.info("Escalation pass complete: %s (threshold=%sd)", summary, threshold_days)
    return summary
