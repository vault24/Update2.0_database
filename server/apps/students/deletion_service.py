"""
Student soft-delete / permanent-purge service.

The admin "Delete Account" flow never destroys data immediately. It schedules a
:class:`~apps.students.models.StudentDeletionRequest` with a 7-day recovery
window (the account stays fully usable). Three things act on that request:

  * a student login auto-cancels it (apps.authentication.signals),
  * an admin can cancel it manually (StudentViewSet.account_cancel_delete),
  * the ``purge_pending_deletions`` command permanently removes everything once
    the window elapses.

This module owns all three transitions plus the actual cascade delete, so the
API views, the login signal and the cron command share one implementation.
"""
import logging

from django.db import transaction
from django.utils import timezone

from .models import Student, StudentDeletionRequest
from .account_service import find_portal_account

logger = logging.getLogger(__name__)


def _find_all_portal_accounts(student):
    """Every student-side login belonging to this person (usually one)."""
    from django.contrib.auth import get_user_model
    from django.db.models import Q

    User = get_user_model()
    match = Q(related_profile_id=student.id)
    email = (getattr(student, 'email', '') or '').strip()
    if email:
        match |= Q(email__iexact=email)
    return list(User.objects.filter(match, role__in=['student', 'captain']))


def schedule_student_deletion(student, *, actor=None):
    """
    Schedule (or re-schedule) the student for deletion after the recovery window.

    Leaves the account fully usable; the student can undo it simply by logging
    in. Best-effort: notify the student in-app and by email so they know.

    Returns the (pending) StudentDeletionRequest.
    """
    portal_user = find_portal_account(student)
    purge_at = timezone.now() + timezone.timedelta(days=StudentDeletionRequest.RECOVERY_DAYS)

    req, _created = StudentDeletionRequest.objects.update_or_create(
        student=student,
        defaults={
            'user_id': portal_user.id if portal_user else None,
            'requested_by': actor if getattr(actor, 'pk', None) else None,
            'purge_at': purge_at,
            'status': 'pending',
            'cancel_reason': '',
            'cancelled_at': None,
        },
    )
    # update_or_create won't reset auto_now_add requested_at on an existing row;
    # keep the schedule honest by anchoring purge_at to "now" (already done above).

    _notify_student_scheduled(student, portal_user, req)
    logger.info('Student %s scheduled for deletion (purge_at=%s)', student.id, purge_at)
    return req


def cancel_student_deletion(*, student=None, user=None, reason='admin'):
    """
    Cancel a pending deletion request for a student or portal user.

    Matched by student, by the request's captured ``user_id``, or by the user's
    ``related_profile_id`` so a login always finds it. Returns the cancelled
    request, or None when there was nothing pending.
    """
    from django.db.models import Q

    qs = StudentDeletionRequest.objects.filter(status='pending')
    conds = Q()
    if student is not None:
        conds |= Q(student=student)
    if user is not None:
        conds |= Q(user_id=user.id)
        if getattr(user, 'related_profile_id', None):
            conds |= Q(student_id=user.related_profile_id)
    if not conds:
        return None

    req = qs.filter(conds).order_by('-requested_at').first()
    if not req:
        return None

    req.status = 'cancelled'
    req.cancel_reason = reason
    req.cancelled_at = timezone.now()
    req.save(update_fields=['status', 'cancel_reason', 'cancelled_at', 'updatedAt'])
    logger.info('Student deletion cancelled (student=%s, reason=%s)', req.student_id, reason)
    return req


@transaction.atomic
def purge_student_completely(student):
    """
    Permanently delete the student and EVERY related record.

    Order matters: the Alumni row PROTECTs the Student, so it must go first;
    then all linked portal logins (cascading their OTP tokens, notifications,
    captain requests and sessions); then the Student itself (cascading
    attendance, marks, documents, complaints, stipends, applications, etc.).

    Returns a summary dict for logging.
    """
    from apps.alumni.models import Alumni

    student_id = str(student.id)
    student_name = student.fullNameEnglish
    student_roll = student.currentRollNumber

    # 1. Alumni (OneToOne PROTECT) — must be removed before the student.
    alumni_deleted = Alumni.objects.filter(student=student).delete()[0]

    # 2. All linked portal logins. Deleting the User cascades OTP tokens,
    #    notifications and captain requests; sessions are cleaned best-effort.
    portal_users = _find_all_portal_accounts(student)
    portal_emails = [u.email for u in portal_users]
    user_ids = [str(u.id) for u in portal_users]
    for user in portal_users:
        user.delete()
    _purge_sessions_for_users(user_ids)

    # 3. The student record — cascades every remaining student-linked table.
    student.delete()

    summary = {
        'student_id': student_id,
        'student_name': student_name,
        'roll_number': student_roll,
        'alumni_deleted': bool(alumni_deleted),
        'portal_accounts_deleted': len(portal_users),
        'portal_emails': portal_emails,
    }
    logger.info('Purged student %s [%s]: %s', student_name, student_roll, summary)
    return summary


def _purge_sessions_for_users(user_ids):
    """Best-effort removal of active DB sessions for the given user ids."""
    if not user_ids:
        return
    try:
        from django.contrib.sessions.models import Session
        wanted = {str(uid) for uid in user_ids}
        stale = []
        for session in Session.objects.iterator():
            if session.get_decoded().get('_auth_user_id') in wanted:
                stale.append(session.session_key)
        if stale:
            Session.objects.filter(session_key__in=stale).delete()
    except Exception:  # noqa: BLE001 - never block a purge on session cleanup
        logger.exception('Session cleanup failed during student purge')


def _notify_student_scheduled(student, portal_user, req):
    """Tell the student their account is scheduled for deletion (best-effort)."""
    recipient = portal_user
    if recipient is None:
        return
    purge_date = timezone.localtime(req.purge_at).strftime('%d %b %Y')

    # In-app notification.
    try:
        from apps.notifications.models import Notification
        Notification.objects.create(
            recipient=recipient,
            notification_type='account_activity',
            title='Account scheduled for deletion',
            message=(
                f'Your account is scheduled to be permanently deleted on {purge_date}. '
                'Simply log in before then and the deletion will be cancelled automatically.'
            ),
            data={'student_id': str(student.id), 'purge_at': req.purge_at.isoformat()},
            status='unread',
        )
    except Exception:  # noqa: BLE001
        logger.exception('Failed to create deletion notification for student %s', student.id)

    # Email (security-style so it is always sent).
    try:
        from apps.notifications.email_service import send_branded_email
        recipient_email = (recipient.email or student.email or '').strip()
        if recipient_email:
            send_branded_email(
                'Your account is scheduled for deletion',
                recipient_email,
                heading='Account scheduled for deletion',
                greeting=f'Dear {student.fullNameEnglish or "student"},',
                intro=(
                    f'An administrator has scheduled your Student Portal account for permanent '
                    f'deletion on {purge_date}. If this was not expected, simply log in to your '
                    'portal before that date and the deletion will be cancelled automatically — '
                    'no further action is required.'
                ),
                accent_label='Security',
                accent_color='#b91c1c',
                accent_soft='#fef2f2',
                async_send=True,
                category='security',  # always delivered, bypasses opt-out
            )
    except Exception:  # noqa: BLE001
        logger.exception('Failed to email deletion notice to student %s', student.id)
