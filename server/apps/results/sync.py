"""
Automatic student-profile synchronisation.

After a PDF import, every imported roll that matches an enrolled student's
``currentRollNumber`` gets their profile updated from the official record —
no manual step, no extra button:

- ``semesterResults`` entries are rebuilt per semester:
    * the exam's own semester becomes ``{semester, gpa}`` (passed) or
      ``{semester, referredSubjects: [...]}`` (referred/failed/expelled/CA)
    * numeric GPAs from the published history fill in *older* semesters,
      which automatically clears a previously-referred semester once BTEB
      publishes its GPA
    * older semesters still marked "ref" keep whatever entry they already
      have (their subject list came from that semester's own import)
- ``finalCgpa`` is set when a final-semester CGPA is published.
- The existing pre-save signal keeps ``student.semester`` promoted, and the
  student gets an in-app/push notification that a new result arrived.

Results are applied in exam order (oldest first) so the newest publication
always wins on conflicts.
"""
from __future__ import annotations

import logging
from typing import Iterable

from apps.students.models import Student

from .models import StudentResult

logger = logging.getLogger(__name__)

_CHUNK = 500


def sync_students_for_rolls(rolls: Iterable[str]) -> dict:
    """Sync every enrolled student whose roll appears in ``rolls``.

    Called from the import background thread, so notification emails are sent
    inline (sequentially) rather than spawning one thread per student.
    """
    rolls = list({str(r) for r in rolls})
    matched = 0
    updated = 0
    for start in range(0, len(rolls), _CHUNK):
        chunk = rolls[start:start + _CHUNK]
        for student in Student.objects.filter(currentRollNumber__in=chunk):
            matched += 1
            try:
                if sync_student(student, email_async=False):
                    updated += 1
            except Exception:
                # One bad profile must not abort the whole sync run.
                logger.exception(
                    'Result sync failed for student %s (roll %s)',
                    student.pk, student.currentRollNumber,
                )
    return {'matchedStudents': matched, 'updatedStudents': updated}


def sync_student(student: Student, email_async: bool = True) -> bool:
    """Rebuild one student's result fields from all imported results.

    Returns True when something changed and was saved.
    """
    results = (
        StudentResult.objects
        .filter(rollNumber=student.currentRollNumber)
        .select_related('exam')
        .prefetch_related('semesterGpas', 'subjects')
        .order_by('exam__regulationYear', 'exam__semester', 'exam__heldIn')
    )
    if not results:
        return False

    # Key existing entries by an INT semester so re-imports update the same
    # slot instead of creating a parallel entry (e.g. a legacy entry storing
    # semester as "4" must collide with our int 4). Any entry whose semester
    # is unparseable is dropped — it can only be malformed legacy data, and
    # the authoritative history is being rebuilt from imported results anyway.
    def _norm_sem(value):
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    entries = {}
    for entry in (student.semesterResults or []):
        if not isinstance(entry, dict):
            continue
        semester = _norm_sem(entry.get('semester'))
        if semester is None:
            continue
        normalized = dict(entry)
        normalized['semester'] = semester
        entries[semester] = normalized
    final_cgpa = student.finalCgpa

    for result in results:
        own_semester = result.exam.semester
        grades = {g.semester: g for g in result.semesterGpas.all()}

        # Official numeric history fills / refreshes older semesters. A
        # numeric GPA replacing a referred entry is exactly the "referred
        # subjects cleared" flow. resultType 'gpa' / 'referred' is what the
        # Student model's promotion logic keys on.
        for semester, grade in grades.items():
            if semester == own_semester or grade.gpa is None:
                continue
            entries[semester] = {
                'semester': semester, 'resultType': 'gpa', 'gpa': float(grade.gpa),
            }

        if result.resultType == 'passed':
            own = grades.get(own_semester)
            entries[own_semester] = {
                'semester': own_semester,
                'resultType': 'gpa',
                # A passed record always publishes its own semester's GPA;
                # None would mean a parser regression, kept visible here.
                'gpa': float(own.gpa) if own is not None and own.gpa is not None else None,
            }
        else:
            codes = [_format_subject(s) for s in result.subjects.all()]
            entries[own_semester] = {
                'semester': own_semester,
                'resultType': 'referred',
                'referredSubjects': codes or [result.get_resultType_display()],
            }

        if result.cgpa is not None:
            final_cgpa = result.cgpa

    new_results = [entries[key] for key in sorted(entries)]
    changed = (
        new_results != (student.semesterResults or [])
        or final_cgpa != student.finalCgpa
    )
    if not changed:
        return False

    student.semesterResults = new_results
    student.finalCgpa = final_cgpa
    # Guard: apps.results.signals re-syncs students on save; this flag stops
    # the sync-triggered save from recursing into another sync.
    student._result_sync_in_progress = True
    try:
        student.save()  # full save: the pre-save signal may promote `semester`
    finally:
        student._result_sync_in_progress = False

    latest = list(results)[-1]  # exam-ordered, so last = newest publication
    _notify_student(student)
    _email_student(student, latest, async_send=email_async)
    return True


