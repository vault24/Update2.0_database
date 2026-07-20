"""
Authentication signals.

A single ``user_logged_in`` receiver auto-cancels any pending student-deletion
request when the student logs into their own portal. Because every login path
(password, 2FA verify, Google) ultimately calls ``django.contrib.auth.login``,
this one hook covers them all — no per-view changes needed.
"""
import logging

from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(user_logged_in)
def cancel_pending_deletion_on_login(sender, request, user, **kwargs):
    """If this user's student is scheduled for deletion, cancel it on login."""
    # Only student-side accounts can own a student-deletion request.
    if getattr(user, 'role', None) not in ('student', 'captain'):
        return
    try:
        from apps.students.deletion_service import cancel_student_deletion
        cancelled = cancel_student_deletion(user=user, reason='student_login')
        if cancelled:
            logger.info(
                'Auto-cancelled scheduled deletion for student %s on login by user %s',
                cancelled.student_id, user.id,
            )
    except Exception:  # noqa: BLE001 - a cancel failure must never block login
        logger.exception('Failed to auto-cancel deletion on login for user %s', getattr(user, 'id', None))
