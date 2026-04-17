"""
Email Service — sends transactional emails via Azure Communication Services.
Handles: ticket confirmation (FR-03-01), status updates (FR-05-01),
         and staff assignment notifications (FR-09-01).
"""

import logging
import os

from azure.communication.email import EmailClient

logger = logging.getLogger(__name__)


def _get_email_client() -> EmailClient:
    """Create an EmailClient from the connection string (FR-03-02)."""
    conn_str = os.environ["EMAIL_CONNECTION_STRING"]
    return EmailClient.from_connection_string(conn_str)


def _get_sender() -> str:
    """Return the verified sender address."""
    return os.environ["EMAIL_SENDER_ADDRESS"]


def _send_email(to_email: str, subject: str, html_body: str) -> None:
    """Send an email and poll until the operation completes."""
    sender = _get_sender()
    logger.warning("EMAIL_DEBUG: _send_email called — to=%s, sender=%s, subject=%s", to_email, sender, subject)

    client = _get_email_client()
    logger.warning("EMAIL_DEBUG: EmailClient created successfully")

    message = {
        "senderAddress": sender,
        "recipients": {
            "to": [{"address": to_email}],
        },
        "content": {
            "subject": subject,
            "html": html_body,
        },
    }

    poller = client.begin_send(message)
    logger.warning("EMAIL_DEBUG: begin_send called, waiting for result...")
    result = poller.result()
    logger.warning("EMAIL_DEBUG: Email sent to %s — operation id: %s, status: %s",
                to_email, result["id"], result["status"])


# ── FR-03-01 / FR-03-03: Ticket submission confirmation ────────────
def send_confirmation_email(
    to_email: str, ticket_id: str, subject: str,
    category: str = "", priority: str = "", description: str = ""
) -> None:
    """Send ticket submission confirmation email (FR-03-01).
    Includes ticket ID, subject, category, priority, summary (FR-03-03)."""

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px;">QuickAid — Ticket Confirmation</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb;">
            <p>Your helpdesk ticket has been submitted successfully.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                    <td style="padding: 8px 12px; font-weight: bold; background: #e5e7eb;">Ticket ID</td>
                    <td style="padding: 8px 12px; background: #ffffff;">{ticket_id}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; font-weight: bold; background: #e5e7eb;">Subject</td>
                    <td style="padding: 8px 12px; background: #ffffff;">{subject}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; font-weight: bold; background: #e5e7eb;">Category</td>
                    <td style="padding: 8px 12px; background: #ffffff;">{category}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; font-weight: bold; background: #e5e7eb;">Priority</td>
                    <td style="padding: 8px 12px; background: #ffffff;">{priority}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; font-weight: bold; background: #e5e7eb;">Description</td>
                    <td style="padding: 8px 12px; background: #ffffff;">{description}</td>
                </tr>
            </table>
            <p style="color: #6b7280; font-size: 14px;">
                Our support team will review your ticket shortly.
                You will receive another email when the status of your ticket changes.
            </p>
        </div>
        <div style="padding: 12px; text-align: center; color: #9ca3af; font-size: 12px;">
            QuickAid Smart Campus Helpdesk
        </div>
    </div>
    """

    _send_email(to_email, f"[{ticket_id}] Ticket Received — {subject}", html)
    logger.info("Confirmation email sent to %s for ticket %s", to_email, ticket_id)


# ── FR-05-01: Status update notification ───────────────────────────
def send_status_update_email(
    to_email: str, ticket_id: str, new_status: str
) -> None:
    """Send ticket status update notification email (FR-05-01)."""

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px;">QuickAid — Status Update</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb;">
            <p>The status of your ticket has been updated.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                    <td style="padding: 8px 12px; font-weight: bold; background: #e5e7eb;">Ticket ID</td>
                    <td style="padding: 8px 12px; background: #ffffff;">{ticket_id}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; font-weight: bold; background: #e5e7eb;">New Status</td>
                    <td style="padding: 8px 12px; background: #ffffff; font-weight: bold;">{new_status}</td>
                </tr>
            </table>
            <p style="color: #6b7280; font-size: 14px;">
                If you have any questions, please contact the helpdesk.
            </p>
        </div>
        <div style="padding: 12px; text-align: center; color: #9ca3af; font-size: 12px;">
            QuickAid Smart Campus Helpdesk
        </div>
    </div>
    """

    _send_email(to_email, f"[{ticket_id}] Status Updated — {new_status}", html)
    logger.info("Status update email sent to %s for ticket %s: %s",
                to_email, ticket_id, new_status)


# ── FR-09-01: Assignment notification to staff ─────────────────────
def send_assignment_email(
    to_email: str, ticket_id: str, subject: str
) -> None:
    """Send ticket assignment notification email to staff (FR-09-01)."""

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px;">QuickAid — New Ticket Assigned</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb;">
            <p>A new ticket has been assigned to you.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                    <td style="padding: 8px 12px; font-weight: bold; background: #e5e7eb;">Ticket ID</td>
                    <td style="padding: 8px 12px; background: #ffffff;">{ticket_id}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; font-weight: bold; background: #e5e7eb;">Subject</td>
                    <td style="padding: 8px 12px; background: #ffffff;">{subject}</td>
                </tr>
            </table>
            <p style="color: #6b7280; font-size: 14px;">
                Please log in to the Staff Portal to review and manage this ticket.
            </p>
        </div>
        <div style="padding: 12px; text-align: center; color: #9ca3af; font-size: 12px;">
            QuickAid Smart Campus Helpdesk
        </div>
    </div>
    """

    _send_email(to_email, f"[{ticket_id}] Ticket Assigned — {subject}", html)
    logger.info("Assignment email sent to %s for ticket %s", to_email, ticket_id)
