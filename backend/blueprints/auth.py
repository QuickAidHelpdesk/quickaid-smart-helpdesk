"""
Auth Blueprint — email + password authentication (alongside Entra ID).
API:
  POST /api/auth/register - Create a new student account with email + password
  POST /api/auth/login    - Authenticate an existing account with email + password
"""

import logging
import bcrypt
import azure.functions as func

from shared.user.user_service import (
    create_user,
    get_user_by_email,
    public_user,
)
from shared.user.validator import (
    validate_password_registration,
    validate_password_login,
)
from utils.http_helpers import (
    error_response,
    json_response,
    preflight_response,
)

bp = func.Blueprint()
logger = logging.getLogger(__name__)


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ── POST /api/auth/register ────────────────────────────────────────
# Create a new account with email + password. Self-signups are always `student`.
@bp.route(route="auth/register", methods=["POST", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def auth_register(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_password_registration(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    email = data["email"].strip().lower()

    try:
        existing = get_user_by_email(email)
    except Exception as e:
        logger.error("Failed to check existing user for %s: %s", email, e)
        return error_response("Failed to create account.", 500)

    if existing:
        if existing.get("password_hash"):
            return error_response("An account with this email already exists.", 409)
        return error_response(
            "This email is already registered via Microsoft sign-in. Please continue with Microsoft.",
            409,
        )

    password_hash = _hash_password(data["password"])

    try:
        user = create_user(
            {
                "display_name": data["display_name"],
                "email": email,
                "role": "student",
            },
            password_hash=password_hash,
        )
    except Exception as e:
        logger.error("Failed to create account for %s: %s", email, e)
        return error_response("Failed to create account.", 500)

    return json_response({"success": True, "user": public_user(user)}, 201)


# ── POST /api/auth/login ───────────────────────────────────────────
# Authenticate an account using email + password.
@bp.route(route="auth/login", methods=["POST", "OPTIONS"], auth_level=func.AuthLevel.ANONYMOUS)
def auth_login(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "OPTIONS":
        return preflight_response()

    try:
        data = req.get_json()
    except ValueError:
        return error_response("Invalid JSON format.")

    errors = validate_password_login(data)
    if errors:
        return json_response({"error": "Validation failed", "details": errors}, 400)

    email = data["email"].strip().lower()
    password = data["password"]

    try:
        user = get_user_by_email(email)
    except Exception as e:
        logger.error("Failed to look up user for %s: %s", email, e)
        return error_response("Failed to sign in.", 500)

    password_hash = user.get("password_hash") if user else None
    if not user or not password_hash or not _verify_password(password, password_hash):
        return error_response("Invalid email or password.", 401)

    return json_response({"success": True, "user": public_user(user)})
