"""
Web Push (VAPID) delivery.

Standard Web Push protocol via `pywebpush` — no Firebase/FCM dependency. Sends
a real OS-level push to every active subscription a user has (phone, laptop,
installed PWA) so notifications arrive whether the site is open or closed.

Everything here is best-effort and never raises into the caller: a failed push
must never break notification creation, the DB record, the websocket update, or
emails. Endpoints the push service reports as gone (404/410) are pruned so the
subscription table stays clean; transient failures are counted and the
subscription is retired after repeated failures.
"""
import json
import logging
import threading

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# Retire a subscription after this many consecutive transient failures.
MAX_FAILURES = 8

# Default notification presentation (overridable per-payload).
DEFAULT_ICON = "/icons/icon-192.png"
DEFAULT_BADGE = "/icons/icon-96.png"


def push_enabled() -> bool:
    """True when VAPID keys are configured."""
    return bool(getattr(settings, "VAPID_PRIVATE_KEY", "") and getattr(settings, "VAPID_PUBLIC_KEY", ""))


def _vapid_claims():
    # `aud` is filled in per-endpoint by pywebpush; we only supply the subject.
    return {"sub": getattr(settings, "VAPID_SUBJECT", "mailto:admin@spisg.gov.bd")}


def _deep_link_for(notification) -> str:
    """
    Best-effort destination URL for a tap, derived from the notification's
    type/data. Falls back to the notifications page. Kept in sync with the
    student portal's routes.
    """
    data = getattr(notification, "data", None) or {}
    ntype = getattr(notification, "notification_type", "") or ""

    if data.get("url"):
        return str(data["url"])
    if ntype == "notice_published" or data.get("notice_id"):
        return "/dashboard/notices"
    if ntype == "class_routine":
        return "/dashboard/routine"
    if ntype in ("application_status", "application_submitted"):
        return "/dashboard/applications"
    if ntype == "admission_complete":
        return "/dashboard/admission"
    if ntype == "attendance_update":
        return "/dashboard/attendance"
    return "/dashboard/notifications"


def build_payload_from_notification(notification) -> dict:
    """Translate a Notification row into the JSON the service worker expects."""
    data = getattr(notification, "data", None) or {}
    return {
        "title": getattr(notification, "title", "My SGPI"),
        "body": getattr(notification, "message", "") or "You have a new notification.",
        "url": _deep_link_for(notification),
        "tag": f"sipi-{getattr(notification, 'notification_type', 'general')}",
        "icon": data.get("icon") or DEFAULT_ICON,
        "badge": DEFAULT_BADGE,
        "image": data.get("image") or None,
        # A gentle double-buzz; the SW also sets a fallback pattern.
        "vibrate": data.get("vibrate") or [120, 60, 120],
        "renotify": True,
        "notificationId": getattr(notification, "id", None),
        "type": getattr(notification, "notification_type", None),
    }


# _send_one outcomes.
SENT = "sent"      # delivered — count it, keep the subscription
KEEP = "keep"      # transient failure — keep the subscription, not delivered
PRUNE = "prune"    # permanently gone — deactivate the subscription


def _send_one(subscription, payload_json: str) -> str:
    """
    Send to a single subscription. Returns one of SENT / KEEP / PRUNE so the
    caller can count real deliveries and prune only dead endpoints.
    """
    from pywebpush import webpush, WebPushException

    try:
        webpush(
            subscription_info=subscription.as_subscription_info(),
            data=payload_json,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims=dict(_vapid_claims()),
            ttl=60 * 60 * 24,  # keep for a day if the device is offline
        )
        # Success — reset failure counter, stamp last used.
        subscription.failure_count = 0
        subscription.last_used_at = timezone.now()
        subscription.save(update_fields=["failure_count", "last_used_at"])
        return SENT
    except WebPushException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        if status in (404, 410):
            # Subscription is permanently gone — remove it.
            logger.info("Pruning dead push subscription %s (HTTP %s)", subscription.pk, status)
            return PRUNE
        # Transient (network, 5xx, rate limit) — count it, retire if chronic.
        subscription.failure_count = (subscription.failure_count or 0) + 1
        prune = subscription.failure_count >= MAX_FAILURES
        subscription.save(update_fields=["failure_count"])
        logger.warning(
            "Web push to sub %s failed (HTTP %s, failures=%s): %s",
            subscription.pk, status, subscription.failure_count, exc,
        )
        return PRUNE if prune else KEEP
    except Exception as exc:  # noqa: BLE001
        # Encryption/format errors etc. Count as a failure so a permanently
        # broken subscription is eventually retired, but don't prune on the
        # first unknown error.
        subscription.failure_count = (subscription.failure_count or 0) + 1
        prune = subscription.failure_count >= MAX_FAILURES
        subscription.save(update_fields=["failure_count"])
        logger.error("Unexpected web push error for sub %s: %s", subscription.pk, exc)
        return PRUNE if prune else KEEP


def send_web_push_to_user(user, payload: dict) -> int:
    """
    Send `payload` to all of a user's active subscriptions.
    Returns the number of successful sends. Never raises.
    """
    if not push_enabled() or user is None:
        return 0
    try:
        from .models import WebPushSubscription

        subs = list(WebPushSubscription.objects.filter(user=user, is_active=True))
        if not subs:
            return 0

        payload_json = json.dumps(payload)
        sent, to_disable = 0, []
        for sub in subs:
            result = _send_one(sub, payload_json)
            if result == SENT:
                sent += 1
            elif result == PRUNE:
                to_disable.append(sub.pk)
            # KEEP: kept but not delivered — neither counted nor pruned.

        if to_disable:
            WebPushSubscription.objects.filter(pk__in=to_disable).update(is_active=False)
        return sent
    except Exception as exc:  # noqa: BLE001
        logger.error("send_web_push_to_user failed for user %s: %s", getattr(user, "id", None), exc)
        return 0


def _threaded_send(user, payload: dict) -> None:
    """Background worker: send, then release this thread's DB connection."""
    try:
        send_web_push_to_user(user, payload)
    except Exception as exc:  # noqa: BLE001
        logger.error("Threaded web push failed: %s", exc)
    finally:
        # This thread opened its own DB connection (subscription lookups/updates);
        # close it so we don't leak connections under load.
        try:
            from django.db import connection
            connection.close()
        except Exception:  # noqa: BLE001
            pass


def send_push_for_notification(notification) -> None:
    """
    Build the payload from a Notification and push it to the recipient on a
    background daemon thread (fire-and-forget), mirroring the async email path.
    This keeps the request fast even when a notice fans out to many recipients:
    each push is a network POST to an external push service and must never block
    the admin's publish request.
    """
    if notification is None or not push_enabled():
        return
    try:
        payload = build_payload_from_notification(notification)
        recipient = notification.recipient  # resolve FK in the caller's thread
    except Exception as exc:  # noqa: BLE001
        logger.error("send_push_for_notification (build) failed: %s", exc)
        return
    threading.Thread(target=_threaded_send, args=(recipient, payload), daemon=True).start()
