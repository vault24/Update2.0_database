"""
Database import of a parsed BTEB result PDF.

Responsibilities:
- deduplicate uploads by file hash (same official PDF can't import twice)
- map the ParseOutcome onto ORM rows in one transaction
- replace previously-imported rolls of the same exam (BTEB republished /
  corrected notices win over older data)
- persist every parser issue for the admin review screen
- trigger automatic student-profile synchronisation afterwards

The parser itself stays Django-free; this module is the only bridge between
ParseOutcome dataclasses and models.
"""
from __future__ import annotations

import hashlib
import logging
import time
from datetime import datetime
from typing import Optional

from django.db import transaction
from django.utils import timezone

from .models import (
    Exam,
    Institute,
    ParserIssue,
    ResultImport,
    ResultSubject,
    SemesterGPA,
    StudentResult,
)
from .parsing import ParseOutcome, parse_result_pdf
from .sync import sync_students_for_rolls

logger = logging.getLogger(__name__)

_BULK_BATCH = 2000


class ImportError_(Exception):
    """Base class for import failures the API can report cleanly."""


class AlreadyImportedError(ImportError_):
    def __init__(self, existing: ResultImport):
        self.existing = existing
        super().__init__(
            f'This PDF was already imported on '
            f'{existing.createdAt:%Y-%m-%d %H:%M} ({existing.fileName})'
        )


class UnparsablePdfError(ImportError_):
    pass


def import_result_pdf(
    *,
    file_bytes: bytes,
    file_name: str,
    uploaded_by=None,
    replace: bool = False,
) -> ResultImport:
    """Parse and import one official BTEB result PDF.

    Raises AlreadyImportedError when the identical file was imported before
    and ``replace`` is False. Any other failure is recorded on the
    ResultImport row (status='failed') and re-raised.
    """
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    existing = ResultImport.objects.filter(fileSha256=sha256).first()
    if existing is not None:
        if existing.status == 'completed' and not replace:
            raise AlreadyImportedError(existing)
        # Interrupted or explicitly-replaced import: cascade-delete its data.
        existing.delete()

    record = ResultImport.objects.create(
        fileName=file_name,
        fileSha256=sha256,
        uploadedBy=uploaded_by,
        status='processing',
    )
    try:
        started = time.monotonic()
        outcome = parse_result_pdf(file_bytes)
        parse_seconds = time.monotonic() - started

        if outcome.exam.semester is None or outcome.exam.regulation_year is None:
            raise UnparsablePdfError(
                'The exam identity (semester / regulation) could not be read '
                'from the PDF — is this an official BTEB result notice?'
            )

        started = time.monotonic()
        with transaction.atomic():
            stats = _persist(record, outcome)
        db_seconds = time.monotonic() - started

        started = time.monotonic()
        stats['sync'] = sync_students_for_rolls(
            {parsed.roll for inst in outcome.institutes for parsed in inst.records}
        )
        stats['timings'] = {
            'parseSeconds': round(parse_seconds, 2),
            'dbSeconds': round(db_seconds, 2),
            'syncSeconds': round(time.monotonic() - started, 2),
        }

        record.stats = stats
        record.status = 'completed'
        record.completedAt = timezone.now()
        record.save(update_fields=['stats', 'status', 'completedAt'])
        return record

    except AlreadyImportedError:
        raise
    except Exception as exc:
        logger.exception('Result import failed for %s', file_name)
        record.status = 'failed'
        record.errorMessage = str(exc)
        record.completedAt = timezone.now()
        record.save(update_fields=['status', 'errorMessage', 'completedAt'])
        raise


