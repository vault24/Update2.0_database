"""
Reusable, modular email service.

All outgoing application email goes through `send_branded_email`, which renders
the shared branded HTML template (`emails/generic.html`) and sends it via the
SMTP configuration in settings (server/.env). Sending is done on a background
thread so it never blocks the API response, with full error handling/logging.
"""
import logging
import threading
from datetime import datetime

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _deliver(subject, recipients, html_body, bcc=None):
    """Actually send the email (runs on a worker thread)."""
    try:
        text_body = strip_tags(html_body)
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipients,
            bcc=bcc or None,
        )
        message.attach_alternative(html_body, "text/html")
        message.send(fail_silently=False)
        audience = ", ".join(recipients) + (f" (+{len(bcc)} bcc)" if bcc else "")
        logger.info("Email sent: '%s' -> %s", subject, audience)
        return True
    except Exception as exc:  # noqa: BLE001 - we never want email to crash a request
        logger.error("Failed to send email '%s' to %s: %s", subject, recipients, exc)
        return False


def send_branded_email(
    subject,
    to,
    *,
    heading,
    greeting=None,
    intro=None,
    body_lines=None,
    details=None,
    highlight=None,
    cta_label=None,
    cta_url=None,
    accent_label=None,
    accent_color="#2563eb",
    accent_soft="#eff6ff",
    closing=None,
    preheader=None,
    footer_note=None,
    bcc=None,
    async_send=True,
):
    """
    Render and send a branded HTML email.

    Args:
        subject: Email subject line.
        to: A single email string or an iterable of email strings.
        heading: Main heading shown in the email body.
        greeting/intro/body_lines: Body copy. `body_lines` is a list of paragraphs.
        details: Optional list of {"label", "value"} rows rendered as a table.
        highlight: Optional emphasised block (e.g. an OTP code).
        cta_label/cta_url: Optional call-to-action button.
        accent_label/accent_color/accent_soft: Optional category pill + theming.
        async_send: Send on a background thread (default True).

    Returns:
        True if dispatched/sent, False if there was nothing to send.
    """
    recipients = [to] if isinstance(to, str) else list(to or [])
    recipients = [email for email in recipients if email]
    bcc = [email for email in (bcc or []) if email]
    if not recipients and not bcc:
        logger.warning("send_branded_email skipped '%s' - no valid recipients", subject)
        return False

    # Bulk/BCC-only send: use the system address as the visible "To" so BCC
    # recipients never see each other's email addresses.
    if not recipients and bcc:
        recipients = [settings.DEFAULT_FROM_EMAIL]

    context = {
        "subject": subject,
        "brand_name": "SIPI",
        "brand_tagline": "Sirajganj Polytechnic Institute",
        "heading": heading,
        "greeting": greeting,
        "intro": intro,
        "body_lines": body_lines or [],
        "details": details or [],
        "highlight": highlight,
        "cta_label": cta_label,
        "cta_url": cta_url,
        "accent_label": accent_label,
        "accent_color": accent_color,
        "accent_soft": accent_soft,
        "closing": closing,
        "preheader": preheader,
        "footer_note": footer_note,
        "year": datetime.now().year,
    }

    try:
        html_body = render_to_string("emails/generic.html", context)
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to render email template for '%s': %s", subject, exc)
        return False

    if async_send:
        threading.Thread(
            target=_deliver,
            args=(subject, recipients, html_body, bcc),
            daemon=True,
        ).start()
        return True

    return _deliver(subject, recipients, html_body, bcc)
