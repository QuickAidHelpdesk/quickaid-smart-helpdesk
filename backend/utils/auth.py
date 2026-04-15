"""
Role-based access control helper.
Validates that the requesting user has the required role
by looking up their email in the users container.
"""

import logging

import azure.functions as func

from shared.user.user_service import get_user_by_email
from utils.http_helpers import error_response

logger = logging.getLogger(__name__)


def require_role(
    req: func.HttpRequest, allowed_roles: list[str]
) -> tuple[dict | None, func.HttpResponse | None]:
    """
    Check that the request comes from a user with one of the allowed roles.

    Reads the X-User-Email header, looks up the user in Cosmos DB,
    and verifies their role.

    Returns:
        (user_dict, None) if authorized.
        (None, error_response) if not.
    """
    email = req.headers.get("X-User-Email")
    if not email:
        return None, error_response("X-User-Email header is required.", 401)

    try:
        user = get_user_by_email(email)
    except Exception as e:
        logger.error("Failed to look up user %s: %s", email, e)
        return None, error_response("Failed to verify user.", 500)

    if not user:
        return None, error_response("User not found.", 401)

    if user.get("role") not in allowed_roles:
        return None, error_response(
            f"Forbidden. Required role: {', '.join(allowed_roles)}.", 403
        )

    return user, None
