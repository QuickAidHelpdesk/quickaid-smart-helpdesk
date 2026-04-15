import logging

logger = logging.getLogger(__name__)


def send_confirmation_email(to_email: str, ticket_id: str, subject: str):
    """Send ticket submission confirmation email via SendGrid."""
    # TODO: Implement SendGrid integration
    logger.info(
        "Confirmation email would be sent to %s for ticket %s: %s",
        to_email, ticket_id, subject
    )


def send_status_update_email(to_email: str, ticket_id: str, new_status: str):
    """Send ticket status update notification email via SendGrid (FR-08-03)."""
    # TODO: Implement SendGrid integration
    logger.info(
        "Status update email would be sent to %s for ticket %s: status changed to %s",
        to_email, ticket_id, new_status
    )


def send_assignment_email(to_email: str, ticket_id: str, subject: str):
    """Send ticket assignment notification email to staff via SendGrid (FR-09-01)."""
    # TODO: Implement SendGrid integration
    logger.info(
        "Assignment email would be sent to %s for ticket %s: %s",
        to_email, ticket_id, subject
    )
