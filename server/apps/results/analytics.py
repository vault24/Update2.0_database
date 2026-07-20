"""
Result analytics for the admin panel — keyed by *semester*, not by exam.

A student's regulation year is irrelevant to institute reporting: what a
teacher or the Principal wants is "how did our 4th-semester students do",
pooling every regulation. So analytics is driven by a semester number (1–8)
and considers only students who have an account in our database
(``Student.currentRollNumber`` matched against ``StudentResult.rollNumber``).

When a student sat the same semester more than once (a retake under a newer
regulation), the most recent published result wins — one row per student.

All aggregation runs in Python over the matched rows (one institute's
students — a few thousand at most), which keeps the SQL trivial and the
logic database-agnostic.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from decimal import Decimal
from typing import Optional

from apps.students.models import Student

from .models import StudentResult

_CHUNK = 500
_MAX_SEMESTER = 12

#: resultType -> summary bucket key
_TYPE_KEYS = {
    'passed': 'passed',
    'referred': 'referred',
    'failed': 'failed',
    'expelled': 'expelled',
    'continuous_fail': 'continuousFail',
}

_ORDINALS = {
    1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th',
    7: '7th', 8: '8th', 9: '9th', 10: '10th', 11: '11th', 12: '12th',
}


def ordinal(n: int) -> str:
    return _ORDINALS.get(n, f'{n}th')


# ---------------------------------------------------------------------------
# Core join: (student, result) rows for one semester
# ---------------------------------------------------------------------------

def _latest_result_per_roll(semester: int, rolls: list[str]) -> dict[str, StudentResult]:
    """The most recent published result at ``semester`` for each roll.

    Ordered so the last write wins: older regulation years first, then older
    exams, so a retake under a newer regulation overrides the earlier attempt.
    """
    latest: dict[str, StudentResult] = {}
    for start in range(0, len(rolls), _CHUNK):
        chunk = rolls[start:start + _CHUNK]
        results = (
            StudentResult.objects
            .filter(exam__semester=semester, rollNumber__in=chunk)
            .select_related('exam')
            .prefetch_related('semesterGpas', 'subjects')
            .order_by('exam__regulationYear', 'exam__heldIn', 'id')
        )
        for result in results:
            latest[result.rollNumber] = result
    return latest


def matched_rows(
    semester: int,
    department_id: Optional[str] = None,
    shift: str = '',
) -> list[tuple[Student, StudentResult]]:
    """(student, result) pairs for enrolled students at ``semester``."""
    students = Student.objects.select_related('department').exclude(currentRollNumber='')
    if department_id:
        students = students.filter(department_id=department_id)
    if shift:
        students = students.filter(shift=shift)
    students = list(students)

    by_roll = {s.currentRollNumber: s for s in students}
    latest = _latest_result_per_roll(semester, list(by_roll))
    pairs = [
        (by_roll[roll], result)
        for roll, result in latest.items()
        if roll in by_roll
    ]
    pairs.sort(key=lambda pair: pair[0].currentRollNumber)
    return pairs


def available_semesters() -> list[dict]:
    """Semester numbers that have any result for one of our students.

    Returned as ``{semester, label, students}`` so the picker can show how
    many of our students have a result at each semester.
    """
    our_rolls = list(
        Student.objects.exclude(currentRollNumber='')
        .values_list('currentRollNumber', flat=True)
    )
    counts: Counter = Counter()
    for start in range(0, len(our_rolls), _CHUNK):
        chunk = our_rolls[start:start + _CHUNK]
        rows = (
            StudentResult.objects
            .filter(rollNumber__in=chunk)
            .values_list('exam__semester', 'rollNumber')
            .distinct()
        )
        for sem, _roll in rows:
            counts[sem] += 1

    return [
        {'semester': sem, 'label': f'{ordinal(sem)} Semester', 'students': counts[sem]}
        for sem in sorted(counts)
        if sem is not None
    ]


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------

def _own_gpa(result: StudentResult) -> Optional[Decimal]:
    for grade in result.semesterGpas.all():
        if grade.semester == result.exam.semester:
            return grade.gpa
    return None


def _referred_semester_labels(result: StudentResult) -> str:
    """"2nd, 4th" — the semesters this student is referred in (from the GPA
    history's ``isReferred`` flags), matching the board's sem-wise column."""
    semesters = sorted(
        g.semester for g in result.semesterGpas.all() if g.gpa is None
    )
    return ', '.join(ordinal(s) for s in semesters)


def _bucket(pairs) -> dict:
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


def semester_summary(semester: int) -> dict:
    """Institute + department + national summary for one semester."""
    pairs = matched_rows(semester)

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

    subject_counter: Counter = Counter()
    for _, result in pairs:
        for subject in result.subjects.all():
            subject_counter[subject.subjectCode] += 1
    top_failed_subjects = [
        {'subjectCode': code, 'students': count}
        for code, count in subject_counter.most_common(10)
    ]

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

    # National context: everyone in the imported PDFs at this semester.
    national_qs = StudentResult.objects.filter(exam__semester=semester)
    national_by_type = Counter(national_qs.values_list('resultType', flat=True))
    national_total = sum(national_by_type.values())
    national = {
        'institutes': national_qs.values('institute').distinct().count(),
        'records': national_total,
        'passed': national_by_type.get('passed', 0),
        'passRate': round(national_by_type.get('passed', 0) * 100 / national_total, 1)
        if national_total else None,
    }

    return {
        'semester': semester,
        'label': f'{ordinal(semester)} Semester',
        'institute': _bucket(pairs),
        'departments': departments,
        'topFailedSubjects': top_failed_subjects,
        'topPerformers': top_performers,
        'national': national,
    }


# ---------------------------------------------------------------------------
# Result-sheet rows (shared by PDF + Excel renderers)
# ---------------------------------------------------------------------------

def sheet_rows(semester: int, department_id: Optional[str] = None,
               shift: str = '') -> dict:
    """Structured data for the official-style result sheet.

    Returns a dict with the header meta, per-student ``rows`` and the
    aggregate ``summary`` block shown on the printed sheet.
    """
    pairs = matched_rows(semester, department_id=department_id, shift=shift)

    # Position: rank passed students by own-semester GPA (CGPA tiebreak).
    passed = sorted(
        ((gpa, result.cgpa or Decimal(0), student.currentRollNumber)
         for student, result in pairs
         if result.resultType == 'passed' and (gpa := _own_gpa(result)) is not None),
        key=lambda item: (item[0], item[1]),
        reverse=True,
    )
    position_by_roll = {roll: index + 1 for index, (_, _, roll) in enumerate(passed)}

    rows = []
    passed_n = referred_n = failed_n = 0
    for index, (student, result) in enumerate(pairs, start=1):
        gpa = _own_gpa(result)
        is_pass = result.resultType == 'passed'
        is_referred = result.resultType in ('referred', 'continuous_fail')
        if is_pass:
            passed_n += 1
        elif is_referred:
            referred_n += 1
        else:
            failed_n += 1

        subjects = ', '.join(
            _format_subject(s) for s in result.subjects.all()
        )
        pos = position_by_roll.get(student.currentRollNumber)
        rows.append({
            'sl': index,
            'name': student.fullNameEnglish,
            'gender': _gender_letter(student.gender),
            'roll': student.currentRollNumber,
            'gpa': str(gpa) if (is_pass and gpa is not None) else 'R',
            'passed': is_pass,
            'referredSubjects': subjects if not is_pass else '',
            'failedSubjects': '' if result.resultType != 'failed' else subjects,
            'refSubSemWise': _referred_semester_labels(result) if not is_pass else '',
            'position': ordinal(pos) if pos and pos <= 3 else '',
        })

    total = len(pairs)
    summary = {
        'totalStudent': total,
        'totalPass': passed_n,
        'totalReferred': referred_n,
        'totalFail': failed_n,
        'pctPass': round(passed_n * 100 / total, 2) if total else 0.0,
        'pctReferred': round(referred_n * 100 / total, 2) if total else 0.0,
        'pctFail': round(failed_n * 100 / total, 2) if total else 0.0,
        'pctTotal': 100 if total else 0,
    }

    department = None
    if department_id:
        department = next(
            (s.department for s, _ in pairs if str(s.department_id) == str(department_id)),
            None,
        )

    return {
        'semester': semester,
        'semesterLabel': ordinal(semester),
        'departmentName': department.name if department else 'All Departments',
        'shift': shift or 'All Shifts',
        'rows': rows,
        'summary': summary,
    }


def _gender_letter(gender: str) -> str:
    if not gender:
        return ''
    return 'F' if gender.lower().startswith('f') else 'M' if gender.lower().startswith('m') else ''


def _format_subject(subject) -> str:
    parts = [p for flag, p in ((subject.hasTheory, 'T'), (subject.hasPractical, 'P')) if flag]
    return f"{subject.subjectCode}({','.join(parts)})" if parts else subject.subjectCode
