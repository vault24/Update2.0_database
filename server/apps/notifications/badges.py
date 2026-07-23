"""
Sidebar unread-badge engine.

Each sidebar module has a small counter function `fn(user, since) -> int` that
returns how many items appeared in that module AFTER `since` (the user's last
"seen" timestamp for that module, or None = never seen = count everything).
Opening the page upserts the ModuleSeen row (see badge_views), which resets the
badge to 0.

To add a new badge later: add one entry to STUDENT_MODULES or ADMIN_MODULES.

Every counter is wrapped so a bad query or a missing model can never break the
badges endpoint — it just contributes 0. Counts are deliberately cheap
(`.filter(...).count()` on indexed columns).
"""
import logging
from functools import wraps

from django.db.models import Q

logger = logging.getLogger(__name__)

# "Never seen" sentinel — when a module has no ModuleSeen row we count all items.
# Using None and `__gt=None` is invalid, so callers translate None to this.
from datetime import datetime, timezone as _tz
_EPOCH = datetime(1970, 1, 1, tzinfo=_tz.utc)


def _safe(fn):
    """Wrap a counter so any error yields 0 instead of breaking the endpoint."""
    @wraps(fn)
    def wrapper(user, since):
        try:
            return int(fn(user, since or _EPOCH)) or 0
        except Exception:  # pragma: no cover - defensive
            logger.debug("badge counter %s failed", fn.__name__, exc_info=True)
            return 0
    return wrapper


def _profile_id(user):
    """The Student/Teacher profile UUID linked to this user account (or None)."""
    return getattr(user, 'related_profile_id', None)


def _dept_scope(user, qs, field):
    """
    Narrow a queryset to a Department Head's own department. Registrars and
    institute heads (and anyone without a department) see everything.
    """
    if getattr(user, 'role', None) == 'department_head' and getattr(user, 'department_id', None):
        return qs.filter(**{field: user.department_id})
    return qs


# ───────────────────────── Student-portal counters ──────────────────────────

@_safe
def _notices(user, since):
    from apps.notices.models import Notice
    return Notice.objects.filter(is_published=True, created_at__gt=since).count()


@_safe
def _documents(user, since):
    from apps.documents.models import Document
    pid = _profile_id(user)
    if not pid:
        return 0
    return Document.objects.filter(student_id=pid, status='active', uploadDate__gt=since).count()


@_safe
def _applications(user, since):
    """The user's own applications whose review outcome changed since `since`."""
    from apps.applications.models import Application
    pid = _profile_id(user)
    if not pid:
        return 0
    return Application.objects.filter(student_id=pid, reviewedAt__gt=since).count()


@_safe
def _complaints_student(user, since):
    """Updates on the user's own complaints that they did not make themselves."""
    from apps.complaints.models import ComplaintUpdate
    pid = _profile_id(user)
    if not pid:
        return 0
    return (
        ComplaintUpdate.objects
        .filter(complaint__student_id=pid, created_at__gt=since)
        .exclude(updated_by_student_id=pid)
        .count()
    )


@_safe
def _routine(user, since):
    """New / changed class-routine entries for the student's class."""
    from apps.students.models import Student
    from apps.class_routines.models import ClassRoutine
    pid = _profile_id(user)
    if not pid:
        return 0
    student = Student.objects.filter(id=pid).only('department_id', 'semester', 'shift').first()
    if not student or not student.department_id:
        return 0
    qs = ClassRoutine.objects.filter(department_id=student.department_id, updated_at__gt=since)
    if student.semester:
        qs = qs.filter(semester=student.semester)
    if student.shift:
        qs = qs.filter(shift=student.shift)
    return qs.count()


@_safe
def _attendance(user, since):
    """New attendance records posted for the student since `since`."""
    from apps.attendance.models import AttendanceRecord
    pid = _profile_id(user)
    if not pid:
        return 0
    return AttendanceRecord.objects.filter(student_id=pid, recorded_at__gt=since).count()


@_safe
def _manage_attendance(user, since):
    """
    Teacher-facing: today's classes that still have no attendance recorded.
    This is an inherently "today" indicator, so it ignores `since`.
    """
    from django.utils import timezone
    from apps.class_routines.models import ClassRoutine
    from apps.attendance.models import AttendanceRecord
    pid = _profile_id(user)
    if not pid:
        return 0
    today = timezone.localdate()
    weekday = today.strftime('%A')
    routines = ClassRoutine.objects.filter(teacher_id=pid, day_of_week=weekday)
    total = routines.count()
    if not total:
        return 0
    marked = (
        AttendanceRecord.objects
        .filter(class_routine__teacher_id=pid, date=today)
        .values_list('class_routine_id', flat=True)
        .distinct()
        .count()
    )
    return max(total - marked, 0)


