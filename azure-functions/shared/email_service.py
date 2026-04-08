"""
Email notification service — replaces Django notifications app.
Sends emails via SendGrid and logs to Cosmos DB email_logs container.
"""

import logging
import os
import uuid
from datetime import datetime, timezone

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from .cosmos_client import EMAIL_LOGS_CONTAINER, create_item

logger = logging.getLogger(__name__)


def _get_sendgrid_client() -> SendGridAPIClient:
    """Create a SendGrid client using the API key from environment."""
    api_key = os.environ["SENDGRID_API_KEY"]
    return SendGridAPIClient(api_key)


def _get_from_email() -> str:
    """Return the sender email address."""
    return os.environ.get("SENDGRID_FROM_EMAIL", "noreply@quickaid.com")


def _log_email(
    ticket_id: str,
    recipient_email: str,
    email_type: str,
    sendgrid_message_id: str = None,
    delivery_status: str = "sent",
):
    """Create an EmailLog record in Cosmos DB."""
    log = {
        "id": str(uuid.uuid4()),
        "log_id": str(uuid.uuid4()),
        "ticket_id": ticket_id,
        "recipient_email": recipient_email,
        "email_type": email_type,
        "sendgrid_message_id": sendgrid_message_id,
        "status": delivery_status,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    create_item(EMAIL_LOGS_CONTAINER, log)


def send_ticket_confirmation_email(ticket: dict):
    """Send confirmation email to submitter after ticket creation."""
    try:
        message = Mail(
            from_email=_get_from_email(),
            to_emails=ticket["user_email"],
            subject=f"QuickAid — Ticket {ticket['ticket_id']} Created",
            html_content=f"""
            <h2>Your ticket has been submitted successfully!</h2>
            <p><strong>Ticket ID:</strong> {ticket['ticket_id']}</p>
            <p><strong>Subject:</strong> {ticket['subject']}</p>
            <p><strong>Category:</strong> {ticket['category']}</p>
            <p><strong>Priority:</strong> {ticket['priority']}</p>
            <p><strong>Description:</strong> {ticket['description']}</p>
            <br>
            <p>You will receive email notifications when your ticket status changes.</p>
            <p>— QuickAid Smart Campus Helpdesk</p>
            """,
        )
        sg = _get_sendgrid_client()
        response = sg.send(message)
        msg_id = response.headers.get("X-Message-Id", "")

        _log_email(
            ticket["ticket_id"], ticket["user_email"],
            "confirmation", msg_id, "sent",
        )
        logger.info("Confirmation email sent for %s", ticket["ticket_id"])

    except Exception as e:
        logger.error("Failed to send confirmation email: %s", str(e))
        _log_email(
            ticket["ticket_id"], ticket["user_email"],
            "confirmation", None, "failed",
        )


def send_status_update_email(ticket: dict, previous_status: str, new_status: str):
    """Send status change notification to submitter."""
    try:
        message = Mail(
            from_email=_get_from_email(),
            to_emails=ticket["user_email"],
            subject=f"QuickAid — Ticket {ticket['ticket_id']} Status Updated",
            html_content=f"""
            <h2>Your ticket status has been updated</h2>
            <p><strong>Ticket ID:</strong> {ticket['ticket_id']}</p>
            <p><strong>Subject:</strong> {ticket['subject']}</p>
            <p><strong>Previous Status:</strong> {previous_status}</p>
            <p><strong>New Status:</strong> {new_status}</p>
            <br>
            <p>— QuickAid Smart Campus Helpdesk</p>
            """,
        )
        sg = _get_sendgrid_client()
        response = sg.send(message)
        msg_id = response.headers.get("X-Message-Id", "")

        _log_email(
            ticket["ticket_id"], ticket["user_email"],
            "status_update", msg_id, "sent",
        )
        logger.info("Status update email sent for %s", ticket["ticket_id"])

    except Exception as e:
        logger.error("Failed to send status update email: %s", str(e))
        _log_email(
            ticket["ticket_id"], ticket["user_email"],
            "status_update", None, "failed",
        )


def send_assignment_notification_email(ticket: dict, assigned_to_user: dict):
    """Send assignment notification to the support staff member."""
    try:
        message = Mail(
            from_email=_get_from_email(),
            to_emails=assigned_to_user["email"],
            subject=f"QuickAid — Ticket {ticket['ticket_id']} Assigned to You",
            html_content=f"""
            <h2>A new ticket has been assigned to you</h2>
            <p><strong>Ticket ID:</strong> {ticket['ticket_id']}</p>
            <p><strong>Subject:</strong> {ticket['subject']}</p>
            <p><strong>Category:</strong> {ticket['category']}</p>
            <p><strong>Priority:</strong> {ticket['priority']}</p>
            <p><strong>Description:</strong> {ticket['description']}</p>
            <p><strong>Submitted by:</strong> {ticket['user_display_name']} ({ticket['user_email']})</p>
            <br>
            <p>Please log in to the support portal to manage this ticket.</p>
            <p>— QuickAid Smart Campus Helpdesk</p>
            """,
        )
        sg = _get_sendgrid_client()
        response = sg.send(message)
        msg_id = response.headers.get("X-Message-Id", "")

        _log_email(
            ticket["ticket_id"], assigned_to_user["email"],
            "assignment", msg_id, "sent",
        )
        logger.info("Assignment email sent for %s", ticket["ticket_id"])

    except Exception as e:
        logger.error("Failed to send assignment email: %s", str(e))
        _log_email(
            ticket["ticket_id"], assigned_to_user["email"],
            "assignment", None, "failed",
        )
