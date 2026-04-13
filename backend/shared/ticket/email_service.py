"""
    Handles all outgoing emails via SendGrid.
    
    Emails:
    - send_ticket_confirmation_email  = user submits a ticket
    - send_status_update_email = ticket status changes
    - send_assignment_notification_email = ticket assigned to staff
"""

import os
import logging

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, To, From

logger = logging.getLogger(__name__)

# SendGrid client
def _send_email(to_email: str, subject: str, html_content: str) -> bool:
    try:
        message = Mail(
            from_mail = From(_FROM_EMAIL, _FROM_NAME),
            to_emails = To(to_email),
            subject = subject,
            html_content = html_content
        )
    
        client = SendGridAPIClient(_SENDGRID_API_KEY)
        response = client.send(message)
    
        if response.status_code == 202:
            logger.info(
                "Email sent to %s - subject %s", 
                to_email, subject
            )
            return True
        else:
            logger.warning(
                "Unexpected SendGrid status %s for %s",
                response.status_code, to_email
            )
            return False
    
    except Exception as e:
        logger.error(
            "Failed to send email to %s: %s",
            to_email, e
        )
        return False
        

# ── Ticket Confirmation Email ───────────────────────────────────
# Sent to user after they submit a ticket   
def send_confirmation_email(to_email: str, ticket_id: str, subject: str):
    
    # TODO: Implement SendGrid integration
    logger.info(
        "Confirmation email would be sent to %s for ticket %s: %s",
        to_email, ticket_id, subject
    )


# ── Ticket Status Update Email ──────────────────────────────────────────
# Sent to user when their ticket status changes
def send_status_update_emal() -> bool: 
    return True

# ── Assignment Notification Email ───────────────────────────────
# Sent to staff member when a ticket is assigned to them
def send_assignment_notification_email() -> bool:
    return True
