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


def clean_technology_name(name: str) -> str:
    """Human-readable technology name from the catalog's noisy strings.

    The course-structure PDFs sometimes emit "Technology Name: Chemical
    Technology Chemical Technology" — strip the label prefixes and collapse
    the duplicated words.
    """
    name = re.sub(r'(name of technology|technology name)\s*:?\s*', '', name, flags=re.I)
    words = name.split()
    deduped = []
    for w in words:
        if not deduped or deduped[-len(w.split()):] != [w]:
            deduped.append(w)
    # Collapse an exact "X Y X Y" repetition into "X Y".
    joined = ' '.join(deduped)
    half = len(deduped) // 2
    if half and deduped[:half] == deduped[half:]:
        joined = ' '.join(deduped[:half])
    return joined.strip() or name.strip()


def available_technologies(regulation: Optional[int] = None) -> list[dict]:
    """Distinct technologies in the Subject catalog (for the routine picker)."""
    qs = Subject.objects.exclude(techCode='')
    if regulation is not None:
        qs = qs.filter(regulationYear=regulation)
    seen: dict[str, str] = {}
    for tech_code, technology in qs.values_list('techCode', 'technology').distinct():
        if tech_code not in seen:
            seen[tech_code] = clean_technology_name(technology)
    return sorted(
        ({'techCode': code, 'name': name} for code, name in seen.items()),
        key=lambda t: t['name'],
    )


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


def generate_for_roll(
    roll: str, exam_type: str = 'final',
    tech_code: Optional[str] = None, semester: Optional[int] = None,
) -> dict:
    """Public personalized routine for a roll (no login).

    - Explicit ``tech_code`` + ``semester`` (the portal's Technology/Semester
      picker) → exact routine for that curriculum, plus the roll's referred
      subjects. This is the reliable path for any roll.
    - Else roll is an enrolled student → exact via their profile.
    - Else → best-effort inferred from result history, flagged so the UI can
      offer the picker.
    """
    routine = active_routine(exam_type)
    if routine is None:
        return {'available': False, 'reason': 'no-routine', 'examType': exam_type,
                'roll': roll}

    # Explicit Technology + Semester selection (works for any roll).
    if tech_code and semester:
        referred_codes = referred_codes_for_roll(roll)
        regular_qs = Subject.objects.filter(techCode=tech_code, semester=semester)
        if routine.regulationYear is not None:
            regular_qs = regular_qs.filter(regulationYear=routine.regulationYear)
        regular_codes = set(regular_qs.values_list('code', flat=True))
        all_codes = regular_codes | referred_codes
        payload = _match_codes(routine, all_codes, referred_codes, regular_codes)
        payload.update({
            'available': True, 'examType': exam_type, 'roll': roll,
            'routine': _routine_meta(routine), 'source': 'selected',
            'technologyResolved': bool(regular_codes),
            'selectedTech': tech_code, 'selectedSemester': semester,
        })
        return payload

    student = Student.objects.select_related('department').filter(
        currentRollNumber=roll,
    ).first()
    if student is not None:
        payload = generate_for_student(student, exam_type)
        payload['source'] = 'enrolled'
        payload['roll'] = roll
        return payload

    results = list(
        StudentResult.objects.filter(rollNumber=roll).select_related('exam')
    )
    if not results:
        return {'available': False, 'reason': 'no-data', 'examType': exam_type,
                'roll': roll}

    referred_codes = referred_codes_for_roll(roll)

    # Infer current semester: one past the latest published semester.
    latest_sem = max(r.exam.semester for r in results)
    semester = min(latest_sem + 1, 8)

    # Infer technology by majority vote over DISCRIMINATIVE referred codes
    # (codes the catalog offers under exactly one technology).
    votes: dict[str, int] = {}
    if referred_codes:
        code_techs: dict[str, set] = {}
        for code, tech in Subject.objects.filter(
            code__in=referred_codes,
        ).values_list('code', 'techCode'):
            code_techs.setdefault(code, set()).add(tech)
        for techs in code_techs.values():
            if len(techs) == 1:
                tech = next(iter(techs))
                votes[tech] = votes.get(tech, 0) + 1
    tech_code = max(votes, key=votes.get) if votes else None

    regular_codes: set[str] = set()
    if tech_code:
        regular_qs = Subject.objects.filter(techCode=tech_code, semester=semester)
        if routine.regulationYear is not None:
            regular_qs = regular_qs.filter(regulationYear=routine.regulationYear)
        regular_codes = set(regular_qs.values_list('code', flat=True))

    all_codes = regular_codes | referred_codes
    if not all_codes:
        return {
            'available': True, 'examType': exam_type, 'roll': roll,
            'routine': _routine_meta(routine), 'source': 'inferred',
            'technologyResolved': False, 'exams': [], 'totalExams': 0,
            'note': 'no-subjects-resolved',
        }

    payload = _match_codes(routine, all_codes, referred_codes, regular_codes)
    payload.update({
        'available': True, 'examType': exam_type, 'roll': roll,
        'routine': _routine_meta(routine), 'source': 'inferred',
        'technologyResolved': bool(tech_code),
        'inferredSemester': semester if tech_code else None,
    })
    return payload


def _match_codes(routine: RoutineImport, all_codes: set[str],
                 referred_codes: set[str], regular_codes: set[str]) -> dict:
    """Match subject codes against the routine → enriched, sorted exam list."""
    subject_names: dict[str, dict] = {}
    for subj in Subject.objects.filter(code__in=all_codes):
        existing = subject_names.get(subj.code)
        if existing is None or (subj.regulationYear or 0) >= (existing['reg'] or 0):
            subject_names[subj.code] = {
                'name': subj.name, 'semester': subj.semester,
                'credit': subj.credit, 'reg': subj.regulationYear,
            }

    matched = (
        RoutineSubject.objects
        .filter(session__routine=routine, subjectCode__in=all_codes)
        .select_related('session')
    )
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
