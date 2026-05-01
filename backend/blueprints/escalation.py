"""
Escalation Blueprint — timer-triggered auto-escalation of stale Open tickets.

Schedule comes from the ESCALATION_TIMER_SCHEDULE app setting (NCRONTAB),
and the staleness threshold from ESCALATION_DAYS_THRESHOLD. See
shared/ticket/escalation_service.py for the per-ticket logic.
"""

import logging

import azure.functions as func

from shared.ticket.escalation_service import escalate_stale_tickets

bp = func.Blueprint()
logger = logging.getLogger(__name__)


@bp.timer_trigger(
    arg_name="timer",
    schedule="%ESCALATION_TIMER_SCHEDULE%",
    run_on_startup=False,
    use_monitor=True,
)
def escalation_timer(timer: func.TimerRequest) -> None:
    if timer.past_due:
        logger.warning("Escalation timer is past due.")

    try:
        summary = escalate_stale_tickets()
        logger.info("Escalation timer finished: %s", summary)
    except Exception as e:
        logger.exception("Escalation timer crashed: %s", e)