def import_subject_pdf(*, file_bytes: bytes, file_name: str) -> dict:
    """Parse a BTEB Probidhan course-structure PDF and upsert the subject
    catalog. Synchronous (these PDFs are a handful of pages).

    Returns stats for the admin UI; raises UnparsablePdfError when the file
    is not a course-structure document.
    """
    from .models import Subject
    from .parsing.subjects import parse_subject_pdf

    outcome = parse_subject_pdf(file_bytes)
    if not outcome.subjects:
        detail = outcome.issues[0].message if outcome.issues else 'no subjects found'
        raise UnparsablePdfError(
            f'{file_name}: could not read the course structure — {detail}'
        )

    created = updated = 0
    with transaction.atomic():
        for parsed in outcome.subjects:
            _, was_created = Subject.objects.update_or_create(
                code=parsed.code,
                regulationYear=parsed.regulation_year,
                defaults={
                    'name': parsed.name,
                    'semester': parsed.semester,
                    'technology': parsed.technology,
                    'techCode': parsed.tech_code,
                    'credit': parsed.credit,
                    'theoryPeriods': parsed.theory_periods,
                    'practicalPeriods': parsed.practical_periods,
                    'theoryContinuous': parsed.theory_continuous,
                    'theoryFinal': parsed.theory_final,
                    'theoryTotal': parsed.theory_total,
                    'practicalContinuous': parsed.practical_continuous,
                    'practicalFinal': parsed.practical_final,
                    'practicalTotal': parsed.practical_total,
                    'totalMarks': parsed.total_marks,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

    return {
        'fileName': file_name,
        'technology': outcome.technology,
        'techCode': outcome.tech_code,
        'regulationYear': outcome.regulation_year,
        'semesters': outcome.semesters,
        'created': created,
        'updated': updated,
        'issues': [
            {'severity': i.severity, 'code': i.code, 'message': i.message}
            for i in outcome.issues
        ],
    }


def _publication_date(raw: str) -> Optional[datetime]:
    try:
        return datetime.strptime(raw, '%d-%m-%Y').date()
    except (ValueError, TypeError):
        return None


def _persist(record: ResultImport, outcome: ParseOutcome) -> dict:
    exam, _ = Exam.objects.get_or_create(
        semester=outcome.exam.semester,
        regulationYear=outcome.exam.regulation_year,
        program=outcome.exam.program,
        heldIn=outcome.exam.held_in,
        defaults={
            'publicationDate': _publication_date(outcome.exam.publication_date),
            'memoNo': outcome.exam.memo_no,
        },
    )
    record.exam = exam
    record.pageCount = outcome.page_count
    record.save(update_fields=['exam', 'pageCount'])

    institutes: dict[str, Institute] = {}
    for parsed in outcome.institutes:
        institute, created = Institute.objects.get_or_create(
            code=parsed.code, defaults={'name': parsed.name},
        )
        if not created and parsed.name and institute.name != parsed.name:
            # Institute renamed (or an earlier import saw a truncated name):
            # the newest official notice wins.
            institute.name = parsed.name
            institute.save(update_fields=['name'])
        institutes[parsed.code] = institute

    # A re-published notice for the same exam replaces its rolls.
    incoming_rolls = [r.roll for inst in outcome.institutes for r in inst.records]
    replaced = StudentResult.objects.filter(
        exam=exam, rollNumber__in=incoming_rolls,
    ).delete()[1].get('results.StudentResult', 0)

    results: list[StudentResult] = []
    seen_rolls: set[str] = set()
    skipped_duplicates = 0
    for inst in outcome.institutes:
        for parsed in inst.records:
            if parsed.roll in seen_rolls:
                skipped_duplicates += 1  # already reported by the validator
                continue
            seen_rolls.add(parsed.roll)
            results.append(StudentResult(
                exam=exam,
                institute=institutes[inst.code],
                importRecord=record,
                rollNumber=parsed.roll,
                resultType=parsed.family.value,
                cgpa=parsed.cgpa,
                expelledRule=parsed.expelled_rule,
            ))
    StudentResult.objects.bulk_create(results, batch_size=_BULK_BATCH)

    # Backend-agnostic id mapping (bulk_create pk return varies by DB).
    id_by_roll = dict(
        StudentResult.objects.filter(exam=exam, importRecord=record)
        .values_list('rollNumber', 'id')
    )

    gpas: list[SemesterGPA] = []
    subjects: list[ResultSubject] = []
    emitted: set[str] = set()
    for inst in outcome.institutes:
        for parsed in inst.records:
            result_id = id_by_roll.get(parsed.roll)
            if result_id is None or parsed.roll in emitted:
                continue
            emitted.add(parsed.roll)
            for grade in parsed.grades:
                gpas.append(SemesterGPA(
                    result_id=result_id,
                    semester=grade.semester,
                    gpa=grade.gpa,
                    isReferred=grade.gpa is None,
                ))
            for subject in parsed.subjects:
                subjects.append(ResultSubject(
                    result_id=result_id,
                    subjectCode=subject.code,
                    role=subject.role.value,
                    hasTheory=subject.theory,
                    hasPractical=subject.practical,
                ))
    SemesterGPA.objects.bulk_create(gpas, batch_size=_BULK_BATCH)
    ResultSubject.objects.bulk_create(subjects, batch_size=_BULK_BATCH)

    ParserIssue.objects.bulk_create(
        [
            ParserIssue(
                importRecord=record,
                severity=issue.severity,
                stage=issue.stage,
                code=issue.code,
                message=issue.message,
                context=issue.context,
                rollNumber=issue.roll,
            )
            for issue in outcome.issues
        ],
        batch_size=_BULK_BATCH,
    )

    stats = outcome.stats()
    stats['replacedExisting'] = replaced
    stats['skippedDuplicateRolls'] = skipped_duplicates
    return stats
