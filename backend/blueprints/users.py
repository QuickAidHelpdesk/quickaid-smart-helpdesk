"""
Users Blueprint — public endpoints for user management
API:
  POST /api/users/login           - Upsert user on login (create if new, return if existing)
  POST /api/users/signup          - Self-service email/password sign-up
  POST /api/users/login_password  - Email/password sign-in
  GET  /api/users                 - Get user by email query param
  GET  /api/users/{userId}        - Get user by ID
"""

import logging
import azure.functions as func

from shared.user.user_service import (
    upsert_user,
    get_user_by_email,
    get_user_by_id,
    create_user_with_password,
    verify_user_credentials,
    _strip_password_hash,
)
from shared.user.validator import (
    validate_user,
    validate_signup,
    validate_password_login,
)
from utils.auth import require_role
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)
from shared.notification.notification_service import notify_all_admins

bp = func.Blueprint()
logger = logging.getLogger(__name__)


# ── POST /api/users/login ──────────────────────────────────────────
# Upsert user on login — receives Entra ID claims, creates or returns existing
@bp.route(route="users/login", methods=["POST", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
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

    # Check if brand-new user before upsert (to decide whether to notify admins)
    is_new_user = get_user_by_email(data["email"]) is None

    # Upsert user (FR-01-02)
    try:
        user = upsert_user(data)
    except Exception as e:
        logger.error("Failed to upsert user: %s", e)
        return error_response("Failed to process user login.", 500)

    if is_new_user:
        try:
            notify_all_admins(
                "new_user_registered", "New User Registered",
                f"{user['display_name']} ({user['email']}) has joined QuickAid.",
            )
        except Exception as e:
            logger.error("Notification failed (new_user_registered) for %s: %s", user.get("email"), e)

    return json_response({
        "success": True,
        "user": _strip_password_hash(user),
    })


# ── POST /api/users/signup ─────────────────────────────────────────
# Self-service email/password sign-up
@bp.route(route="users/signup", methods=["POST", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def user_signup(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_signup(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    try:
        if get_user_by_email(data["email"]):
            return error_response("Email already registered.", 409)

        user = create_user_with_password(data)
    except Exception as e:
        logger.error("Failed to sign up user: %s", e)
        return error_response("Failed to create account.", 500)

    try:
        notify_all_admins(
            "new_user_registered", "New User Registered",
            f"{user['display_name']} ({user['email']}) has joined QuickAid.",
        )
    except Exception as e:
        logger.error("Notification failed (new_user_registered) for %s: %s", user.get("email"), e)

    return json_response({
        "success": True,
        "user": _strip_password_hash(user),
    })


# ── POST /api/users/login_password ─────────────────────────────────
# Email/password sign-in
@bp.route(route="users/login_password", methods=["POST", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def user_login_password(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_password_login(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    try:
        user = verify_user_credentials(data["email"], data["password"])
    except Exception as e:
        logger.error("Failed to verify credentials: %s", e)
        return error_response("Failed to process sign-in.", 500)

    if not user:
        return error_response("Invalid email or password.", 401)

    return json_response({
        "success": True,
        "user": user,
    })


# ── GET /api/users ─────────────────────────────────────────────────
# Get user by email query param
@bp.route(route="users", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
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

        return json_response({"user": _strip_password_hash(user)})

    except Exception as e:
        logger.error("Failed to retrieve user for %s: %s", email, e)
        return error_response("Failed to retrieve user.", 500)


# ── GET /api/users/{userId} ────────────────────────────────────────
# Get user by user ID
@bp.route(route="users/{userId}", methods=["GET", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def get_user_by_id_endpoint(req: func.HttpRequest) -> func.HttpResponse:

    # Handle CORS preflight
    if req.method == "OPTIONS":
        return preflight_response()

    # Auth check: any logged-in user can look up user by ID
    user, err = require_role(req, ["user", "agent", "admin"])
    if err:
        return err

    user_id = req.route_params.get("userId")

    try:
        user = get_user_by_id(user_id)

        if not user:
            return error_response("User not found.", 404)

        return json_response({"user": _strip_password_hash(user)})

    except Exception as e:
        logger.error("Failed to retrieve user %s: %s", user_id, e)
        return error_response("Failed to retrieve user.", 500)
