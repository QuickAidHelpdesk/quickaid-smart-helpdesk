"""
    Handles all outgoing emails via SendGrid.
    
    Emails:
    - send_ticket_confirmation_email  = user submits a ticket
    - send_status_update_email = ticket status changes
    - send_assignment_notification_email = ticket assigned to staff
    
    All three share a single base HTML template:
        shared/email_templates/base_email_template.html
"""

import os
import logging
from pathlib import Path

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, To, From

from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

# ── Template loader 
_TEMPLATE_DIR = Path(__file__).parent.parent / "email_templates" / "ticket"
_TEMPLATE_FILE = "ticket_email_template.html"

_jinja_env = Environment(
    loader = FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape = True,
)

# ── Render base template file to given variables
def _render_template(**kwargs) -> str:
    template = _jinja_env.get_template(_TEMPLATE_FILE)
    return template.render(**kwargs)


# ── SendGrid client
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
        

# ── Ticket Confirmation Email
# Sent to user after they submit a ticket   
def send_confirmation_email(to_email: str, ticket):
    
    subject = f"[QuickAid] Ticket Received — {ticket.ticket_id}"
    
    html_content = _render_template(
        ticket = ticket,
        header_title = "Your Ticket Has Been Received",
        body_message = (
            "Thank you for contacting QuickAid support. "
            "We have received your ticket and will get back to you shortly."
        ),
        footer_note = "Reply to this ticket from your QuickAid dashboard.",
        show_status = True,
        show_assigned_to = False
    )
    
    return _send_email(to_email, subject, html_content)


# ── Ticket Status Update Email 
# Sent to user when their ticket status changes
def send_status_update_emal(to_email: str, ticket) -> bool: 
    
    subject = f"[QuickAid] Ticket Update — {ticket.ticket_id}"
    
    html_content = _render_template(
        ticket = ticket,
        header_title = "Your Ticket Has Been Updated",
        body_message = (
            f"Your ticket status has changed to "
            f"<strong>{ticket.status}</strong>. "
            "We will continue to keep you informed of any further updates."
        ),
        footer_note = "Reply to this ticket from your QuickAid dashboard.",
        show_status = True,
        show_assigned_to = False
    )
    
    return _send_email(to_email, subject, html_content)


# ── Assignment Notification Email 
# Sent to staff member when a ticket is assigned to them
def send_assignment_notification_email(to_email: str, ticket) -> bool:
    
    subject = f"[QuickAid] Ticket Assigned to You — {ticket.ticket_id}"
    
    html_content = _render_template(
        ticket = ticket,
        header_title = "A Ticket Has Been Assigned to You",
        body_message = (
            f"You have been assigned ticket <strong>{ticket.ticket_id}</strong>. "
            "Please review the details below and respond as soon as possible."
        ),
        footer_note = "Log in to your QuickAid dashboard to manage this ticket.",
        show_status = True,
        show_assigned_to = False
    )
    
    return _send_email(to_email, subject, html_content)
