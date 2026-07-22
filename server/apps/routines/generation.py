"""
Personalized exam-routine generation.

This module is a *consumer* of the existing academic data platform. It never
stores its own subject lists — it composes a student's exam subjects from:

  1. the Subject catalog  (apps.results.Subject)      → regular semester subjects
  2. the Result database  (apps.results.StudentResult) → referred subjects
  3. the Student profile   (apps.students.Student)     → technology / semester

and matches those codes against the imported routine (RoutineSubject) to
produce only the exams relevant to that student, in chronological order.

    student → (techCode, regulation, semester)
           → Subject DB    → regular codes
           → Result DB     → referred codes
           → union → RoutineSubject match → dated/timed exams
"""
from __future__ import annotations

import re
from typing import Optional

from apps.results.models import StudentResult, Subject
from apps.students.models import Student

from .models import RoutineImport, RoutineSubject

# Subject roles that mean "the student still has to sit this exam".
_REFERRED_ROLES = ('referred', 'expelled', 'continuous_fail')

_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
             'Saturday', 'Sunday']


def _normalize_tech(name: str) -> str:
    """Loose key for matching a department name to a Subject.technology."""
    name = re.sub(r'name of technology|technology name|:', ' ', name, flags=re.I)
    name = re.sub(r'\b(and|&)\b', '', name, flags=re.I)
    name = re.sub(r'\btechnology\b', '', name, flags=re.I)
    return re.sub(r'[^a-z]', '', name.lower())


def resolve_tech_code(department) -> Optional[str]:
    """Map a Department to a BTEB techCode via the Subject catalog.

    The Subject catalog is the single source of truth for technologies, so we
    match the department's name against the distinct technologies it contains
    (normalized) rather than maintaining a separate mapping table.
    """
    if department is None:
        return None
    target = _normalize_tech(department.name)
    if not target:
        return None
    best = None
    for techCode, technology in (
        Subject.objects.values_list('techCode', 'technology').distinct()
    ):
        key = _normalize_tech(technology)
        if not key:
            continue
        if key == target or key in target or target in key:
            # Prefer an exact match; otherwise the first containment match.
            if key == target:
                return techCode
            best = best or techCode
    return best


def referred_codes_for_roll(roll: str) -> set[str]:
    """Subject codes the student is still referred/failed in, from results."""
    if not roll:
        return set()
    codes: set[str] = set()
    rows = (
        StudentResult.objects.filter(rollNumber=roll)
        .prefetch_related('subjects')
    )
    for row in rows:
        for subject in row.subjects.all():
            if subject.role in _REFERRED_ROLES:
                codes.add(subject.subjectCode)
    return codes


def active_routine(exam_type: str = 'final', regulation: Optional[int] = None) -> Optional[RoutineImport]:
    qs = RoutineImport.objects.filter(examType=exam_type, isActive=True, status='completed')
    if regulation is not None:
        qs = qs.filter(regulationYear=regulation)
    return qs.order_by('-createdAt').first()


def generate_for_student(student: Student, exam_type: str = 'final') -> dict:
    """Build the personalized routine payload for one student."""
    routine = active_routine(exam_type)
    if routine is None:
        return {'available': False, 'reason': 'no-routine', 'examType': exam_type}

    regulation = routine.regulationYear
    tech_code = resolve_tech_code(student.department)

    # 1. Regular subjects for this semester (Subject catalog = source of truth).
    regular_codes: set[str] = set()
    subject_names: dict[str, dict] = {}
    if tech_code and student.semester:
        regular_qs = Subject.objects.filter(
            techCode=tech_code, semester=student.semester,
        )
        if regulation is not None:
            regular_qs = regular_qs.filter(regulationYear=regulation)
        for subj in regular_qs:
            regular_codes.add(subj.code)

    # 2. Referred subjects from the result database.
    referred_codes = referred_codes_for_roll(student.currentRollNumber)

    all_codes = regular_codes | referred_codes
    if not all_codes:
        return {
            'available': True, 'examType': exam_type,
            'routine': _routine_meta(routine),
            'technologyResolved': bool(tech_code),
            'exams': [], 'totalExams': 0,
            'note': 'no-subjects-resolved',
        }

    # 3. Match against the imported routine.
    matched = (
        RoutineSubject.objects
        .filter(session__routine=routine, subjectCode__in=all_codes)
        .select_related('session')
    )

    # Enrich names once from the Subject catalog (English, reliable).
    for subj in Subject.objects.filter(code__in=all_codes):
        existing = subject_names.get(subj.code)
        if existing is None or (subj.regulationYear or 0) >= (existing['reg'] or 0):
            subject_names[subj.code] = {
                'name': subj.name, 'semester': subj.semester,
                'credit': subj.credit, 'reg': subj.regulationYear,
            }

    exams = []
    for row in matched:
        session = row.session
        info = subject_names.get(row.subjectCode)
        is_referred = row.subjectCode in referred_codes and row.subjectCode not in regular_codes
        end_minutes = (session.startTime.hour * 60 + session.startTime.minute
                       + session.durationMinutes)
        exams.append({
            'subjectCode': row.subjectCode,
            'subjectName': info['name'] if info else row.rawName,
            'credit': info['credit'] if info else None,
            'subjectSemester': info['semester'] if info else None,
            'date': session.examDate.isoformat(),
            'weekday': _WEEKDAYS[session.weekday],
            'startTime': session.startTime.strftime('%H:%M'),
            'endTime': f'{(end_minutes // 60) % 24:02d}:{end_minutes % 60:02d}',
            'durationMinutes': session.durationMinutes,
            'slot': session.slot,
            'section': session.section,
            'examKind': 'Theory',
            'isReferred': is_referred,
        })

    exams.sort(key=lambda e: (e['date'], e['startTime']))

    return {
        'available': True,
        'examType': exam_type,
        'routine': _routine_meta(routine),
        'technologyResolved': bool(tech_code),
        'regularCount': sum(1 for e in exams if not e['isReferred']),
        'referredCount': sum(1 for e in exams if e['isReferred']),
        'totalExams': len(exams),
        'exams': exams,
    }


def _routine_meta(routine: RoutineImport) -> dict:
    return {
        'examType': routine.examType,
        'regulationYear': routine.regulationYear,
        'examSession': routine.examSession,
        'publicationDate': routine.publicationDate.isoformat() if routine.publicationDate else None,
        'examStartDate': routine.examStartDate.isoformat() if routine.examStartDate else None,
        'examEndDate': routine.examEndDate.isoformat() if routine.examEndDate else None,
    }
