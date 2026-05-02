"""
Notifications Blueprint — endpoints for the in-app notification system
API:
  GET  /api/notifications                        - List notifications for the authenticated user
  PATCH /api/notifications/{notificationId}/read - Mark a single notification as read
  POST /api/notifications/mark-all-read          - Mark all notifications as read
"""

import logging
import azure.functions as func

from shared.notification.notification_service import (
    get_notifications_for_user,
    mark_notification_read,
    mark_all_read,
)
from utils.auth import require_role
from utils.http_helpers import error_response, json_response, preflight_response

bp = func.Blueprint()
logger = logging.getLogger(__name__)


# ── GET /api/notifications ─────────────────────────────────────────────────
@bp.route(route="notifications", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_notifications_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["user", "agent", "admin"])
    if err:
        return err

    unread_only = req.params.get("unread_only", "").lower() == "true"

    notifications = get_notifications_for_user(user["email"], unread_only=unread_only)
    return json_response({"notifications": notifications})


# ── POST /api/notifications/mark-all-read ──────────────────────────────────
@bp.route(route="notifications/mark-all-read", methods=["POST", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def mark_all_read_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["user", "agent", "admin"])
    if err:
        return err

    count = mark_all_read(user["email"])
    return json_response({"success": True, "updated": count})


# ── PATCH /api/notifications/{notificationId}/read ─────────────────────────
@bp.route(route="notifications/{notificationId}/read", methods=["PATCH", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def mark_notification_read_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    user, err = require_role(req, ["user", "agent", "admin"])
    if err:
        return err

    notification_id = req.route_params.get("notificationId")
    if not notification_id:
        return error_response("notificationId is required.", 400)

    success = mark_notification_read(notification_id, user["email"])
    if not success:
        return error_response("Notification not found.", 404)

    return json_response({"success": True})
