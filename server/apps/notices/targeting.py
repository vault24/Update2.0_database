"""
Notice audience targeting.

Single source of truth for turning (audience + optional filters) into user
querysets. Used for:
  - dispatching notifications when a notice is published,
  - the admin "estimated recipients" live preview,
  - per-user visibility filtering on the student-portal notice endpoints.

Everything is pure queryset composition — profile id sets are passed around as
lazy ``values_list`` subqueries, so recipient resolution is a single SQL query
per group with no Python-side loops over users.

Filter semantics (hierarchical narrowing, never widening):
  - Department  -> applies to students, teachers and alumni.
  - Semester    -> students only (teachers/alumni have no current semester).
  - Shift       -> students and alumni (teacher shift assignment is a JSON
                   list with different casing and, per spec, teachers always
                   receive department-wide notices regardless of shift).
  - Session     -> students and alumni.
An empty filter list means "no restriction" on that dimension.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.students.models import Student, exclude_unapproved_alumni
from apps.teachers.models import Teacher
from apps.alumni.models import Alumni

from .models import Notice

User = get_user_model()

# Roles whose accounts are backed by a Student profile (alumni portal accounts
# keep the student/captain role — alumni-ness comes from the Alumni record).
STUDENT_ROLES = ('student', 'captain')

AUDIENCES_WITH_STUDENTS = (
    Notice.AUDIENCE_EVERYONE, Notice.AUDIENCE_STUDENTS_TEACHERS, Notice.AUDIENCE_STUDENTS,
)
AUDIENCES_WITH_TEACHERS = (
    Notice.AUDIENCE_EVERYONE, Notice.AUDIENCE_STUDENTS_TEACHERS, Notice.AUDIENCE_TEACHERS,
)
AUDIENCES_WITH_ALUMNI = (
    Notice.AUDIENCE_EVERYONE, Notice.AUDIENCE_ALUMNI,
)


class TargetingFilters:
    """Normalized optional filters. Empty list = no restriction."""

    def __init__(self, departments=None, semesters=None, shifts=None, sessions=None):
        self.departments = list(departments or [])
        self.semesters = [int(s) for s in (semesters or [])]
        self.shifts = list(shifts or [])
        self.sessions = list(sessions or [])

    @classmethod
    def from_notice(cls, notice):
        return cls(
            departments=list(notice.target_departments.values_list('id', flat=True)),
            semesters=notice.target_semesters or [],
            shifts=notice.target_shifts or [],
            sessions=notice.target_sessions or [],
        )


# ---------------------------------------------------------------------------
# Profile querysets (ids only — consumed as lazy subqueries)
# ---------------------------------------------------------------------------

def _student_profile_ids(filters):
    """Active, approved students matching every applicable filter."""
    qs = exclude_unapproved_alumni(Student.objects.filter(status='active'))
    if filters.departments:
        qs = qs.filter(department_id__in=filters.departments)
    if filters.semesters:
        qs = qs.filter(semester__in=filters.semesters)
    if filters.shifts:
        qs = qs.filter(shift__in=filters.shifts)
    if filters.sessions:
        qs = qs.filter(session__in=filters.sessions)
    return qs.values_list('id', flat=True)


def _teacher_profile_ids(filters):
    """Active teachers; only the department filter applies to teachers."""
    qs = Teacher.objects.filter(employmentStatus='active')
    if filters.departments:
        qs = qs.filter(department_id__in=filters.departments)
    return qs.values_list('id', flat=True)


def _alumni_student_ids(filters):
    """Approved alumni (their Student ids); semester never applies."""
    from apps.alumni.models import exclude_student_prefill
    qs = exclude_student_prefill(Alumni.objects.filter(reviewStatus='approved'))
    if filters.departments:
        qs = qs.filter(student__department_id__in=filters.departments)
    if filters.shifts:
        qs = qs.filter(student__shift__in=filters.shifts)
    if filters.sessions:
        qs = qs.filter(student__session__in=filters.sessions)
    return qs.values_list('student_id', flat=True)


# ---------------------------------------------------------------------------
# Recipient user querysets
# ---------------------------------------------------------------------------

def get_recipient_users(audience, filters=None):
    """Active portal users targeted by (audience, filters) — one SQL query."""
    filters = filters or TargetingFilters()
    parts = []
    if audience in AUDIENCES_WITH_STUDENTS:
        parts.append(Q(role__in=STUDENT_ROLES, related_profile_id__in=_student_profile_ids(filters)))
    if audience in AUDIENCES_WITH_TEACHERS:
        parts.append(Q(role='teacher', related_profile_id__in=_teacher_profile_ids(filters)))
    if audience in AUDIENCES_WITH_ALUMNI:
        parts.append(Q(role__in=STUDENT_ROLES, related_profile_id__in=_alumni_student_ids(filters)))
    if not parts:
        return User.objects.none()

    combined = parts[0]
    for q in parts[1:]:
        combined |= q
    return User.objects.filter(is_active=True).filter(combined)


def get_notice_recipient_users(notice):
    """Recipient users for a saved Notice instance."""
    return get_recipient_users(notice.audience, TargetingFilters.from_notice(notice))


def count_recipients(audience, filters=None):
    """Per-group profile counts for the admin live preview.

    Counts profiles (students/teachers/alumni), not portal accounts — the
    preview should reflect who the notice is aimed at even if some of them
    have not created a portal login yet. ``total_users`` is the number of
    portal accounts that will actually receive the notification.
    """
    filters = filters or TargetingFilters()
    students = teachers = alumni = 0
    if audience in AUDIENCES_WITH_STUDENTS:
        students = _student_profile_ids(filters).count()
    if audience in AUDIENCES_WITH_TEACHERS:
        teachers = _teacher_profile_ids(filters).count()
    if audience in AUDIENCES_WITH_ALUMNI:
        alumni = _alumni_student_ids(filters).count()
    return {
        'students': students,
        'teachers': teachers,
        'alumni': alumni,
        'total': students + teachers + alumni,
        'total_users': get_recipient_users(audience, filters).count(),
    }


# ---------------------------------------------------------------------------
# Per-user visibility (student portal)
# ---------------------------------------------------------------------------

def _empty_or_contains(field, value):
    """Q: JSON-list filter is empty OR contains the user's value.

    A user with a blank value on that dimension only matches unfiltered
    notices (they cannot satisfy a narrowed filter).
    """
    empty = Q(**{field: []})
    if value in (None, ''):
        return empty
    return empty | Q(**{f'{field}__contains': value})


def _department_q(department_id):
    """Q: no department restriction OR the user's department is targeted."""
    no_filter = Q(target_departments__isnull=True)
    if not department_id:
        return no_filter
    return no_filter | Q(target_departments=department_id)


