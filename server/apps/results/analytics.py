"""
Result analytics for the admin panel.

Board results carry only a roll number; enrolled students carry department,
shift and name. Joining the two (``StudentResult.rollNumber`` ↔
``Student.currentRollNumber``) turns a national result PDF into *institute*
insight: department summaries, department comparison, shift breakdowns,
most-failed subjects, top performers, and CSV exports for teachers.

All aggregation happens in Python over the matched rows (a few thousand at
most — one institute's students), which keeps the queries trivial and the
logic database-agnostic.
"""
from __future__ import annotations

import csv
from collections import Counter, defaultdict
from decimal import Decimal
from io import StringIO
from typing import Iterable, Optional

from django.db.models import Count

from apps.students.models import Student

from .models import Exam, StudentResult

_CHUNK = 500

#: resultType -> summary bucket key
_TYPE_KEYS = {
    'passed': 'passed',
    'referred': 'referred',
    'failed': 'failed',
    'expelled': 'expelled',
    'continuous_fail': 'continuousFail',
}


def exams_with_results() -> list[dict]:
    """Exams that actually have imported results, newest first."""
    exams = (
        Exam.objects.annotate(resultCount=Count('results'))
        .filter(resultCount__gt=0)
        .order_by('-regulationYear', '-semester')
    )
    return [
        {
            'id': exam.id,
            'semester': exam.semester,
            'regulationYear': exam.regulationYear,
            'program': exam.program,
            'heldIn': exam.heldIn,
            'publicationDate': exam.publicationDate,
            'resultCount': exam.resultCount,
        }
        for exam in exams
    ]


def _matched_rows(exam: Exam, department_id: Optional[str] = None,
                  shift: str = '') -> list[tuple[Student, StudentResult]]:
    """(student, result) pairs for this exam among enrolled students."""
    students = Student.objects.select_related('department')
    if department_id:
        students = students.filter(department_id=department_id)
    if shift:
        students = students.filter(shift=shift)
    students = list(students.exclude(currentRollNumber=''))

    by_roll = {s.currentRollNumber: s for s in students}
    rolls = list(by_roll)
    pairs: list[tuple[Student, StudentResult]] = []
    for start in range(0, len(rolls), _CHUNK):
        chunk = rolls[start:start + _CHUNK]
        results = (
            StudentResult.objects.filter(exam=exam, rollNumber__in=chunk)
            .prefetch_related('semesterGpas', 'subjects')
        )
        pairs.extend((by_roll[r.rollNumber], r) for r in results)
    pairs.sort(key=lambda pair: pair[0].currentRollNumber)
    return pairs


def _own_gpa(result: StudentResult) -> Optional[Decimal]:
    for grade in result.semesterGpas.all():
        if grade.semester == result.exam.semester:
            return grade.gpa
    return None


def _bucket(pairs: Iterable[tuple[Student, StudentResult]]) -> dict:
    """Aggregate one group of (student, result) pairs."""
    stats = {key: 0 for key in _TYPE_KEYS.values()}
    gpas: list[Decimal] = []
    cgpas: list[Decimal] = []
    for _, result in pairs:
        stats[_TYPE_KEYS.get(result.resultType, 'failed')] += 1
        gpa = _own_gpa(result)
        if gpa is not None:
            gpas.append(gpa)
        if result.cgpa is not None:
            cgpas.append(result.cgpa)
    appeared = sum(stats.values())
    stats['appeared'] = appeared
    stats['passRate'] = round(stats['passed'] * 100 / appeared, 1) if appeared else None
    stats['avgGpa'] = round(float(sum(gpas) / len(gpas)), 2) if gpas else None
    stats['avgCgpa'] = round(float(sum(cgpas) / len(cgpas)), 2) if cgpas else None
    return stats


