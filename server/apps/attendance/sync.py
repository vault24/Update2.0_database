"""
Automatic attendance synchronization.

When a department has `autoAttendanceSync` enabled, attendance taken by
teachers (AttendanceRecord rows with status approved/direct) is mirrored into
each student's profile attendance (`Student.semesterAttendance` JSON), and the
subject list always follows the class routine for the student's
department/semester/shift.

When the toggle is off, nothing here runs — the manual admin workflow is
untouched.
"""
import logging
from datetime import date as date_cls

from django.db.models import Count, Q

logger = logging.getLogger(__name__)

# Only verified records count toward the student profile.
SYNC_STATUSES = ['approved', 'direct']


def _routine_subjects_for(student):
    """Subject skeletons from the routine for the student's cohort."""
    from apps.class_routines.models import ClassRoutine

    routines = (
        ClassRoutine.objects.filter(
            department_id=student.department_id,
            semester=student.semester,
            shift=student.shift,
            is_active=True,
        )
        .values('subject_code', 'subject_name')
        .distinct()
    )
    return {r['subject_code']: r['subject_name'] for r in routines if r['subject_code']}


def sync_student_attendance(student, semester=None):
    """
    Recompute one student's profile attendance for a semester from
    AttendanceRecord data + routine subjects.

    - Creates/updates the semesterAttendance entry for `semester`
      (defaults to the student's current semester).
    - Subjects present in the routine always appear (0/0 when untaken).
    - Subjects with attendance records get real present/total counts.
    - Manually added subjects that have neither routine nor records are kept.

    Returns True when the student row was updated.
    """
    from apps.attendance.models import AttendanceRecord

    department = getattr(student, 'department', None)
    if not department or not getattr(department, 'autoAttendanceSync', False):
        return False

    semester = semester or student.semester
    if not semester:
        return False

    # Aggregate verified attendance per subject for this semester.
    aggregates = (
        AttendanceRecord.objects.filter(
            student=student,
            semester=semester,
            status__in=SYNC_STATUSES,
        )
        .values('subject_code', 'subject_name')
        .annotate(
            total=Count('id'),
            present=Count('id', filter=Q(is_present=True)),
        )
    )
    record_subjects = {
        row['subject_code']: row for row in aggregates if row['subject_code']
    }

    routine_subjects = _routine_subjects_for(student) if semester == student.semester else {}

    semester_attendance = list(student.semesterAttendance or [])
    entry = None
    for item in semester_attendance:
        if isinstance(item, dict) and item.get('semester') == semester:
            entry = item
            break
    if entry is None:
        entry = {
            'semester': semester,
            'year': date_cls.today().year,
            'subjects': [],
            'averagePercentage': 0,
        }
        semester_attendance.append(entry)
        semester_attendance.sort(
            key=lambda x: x.get('semester', 0) if isinstance(x, dict) else 0
        )

    existing_subjects = entry.get('subjects') or []
    merged = {}

    # Start from existing entries so manual data is preserved.
    for subject in existing_subjects:
        if isinstance(subject, dict) and subject.get('code'):
            merged[subject['code']] = dict(subject)

    # Routine subjects always exist (skeleton with zero counts when new).
    for code, name in routine_subjects.items():
        if code not in merged:
            merged[code] = {'code': code, 'name': name, 'present': 0, 'total': 0, 'percentage': 0}
        elif name and not merged[code].get('name'):
            merged[code]['name'] = name

    # Attendance records overwrite counts for their subjects (source of truth).
    for code, row in record_subjects.items():
        current = merged.get(code, {'code': code})
        current['name'] = current.get('name') or row['subject_name'] or code
        current['present'] = row['present']
        current['total'] = row['total']
        current['percentage'] = round(row['present'] / row['total'] * 100, 2) if row['total'] else 0
        merged[code] = current

    subjects = sorted(merged.values(), key=lambda s: s.get('code', ''))
    entry['subjects'] = subjects

    counted = [s for s in subjects if s.get('total')]
    total_present = sum(s.get('present', 0) for s in counted)
    total_classes = sum(s.get('total', 0) for s in counted)
    entry['averagePercentage'] = (
        round(total_present / total_classes * 100, 2) if total_classes else 0
    )

    student.semesterAttendance = semester_attendance
    student.save(update_fields=['semesterAttendance', 'updatedAt'])
    return True


def sync_students_for_records(records):
    """
    Best-effort sync for the students touched by a batch of attendance
    records. Never raises — sync problems must not break attendance saving.
    """
    seen = set()
    synced = 0
    for record in records:
        try:
            key = (record.student_id, record.semester)
            if key in seen:
                continue
            seen.add(key)
            student = record.student
            if sync_student_attendance(student, semester=record.semester):
                synced += 1
        except Exception:
            logger.exception(
                "Attendance sync failed for student %s", getattr(record, 'student_id', '?')
            )
    if synced:
        logger.info("Attendance sync updated %d student profiles", synced)
    return synced


def sync_cohort(department, semester, shift):
    """
    Sync every active student of one cohort (used when a routine changes so
    new subjects appear in student profiles). No-op when the department
    toggle is off.
    """
    from apps.students.models import Student

    if not getattr(department, 'autoAttendanceSync', False):
        return 0

    synced = 0
    students = Student.objects.filter(
        department=department, semester=semester, shift=shift, status='active'
    ).select_related('department')
    for student in students:
        try:
            if sync_student_attendance(student):
                synced += 1
        except Exception:
            logger.exception("Cohort attendance sync failed for student %s", student.id)
    return synced