def _format_subject(subject) -> str:
    parts = [p for flag, p in ((subject.hasTheory, 'T'), (subject.hasPractical, 'P')) if flag]
    return f"{subject.subjectCode}({','.join(parts)})" if parts else subject.subjectCode


def _email_student(student: Student, result: StudentResult, async_send: bool = True) -> None:
    """Result-published email (best-effort; honours the email opt-out)."""
    try:
        from apps.notifications.dispatch import student_portal_url
        from apps.notifications.email_service import send_branded_email

        recipients = {student.email}
        try:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            recipients.update(
                User.objects.filter(
                    related_profile_id=student.id,
                    role__in=['student', 'captain'],
                ).values_list('email', flat=True)
            )
        except Exception:
            pass
        recipients = [email for email in recipients if email]
        if not recipients:
            return

        own = next(
            (g for g in result.semesterGpas.all() if g.semester == result.exam.semester),
            None,
        )
        status_label = result.get_resultType_display()
        details = [
            {'label': 'Roll Number', 'value': student.currentRollNumber},
            {'label': 'Examination',
             'value': f'Semester {result.exam.semester} '
                      f'({result.exam.regulationYear} Regulation)'},
            {'label': 'Status', 'value': status_label},
        ]
        if own is not None and own.gpa is not None:
            details.append({'label': f'Semester {result.exam.semester} GPA',
                            'value': str(own.gpa)})
        if result.cgpa is not None:
            details.append({'label': 'Final CGPA', 'value': str(result.cgpa)})
        subjects = [_format_subject(s) for s in result.subjects.all()]
        if subjects:
            details.append({'label': 'Subjects to clear', 'value': ', '.join(subjects)})

        send_branded_email(
            'Your board result has been published',
            recipients,
            heading='Board Result Published',
            greeting=f'Dear {student.fullNameEnglish},',
            intro=(
                'The Bangladesh Technical Education Board has published your '
                'semester result, and it has been added to your student '
                'profile automatically.'
            ),
            details=details,
            cta_label='View Full Result',
            cta_url=student_portal_url('/dashboard/board-results'),
            accent_label='Result',
            accent_color='#059669',
            accent_soft='#ecfdf5',
            closing='This is an automated message from the result system.',
            async_send=async_send,
        )
    except Exception:
        logger.exception('Result email failed for student %s', student.pk)


def _notify_student(student: Student) -> None:
    """Best-effort in-app + push notification; never fails the sync."""
    try:
        from django.contrib.auth import get_user_model

        from apps.notifications.services import NotificationService

        User = get_user_model()
        for user in User.objects.filter(
            related_profile_id=student.id, role__in=['student', 'captain'],
        ):
            NotificationService.create_notification(
                recipient=user,
                notification_type='system_announcement',
                title='New board result published',
                message=(
                    'Your BTEB result has been imported and your profile was '
                    'updated automatically. Check your result history for '
                    'details.'
                ),
                data={'kind': 'result_sync', 'roll': student.currentRollNumber},
            )
    except Exception:
        logger.exception('Result notification failed for student %s', student.pk)
