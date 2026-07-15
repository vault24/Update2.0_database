"""
Student-portal account creation — the single implementation.

A portal login always hangs off a **Student** record, so this lives with
students and is the one place that knows how to build one. Both entry points
call it:

  * Admin > Student details  -> "Create Student Portal Account"
    (POST /api/students/{id}/account/)
  * Admin > Alumni details   -> "Create Portal Account"
    (POST /api/alumni/{id}/create-portal-account/, via
     alumni.services.create_portal_account_for_alumni)

They used to be two separate implementations that disagreed on the details
(username scheme, student_id derivation, duplicate checks, whether a welcome
email was sent), which meant a fix in one silently missed the other. The
genuine differences between the two flows are parameters, not forks:

  * the alumni flow may auto-generate a password (the admin reads it out to
    the alumnus) — `generate_password=True`;
  * the student flow always demands an explicit email + password.

Everything else — uniqueness, linking, naming, the welcome email — is shared.
"""
import logging
import re
import uuid

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q

logger = logging.getLogger(__name__)

MIN_PASSWORD_LENGTH = 8
_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


class AccountError(ValueError):
    """A rejection the caller should surface to the admin verbatim."""

    def __init__(self, message, detail=''):
        super().__init__(message)
        self.message = message
        self.detail = detail


def find_portal_account(student):
    """The portal login linked to this student, or None."""
    User = get_user_model()
    return (
        User.objects.filter(related_profile_id=student.id, role__in=['student', 'captain'])
        .order_by('date_joined')
        .first()
    )


def account_payload(user):
    """The account shape both APIs return."""
    return {
        'has_account': True,
        'user_id': str(user.id),
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'account_status': user.account_status,
        'is_active': bool(user.is_active) and user.account_status == 'active',
        'student_id': user.student_id,
        'created_at': user.date_joined.isoformat() if user.date_joined else None,
        'last_login': user.last_login.isoformat() if user.last_login else None,
    }


def _unique_student_id(student):
    """
    A unique User.student_id for this student.

    Prefer the college roll (admins recognise it); fall back to a generated id
    when the roll is missing or already taken. `student_id` is UNIQUE, so
    trusting the roll blindly used to raise IntegrityError on collisions.
    """
    User = get_user_model()
    roll = (student.currentRollNumber or '').strip()
    if roll and not User.objects.filter(student_id=roll).exists():
        return roll
    while True:
        candidate = f'SIPI-{uuid.uuid4().hex[:8].upper()}'
        if not User.objects.filter(student_id=candidate).exists():
            return candidate


def _split_name(full_name):
    parts = (full_name or '').strip().split(' ', 1)
    first = parts[0] if parts and parts[0] else ''
    last = parts[1] if len(parts) > 1 else ''
    return first, last


@transaction.atomic
def create_student_portal_account(
    student,
    *,
    email=None,
    password=None,
    generate_password=False,
    send_welcome=True,
    actor=None,
    ip_address=None,
    user_agent=None,
):
    """
    Create the portal login for `student`.

    Args:
        student: the Student to link the account to.
        email: login email. Falls back to the student's own email; required.
        password: explicit password. When absent and `generate_password` is
            set, a random one is created and returned so the admin can pass it
            on. Otherwise a password is required.
        generate_password: allow auto-generating the password (alumni flow).
        send_welcome: send the branded welcome email (best-effort, never fatal).
        actor: the admin performing this, for the activity log. Skipped when None.
        ip_address / user_agent: request metadata for the activity log.

    Returns:
        dict: {'user', 'username', 'email', 'generated_password'} —
        `generated_password` is None when the caller supplied the password.

    Raises:
        AccountError: on any validation failure (message is admin-facing).
    """
    User = get_user_model()

    if find_portal_account(student):
        raise AccountError(
            'Account already exists',
            'A portal account is already linked to this student.',
        )

    email = (email or getattr(student, 'email', '') or '').strip().lower()
    if not email:
        raise AccountError(
            'Email is required',
            'An email address is required to create a portal account.',
        )
    if not _EMAIL_RE.match(email):
        raise AccountError('Enter a valid email address')

    if User.objects.filter(Q(username__iexact=email) | Q(email__iexact=email)).exists():
        raise AccountError(
            'Email already in use',
            'Another account is already using this email address.',
        )

    generated_password = None
    if not password:
        if not generate_password:
            raise AccountError(f'Password must be at least {MIN_PASSWORD_LENGTH} characters')
        generated_password = uuid.uuid4().hex[:10]
        password = generated_password
    elif len(password) < MIN_PASSWORD_LENGTH:
        raise AccountError(f'Password must be at least {MIN_PASSWORD_LENGTH} characters')

    first_name, last_name = _split_name(getattr(student, 'fullNameEnglish', ''))
    user = User(
        username=email,
        email=email,
        first_name=first_name,
        last_name=last_name,
        role='student',
        account_status='active',
        admission_status='approved',
        student_id=_unique_student_id(student),
        related_profile_id=student.id,
        mobile_number=(getattr(student, 'mobileStudent', '') or '')[:20],
    )
    user.set_password(password)
    try:
        user.save()
    except IntegrityError as exc:
        raise AccountError(
            'Could not create account',
            'A conflicting account already exists for this student.',
        ) from exc

    # Keep the student's email in sync when it was blank (the alumni flow
    # relies on this so later reminders have somewhere to go).
    if not getattr(student, 'email', ''):
        student.email = email
        student.save(update_fields=['email'])

    if send_welcome:
        try:
            from apps.notifications.dispatch import send_welcome_email
            send_welcome_email(
                user, portal='student', role_label='Student',
                details=[
                    {'label': 'Roll Number', 'value': student.currentRollNumber},
                    {'label': 'Login Email', 'value': email},
                ],
            )
        except Exception as exc:  # noqa: BLE001 - never block account creation
            logger.error('Welcome email failed for %s: %s', email, exc)

    if actor is not None:
        try:
            from apps.activity_logs.signals import log_activity
            log_activity(
                actor, 'create', 'StudentAccount', user.id,
                f'Created Student Portal account ({email}) for '
                f'{student.fullNameEnglish} [{student.currentRollNumber}]',
                changes={'email': email, 'student_id': user.student_id},
                ip_address=ip_address, user_agent=user_agent,
            )
        except Exception as exc:  # noqa: BLE001 - logging must not fail the action
            logger.error('Activity log failed for account %s: %s', user.id, exc)

    logger.info('Portal account created: user=%s student=%s', user.id, student.id)
    return {
        'user': user,
        'username': user.username,
        'email': email,
        'generated_password': generated_password,
    }