def filter_notices_for_user(queryset, user):
    """Restrict a Notice queryset to notices whose targeting includes `user`.

    Mirrors the dispatch logic above so what a user can read matches what
    they were sent. Intentionally does NOT re-check active/approved status:
    dispatch decides who gets notified, while read access only depends on the
    user's profile attributes (a student flipped to on-leave keeps their
    notice board history).
    """
    role = getattr(user, 'role', None)

    if role == 'teacher':
        profile = None
        if user.related_profile_id:
            profile = Teacher.objects.filter(id=user.related_profile_id).only('id', 'department').first()
        q = Q(audience__in=AUDIENCES_WITH_TEACHERS)
        q &= _department_q(profile.department_id if profile else None)
        return queryset.filter(q).distinct()

    if role in STUDENT_ROLES:
        profile = None
        if user.related_profile_id:
            profile = (
                Student.objects.filter(id=user.related_profile_id)
                .select_related('alumni')
                .first()
            )
        is_alumni = bool(
            profile is not None
            and getattr(profile, 'alumni', None) is not None
            and profile.alumni.reviewStatus == 'approved'
        )

        if is_alumni:
            q = Q(audience__in=AUDIENCES_WITH_ALUMNI)
            q &= _department_q(profile.department_id)
            q &= _empty_or_contains('target_shifts', profile.shift)
            q &= _empty_or_contains('target_sessions', profile.session)
        else:
            q = Q(audience__in=AUDIENCES_WITH_STUDENTS)
            q &= _department_q(profile.department_id if profile else None)
            q &= _empty_or_contains('target_semesters', profile.semester if profile else None)
            q &= _empty_or_contains('target_shifts', profile.shift if profile else None)
            q &= _empty_or_contains('target_sessions', profile.session if profile else None)
        return queryset.filter(q).distinct()

    # Admin roles browsing student endpoints (or unknown roles) see nothing
    # here — admin endpoints expose all notices separately.
    return queryset.none()
