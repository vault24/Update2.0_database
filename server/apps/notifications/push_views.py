"""
Web Push subscription API.

  GET  /api/push/vapid-public-key/   -> public VAPID key (public by design)
  POST /api/push/subscribe/          -> register/refresh this device's subscription
  POST /api/push/unsubscribe/        -> deactivate a subscription by endpoint
  POST /api/push/test/               -> send a test push to the current user

Session-cookie auth + CSRF, same as the rest of the API.
"""
import logging

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import WebPushSubscription
from .push_service import push_enabled, send_web_push_to_user

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def vapid_public_key(request):
    """Return the server's VAPID public (application server) key.

    Public by design — the browser needs it to create a subscription. Returns
    enabled:false when push isn't configured so the client can degrade quietly.
    """
    return Response({
        "enabled": push_enabled(),
        "public_key": getattr(settings, "VAPID_PUBLIC_KEY", "") or None,
    })


def _extract_subscription(payload):
    """Accept both the raw PushSubscription.toJSON() shape and a nested one."""
    if not isinstance(payload, dict):
        return None
    endpoint = payload.get("endpoint")
    keys = payload.get("keys") or {}
    p256dh = keys.get("p256dh") or payload.get("p256dh")
    auth = keys.get("auth") or payload.get("auth")
    if not (endpoint and p256dh and auth):
        return None
    return endpoint, p256dh, auth


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def subscribe(request):
    """Register or refresh the caller's push subscription (idempotent upsert).

    Keyed on the unique endpoint. If the endpoint already exists it is re-bound
    to the current user and re-activated (handles account switching on a shared
    device and token refresh).
    """
    if not push_enabled():
        return Response({"detail": "Push is not configured on the server."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    parsed = _extract_subscription(request.data)
    if not parsed:
        return Response({"detail": "Invalid subscription payload."},
                        status=status.HTTP_400_BAD_REQUEST)
    endpoint, p256dh, auth = parsed
    user_agent = (request.META.get("HTTP_USER_AGENT") or "")[:400]

    sub, created = WebPushSubscription.objects.update_or_create(
        endpoint=endpoint,
        defaults={
            "user": request.user,
            "p256dh": p256dh,
            "auth": auth,
            "user_agent": user_agent,
            "is_active": True,
            "failure_count": 0,
        },
    )
    logger.info("Push subscription %s for user %s", "created" if created else "refreshed", request.user.id)
    return Response({"success": True, "created": created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unsubscribe(request):
    """Deactivate a subscription by endpoint (best-effort; always 200)."""
    endpoint = (request.data or {}).get("endpoint")
    if endpoint:
        WebPushSubscription.objects.filter(endpoint=endpoint).update(is_active=False)
    return Response({"success": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_test(request):
    """Send a test push to the current user's devices (verification helper)."""
    if not push_enabled():
        return Response({"detail": "Push is not configured on the server."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)
    sent = send_web_push_to_user(request.user, {
        "title": "My SGPI — Test notification",
        "body": "If you can see this, push notifications are working.",
        "url": "/dashboard/notifications",
        "tag": "sipi-test",
        "vibrate": [120, 60, 120],
        "renotify": True,
    })
    return Response({"success": sent > 0, "sent": sent})