def exam_summary(exam: Exam) -> dict:
    """Institute + department + national summary for one exam."""
    pairs = _matched_rows(exam)

    by_department: dict[str, list] = defaultdict(list)
    department_meta: dict[str, dict] = {}
    for student, result in pairs:
        dept = student.department
        key = str(dept.id)
        by_department[key].append((student, result))
        department_meta.setdefault(key, {
            'id': key,
            'name': dept.name,
            'code': getattr(dept, 'code', '') or '',
        })

    departments = []
    for key, dept_pairs in by_department.items():
        entry = {**department_meta[key], **_bucket(dept_pairs)}
        shifts = defaultdict(list)
        for student, result in dept_pairs:
            shifts[student.shift or 'Unspecified'].append((student, result))
        entry['shifts'] = {
            shift: {
                'appeared': bucket['appeared'],
                'passed': bucket['passed'],
                'passRate': bucket['passRate'],
            }
            for shift, bucket in
            ((shift, _bucket(shift_pairs)) for shift, shift_pairs in shifts.items())
        }
        departments.append(entry)
    departments.sort(key=lambda d: d['name'])

    # Most-failed subjects among our students (referred/expelled/CA codes).
    subject_counter: Counter = Counter()
    for _, result in pairs:
        for subject in result.subjects.all():
            subject_counter[subject.subjectCode] += 1
    top_failed_subjects = [
        {'subjectCode': code, 'students': count}
        for code, count in subject_counter.most_common(10)
    ]

    # Top performers (by own-semester GPA, CGPA as tiebreaker).
    scored = [
        (gpa, student, result)
        for student, result in pairs
        if result.resultType == 'passed' and (gpa := _own_gpa(result)) is not None
    ]
    scored.sort(key=lambda item: (item[0], item[2].cgpa or Decimal(0)), reverse=True)
    top_performers = [
        {
            'roll': student.currentRollNumber,
            'name': student.fullNameEnglish,
            'department': student.department.name,
            'shift': student.shift,
            'gpa': str(gpa),
            'cgpa': str(result.cgpa) if result.cgpa is not None else None,
        }
        for gpa, student, result in scored[:10]
    ]

    # National context: the whole imported PDF.
    national_by_type = dict(
        StudentResult.objects.filter(exam=exam)
        .values_list('resultType')
        .annotate(count=Count('id'))
        .values_list('resultType', 'count')
    )
    national_total = sum(national_by_type.values())
    national = {
        'institutes': StudentResult.objects.filter(exam=exam)
        .values('institute').distinct().count(),
        'records': national_total,
        'passed': national_by_type.get('passed', 0),
        'passRate': round(national_by_type.get('passed', 0) * 100 / national_total, 1)
        if national_total else None,
    }

    return {
        'institute': _bucket(pairs),
        'departments': departments,
        'topFailedSubjects': top_failed_subjects,
        'topPerformers': top_performers,
        'national': national,
    }


def results_csv(exam: Exam, department_id: Optional[str] = None,
                shift: str = '') -> str:
    """CSV export of matched student results (department/shift optional)."""
    pairs = _matched_rows(exam, department_id=department_id, shift=shift)
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        'Roll', 'Name', 'Department', 'Shift', 'Result',
        f'Semester {exam.semester} GPA', 'CGPA', 'GPA History', 'Subjects To Clear',
    ])
    for student, result in pairs:
        gpa = _own_gpa(result)
        history = '; '.join(
            f"S{g.semester}:{'ref' if g.gpa is None else g.gpa}"
            for g in sorted(result.semesterGpas.all(), key=lambda g: g.semester)
        )
        subjects = ', '.join(
            f"{s.subjectCode}"
            + (f"({'T' if s.hasTheory else ''}{',' if s.hasTheory and s.hasPractical else ''}"
               f"{'P' if s.hasPractical else ''})" if s.hasTheory or s.hasPractical else '')
            for s in result.subjects.all()
        )
        writer.writerow([
            student.currentRollNumber,
            student.fullNameEnglish,
            student.department.name,
            student.shift,
            result.get_resultType_display(),
            gpa if gpa is not None else ('ref' if result.resultType == 'referred' else ''),
            result.cgpa if result.cgpa is not None else '',
            history,
            subjects,
        ])
    return buffer.getvalue()
