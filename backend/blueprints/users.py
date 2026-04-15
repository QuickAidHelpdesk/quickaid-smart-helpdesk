"""
Users Blueprint to handle endpoints/API
API:
  POST /api/users/login - Upsert user on login (create if new, return if existing)
  GET /api/users - Get user by email query param
  GET /api/users/{userId} - Get user by ID
"""

import logging
import azure.functions as func

from shared.user.user_service import (
    upsert_user,
    get_user_by_email,
    get_user_by_id,
)
from shared.user.validator import validate_user
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)

bp = func.Blueprint()
logger = logging.getLogger(__name__)


# ── POST /api/users/login ──────────────────────────────────────────
# Upsert user on login — receives Entra ID claims, creates or returns existing
@bp.route(route="users/login", methods=["POST", "OPTIONS"])
def user_login(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    # Validate user data (FR-01-01)
    errors = validate_user(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    # Upsert user (FR-01-02)
    try:
        user = upsert_user(data)
    except Exception as e:
        logger.error("Failed to upsert user: %s", e)
        return error_response("Failed to process user login.", 500)

    return json_response({
        "success": True,
        "user": user,
    })


# ── GET /api/users ─────────────────────────────────────────────────
# Get user by email query param
@bp.route(route="users", methods=["GET", "OPTIONS"])
def get_user_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    email = req.params.get("email")
    if not email:
        return error_response("email query parameter is required.", 400)

    try:
        user = get_user_by_email(email)

        if not user:
            return error_response("User not found.", 404)

        return json_response({"user": user})

    except Exception as e:
        logger.error("Failed to retrieve user for %s: %s", email, e)
        return error_response("Failed to retrieve user.", 500)


# ── GET /api/users/{userId} ────────────────────────────────────────
# Get user by user ID
@bp.route(route="users/{userId}", methods=["GET", "OPTIONS"])
def get_user_by_id_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    user_id = req.route_params.get("userId")

    try:
        user = get_user_by_id(user_id)

        if not user:
            return error_response("User not found.", 404)

        return json_response({"user": user})

    except Exception as e:
        logger.error("Failed to retrieve user %s: %s", user_id, e)
        return error_response("Failed to retrieve user.", 500)
