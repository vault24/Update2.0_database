"""
Reusable, modular email service.

All outgoing application email goes through `send_branded_email`, which renders
the shared branded HTML template (`emails/generic.html`) and sends it via the
SMTP configuration in settings (server/.env). Sending is done on a background
thread so it never blocks the API response, with full error handling/logging.

Email categories:
  - "notification" (default): respects each user's Email Notifications
    preference — recipients who turned notifications off are silently skipped.
  - "security": OTP / password / verification emails. ALWAYS sent; the user
    preference can never disable these.
"""
import logging
import threading
from datetime import datetime

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _filter_opted_out(emails):
    """
    Drop addresses belonging to users who disabled email notifications.

    Addresses that don't match any user account (e.g. application contact
    emails) are kept — there is no preference to honour for them.
    """
    emails = [e for e in emails if e]
    if not emails:
        return []
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        # Compare case-insensitively; the opted-out set is small in practice.
        opted_out = {
            e.lower() for e in User.objects.filter(
                email_notifications_enabled=False,
            ).exclude(email='').values_list('email', flat=True)
        }
        if not opted_out:
            return emails
        return [e for e in emails if e.lower() not in opted_out]
    except Exception as exc:  # noqa: BLE001 - never let the filter break email
        logger.error("Email opt-out filter failed (sending unfiltered): %s", exc)
        return emails


_LOGO_CACHE = {"loaded": False, "bytes": None}


def _logo_bytes():
    """
    Institute logo bundled with the backend (apps/notifications/static/emails/
    spi-logo.png), embedded inline into every email so it renders even when
    the public site is unreachable. Cached after first read.
    """
    if not _LOGO_CACHE["loaded"]:
        _LOGO_CACHE["loaded"] = True
        try:
            import os
            path = os.path.join(os.path.dirname(__file__), 'static', 'emails', 'spi-logo.png')
            with open(path, 'rb') as fh:
                _LOGO_CACHE["bytes"] = fh.read()
        except Exception as exc:  # noqa: BLE001 - fall back to the hosted URL
            logger.warning("Email logo file unavailable, using hosted URL: %s", exc)
            _LOGO_CACHE["bytes"] = None
    return _LOGO_CACHE["bytes"]


def _institute_contact():
    """Institute support contact for the email footer (best-effort)."""
    from email.utils import parseaddr
    # DEFAULT_FROM_EMAIL may be in "Display Name <addr>" form — keep only the
    # address for the footer link.
    email = parseaddr(getattr(settings, 'DEFAULT_FROM_EMAIL', '') or '')[1]
    phone = ''
    try:
        from apps.system_settings.models import SystemSettings
        sys_settings = SystemSettings.objects.first()
        if sys_settings:
            email = sys_settings.institute_email or email
            phone = sys_settings.institute_phone or phone
    except Exception:  # noqa: BLE001 - footer contact must never break email
        pass
    return email, phone


def _deliver(subject, recipients, html_body, bcc=None, attachments=None, inline_logo=False):
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
        if inline_logo:
            logo = _logo_bytes()
            if logo:
                from email.mime.image import MIMEImage
                image = MIMEImage(logo, _subtype='png')
                image.add_header('Content-ID', '<sipi-logo>')
                image.add_header('Content-Disposition', 'inline', filename='spi-logo.png')
                message.attach(image)
                message.mixed_subtype = 'related'
        for attachment in attachments or []:
            try:
                filename, content, mimetype = attachment
                message.attach(filename, content, mimetype)
            except Exception as attach_err:  # noqa: BLE001
                logger.error("Skipping bad email attachment: %s", attach_err)
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
    category="notification",
    attachment_links=None,
    attachments=None,
    sections=None,
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
        category: "notification" (default, honours per-user email opt-out) or
            "security" (OTP/password emails — always sent).
        attachment_links: Optional list of {"name", "url"} rows rendered as
            downloadable links in the email body.
        attachments: Optional list of (filename, content_bytes, mimetype)
            tuples attached to the email itself.
        sections: Optional structured guidance blocks, each a dict with any of
            "title" (small heading), "lines" (paragraphs) and "bullets"
            (bulleted list). Used for detailed / bilingual instructions.
            (NB: the key is "bullets", not "items" — a dict key named "items"
            would clash with dict.items() in Django templates.)

    Returns:
        True if dispatched/sent, False if there was nothing to send.
    """
    recipients = [to] if isinstance(to, str) else list(to or [])
    recipients = [email for email in recipients if email]
    bcc = [email for email in (bcc or []) if email]

    # Honour each user's Email Notifications preference for non-security email.
    if category != "security":
        recipients = _filter_opted_out(recipients)
        bcc = _filter_opted_out(bcc)

    if not recipients and not bcc:
        logger.info("send_branded_email skipped '%s' - no recipients (after opt-out filter)", subject)
        return False

    # Bulk/BCC-only send: use the system address as the visible "To" so BCC
    # recipients never see each other's email addresses.
    if not recipients and bcc:
        recipients = [settings.DEFAULT_FROM_EMAIL]

    support_email, support_phone = _institute_contact()

    # Prefer the bundled logo embedded inline (renders offline); fall back to
    # the hosted URL when the file is unavailable.
    inline_logo = _logo_bytes() is not None
    logo_url = 'cid:sipi-logo' if inline_logo else getattr(settings, 'EMAIL_LOGO_URL', '')

    context = {
        "subject": subject,
        "brand_name": "SIPI",
        "brand_tagline": "Sirajganj Polytechnic Institute",
        "logo_url": logo_url,
        "support_email": support_email,
        "support_phone": support_phone,
        "sections": sections or [],
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
        "attachment_links": attachment_links or [],
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
            args=(subject, recipients, html_body, bcc, attachments, inline_logo),
            daemon=True,
        ).start()
        return True

    return _deliver(subject, recipients, html_body, bcc, attachments, inline_logo)
