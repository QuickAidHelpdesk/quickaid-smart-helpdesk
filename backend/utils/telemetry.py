"""
Application Insights telemetry helpers (FR-11-01, FR-11-02).

configure_monitoring() runs once at app startup and enables
OpenTelemetry-based auto-instrumentation for requests, logs,
and outbound HTTP dependencies (Cosmos DB).

track_event() emits a named custom event with properties so that
business-level lifecycle signals (ticket submitted, status changed,
assigned) appear under `customEvents` in Application Insights.
"""

import logging
import os

logger = logging.getLogger(__name__)

_configured = False


def configure_monitoring() -> None:
    global _configured
    if _configured:
        return

    conn = os.environ.get("APPLICATIONINSIGHTS_CONNECTION_STRING")
    if not conn:
        logger.info(
            "APPLICATIONINSIGHTS_CONNECTION_STRING not set; telemetry disabled."
        )
        _configured = True
        return

    try:
        from azure.monitor.opentelemetry import configure_azure_monitor

        configure_azure_monitor(connection_string=conn)
        logger.info("Azure Monitor OpenTelemetry configured.")
    except Exception as e:
        logger.error("Failed to configure Azure Monitor: %s", e)
    finally:
        _configured = True


def track_event(name: str, properties: dict | None = None) -> None:
    """
    Emit a named custom event to Application Insights.

    Uses the OpenTelemetry logging exporter configured by
    configure_azure_monitor(); events are surfaced as rows in the
    `customEvents` table with `customDimensions` containing properties.
    """
    props = properties or {}
    try:
        logger.info(
            "AppEvent: %s",
            name,
            extra={"custom_dimensions": {"event_name": name, **props}},
        )
    except Exception as e:
        logger.warning("track_event failed for %s: %s", name, e)
