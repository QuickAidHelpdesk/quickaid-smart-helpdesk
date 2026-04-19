"""
Insights Blueprint — admin-only analytics endpoint (UC-11, FR-11-03).
API:
  GET /api/manage/insights?days=30  - Aggregated ticket metrics for the dashboard
"""

import logging
import os
from collections import Counter
from datetime import datetime, timedelta, timezone

import azure.functions as func

from utils.auth import require_role
from utils.cosmos_client import get_container, TICKETS_CONTAINER
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)

bp = func.Blueprint()
logger = logging.getLogger(__name__)


# ── GET /api/manage/insights ──────────────────────────────────────
# FR-11-03: Monitoring dashboard data (admin only)
@bp.route(route="manage/insights", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_insights(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["admin"])
    if err:
        return err

    try:
        days = int(req.params.get("days", "30"))
    except ValueError:
        return error_response("'days' must be an integer.", 400)

    days = max(1, min(days, 365))
    window_start = datetime.now(timezone.utc) - timedelta(days=days)
    window_start_iso = window_start.isoformat()

    try:
        container = get_container(TICKETS_CONTAINER)
        tickets = list(container.query_items(
            query=(
                "SELECT c.ticket_id, c.status, c.category, c.priority, "
                "c.created_at, c.resolved_at FROM c "
                "WHERE c.created_at >= @start"
            ),
            parameters=[{"name": "@start", "value": window_start_iso}],
            enable_cross_partition_query=True,
        ))
    except Exception as e:
        logger.error("Failed to load tickets for insights: %s", e)
        return error_response("Failed to load insights.", 500)

    body = _aggregate(tickets, days)

    portal_url = os.environ.get("APPLICATIONINSIGHTS_PORTAL_URL")
    if portal_url:
        body["portal_url"] = portal_url

    return json_response(body)


def _aggregate(tickets: list[dict], days: int) -> dict:
    status_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    priority_counts: Counter[str] = Counter()
    daily_counts: Counter[str] = Counter()

    resolution_hours: list[float] = []

    for t in tickets:
        status = t.get("status") or "Unknown"
        status_counts[status] += 1
        category_counts[t.get("category") or "Unknown"] += 1
        priority_counts[t.get("priority") or "Unknown"] += 1

        created_at = t.get("created_at")
        if created_at:
            try:
                day = datetime.fromisoformat(created_at.replace("Z", "+00:00")).date().isoformat()
                daily_counts[day] += 1
            except ValueError:
                pass

        resolved_at = t.get("resolved_at")
        if created_at and resolved_at:
            try:
                c = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                r = datetime.fromisoformat(resolved_at.replace("Z", "+00:00"))
                delta = (r - c).total_seconds() / 3600.0
                if delta >= 0:
                    resolution_hours.append(delta)
            except ValueError:
                pass

    total = len(tickets)
    avg_resolution = (
        round(sum(resolution_hours) / len(resolution_hours), 2)
        if resolution_hours else None
    )

    today = datetime.now(timezone.utc).date()
    daily_submissions = [
        {"date": (today - timedelta(days=i)).isoformat(),
         "count": daily_counts.get((today - timedelta(days=i)).isoformat(), 0)}
        for i in range(days - 1, -1, -1)
    ]

    return {
        "window_days": days,
        "totals": {
            "total": total,
            "open": status_counts.get("Open", 0),
            "in_progress": status_counts.get("In Progress", 0),
            "resolved": status_counts.get("Resolved", 0),
            "closed": status_counts.get("Closed", 0),
            "avg_resolution_hours": avg_resolution,
        },
        "by_status": [{"key": k, "count": v} for k, v in status_counts.most_common()],
        "by_category": [{"key": k, "count": v} for k, v in category_counts.most_common()],
        "by_priority": [{"key": k, "count": v} for k, v in priority_counts.most_common()],
        "daily_submissions": daily_submissions,
    }