@_safe
def _alumni_directory(user, since):
    """Alumni newly approved into the directory since `since`."""
    from apps.alumni.models import Alumni, exclude_student_prefill
    return exclude_student_prefill(
        Alumni.objects.filter(reviewStatus='approved', createdAt__gt=since)
    ).count()


# ────────────────────────── Admin-portal counters ───────────────────────────

@_safe
def _admin_admissions(user, since):
    from apps.admissions.models import Admission
    qs = Admission.objects.filter(is_draft=False, status='pending', updated_at__gt=since)
    return _dept_scope(user, qs, 'desired_department_id').count()


@_safe
def _admin_teacher_requests(user, since):
    from apps.teacher_requests.models import TeacherSignupRequest
    return TeacherSignupRequest.objects.filter(status='pending', created_at__gt=since).count()


@_safe
def _admin_discontinued_students(user, since):
    from apps.students.models import Student
    qs = Student.objects.filter(status='discontinued', updatedAt__gt=since)
    return _dept_scope(user, qs, 'department_id').count()


@_safe
def _admin_alumni(user, since):
    from apps.alumni.models import Alumni
    return Alumni.objects.filter(reviewStatus='pending', createdAt__gt=since).count()


@_safe
def _admin_applications(user, since):
    from apps.applications.models import Application
    qs = (
        Application.objects
        .filter(submittedAt__gt=since)
        .exclude(status__in=['approved', 'rejected', 'completed'])
    )
    return _dept_scope(user, qs, 'current_department_id').count()


@_safe
def _admin_correction_requests(user, since):
    from apps.correction_requests.models import CorrectionRequest
    return CorrectionRequest.objects.filter(status='pending', submitted_at__gt=since).count()


@_safe
def _admin_signup_requests(user, since):
    from apps.authentication.models import SignupRequest
    return SignupRequest.objects.filter(status='pending', created_at__gt=since).count()


@_safe
def _admin_complaints(user, since):
    from apps.complaints.models import Complaint
    qs = Complaint.objects.filter(status='pending', created_at__gt=since)
    return _dept_scope(user, qs, 'department_id').count()


@_safe
def _admin_notices(user, since):
    """Notices published by someone else since `since`."""
    from apps.notices.models import Notice
    return Notice.objects.filter(is_published=True, created_at__gt=since).exclude(created_by=user).count()


@_safe
def _admin_analytics(user, since):
    from apps.system_reports.models import SystemReport
    return SystemReport.objects.filter(status='open', created_at__gt=since).count()


# ─────────────────────────────── Registries ─────────────────────────────────

STUDENT_MODULES = {
    'notices': _notices,
    'documents': _documents,
    'applications': _applications,
    'complaints': _complaints_student,
    'routine': _routine,
    'attendance': _attendance,
    'manage_attendance': _manage_attendance,
    'alumni_directory': _alumni_directory,
}

ADMIN_MODULES = {
    'admin_admissions': _admin_admissions,
    'admin_teacher_requests': _admin_teacher_requests,
    'admin_discontinued_students': _admin_discontinued_students,
    'admin_alumni': _admin_alumni,
    'admin_applications': _admin_applications,
    'admin_correction_requests': _admin_correction_requests,
    'admin_signup_requests': _admin_signup_requests,
    'admin_complaints': _admin_complaints,
    'admin_notices': _admin_notices,
    'admin_analytics': _admin_analytics,
}

ALL_MODULES = {**STUDENT_MODULES, **ADMIN_MODULES}


def modules_for_user(user):
    """Return the module->counter mapping relevant to this user's portal."""
    try:
        if user.can_access_admin_portal():
            return ADMIN_MODULES
    except Exception:
        pass
    return STUDENT_MODULES


def compute_badges(user):
    """
    Return { module_key: count } for every module relevant to `user`, using each
    module's last-seen timestamp. One query loads all the user's seen-markers.
    """
    from .models import ModuleSeen

    modules = modules_for_user(user)
    seen = dict(
        ModuleSeen.objects.filter(user=user, module__in=modules.keys())
        .values_list('module', 'last_seen_at')
    )
    return {key: fn(user, seen.get(key)) for key, fn in modules.items()}
