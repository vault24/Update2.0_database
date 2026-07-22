"""
Database import of a parsed BTEB routine PDF.

Deduplicates by file hash, persists sessions + subjects in one transaction,
records parser issues, and marks the newest completed import of an
(examType, regulation) as the single active routine the generator reads.
"""
from __future__ import annotations

import hashlib
import logging
import time as _time
from datetime import datetime
from typing import Optional

from django.db import transaction
from django.utils import timezone

from .models import (
    RoutineImport,
    RoutineParserIssue,
    RoutineSession,
    RoutineSubject,
)
from .parsing import parse_routine_pdf

logger = logging.getLogger(__name__)

_BULK = 2000


class RoutineImportError(Exception):
    pass


class AlreadyImportedError(RoutineImportError):
    def __init__(self, existing: RoutineImport):
        self.existing = existing
        super().__init__(
            f'This routine PDF was already imported on '
            f'{existing.createdAt:%Y-%m-%d %H:%M}'
        )


class UnparsableRoutineError(RoutineImportError):
    pass


def _date(iso: Optional[str]):
    try:
        return datetime.strptime(iso, '%d-%m-%Y').date() if iso else None
    except (ValueError, TypeError):
        return None


def import_routine_pdf(
    *, file_bytes: bytes, file_name: str, uploaded_by=None, replace: bool = False,
) -> RoutineImport:
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    existing = RoutineImport.objects.filter(fileSha256=sha256).first()
    if existing is not None:
        if existing.status == 'completed' and not replace:
            raise AlreadyImportedError(existing)
        existing.delete()

    record = RoutineImport.objects.create(
        fileName=file_name, fileSha256=sha256, uploadedBy=uploaded_by,
        status='processing',
    )
    try:
        started = _time.monotonic()
        outcome = parse_routine_pdf(file_bytes)
        parse_seconds = _time.monotonic() - started

        if not outcome.sessions:
            raise UnparsableRoutineError(
                'No exam sessions could be read from this PDF — is it an '
                'official BTEB routine notice?'
            )

        stats = outcome.stats()
        with transaction.atomic():
            record.regulationYear = outcome.meta.regulation_year
            record.examType = outcome.meta.exam_type
            record.examSession = outcome.meta.exam_session
            record.memoNo = outcome.meta.memo_no
            record.publicationDate = _date(outcome.meta.publication_date)
            record.examStartDate = _date(stats.get('examStartDate') and
                                         _to_ddmmyyyy(stats['examStartDate']))
            record.examEndDate = _date(stats.get('examEndDate') and
                                       _to_ddmmyyyy(stats['examEndDate']))
            record.pageCount = outcome.page_count
            record.save()

            sessions = []
            for data in outcome.sessions:
                sessions.append(RoutineSession(
                    routine=record, section=data.section, examDate=data.exam_date,
                    weekday=data.weekday, slot=data.slot, startTime=data.start_time,
                    durationMinutes=data.duration_minutes, poboLabel=data.pobo_label,
                    regulationYear=data.regulation_year,
                ))
            RoutineSession.objects.bulk_create(sessions, batch_size=_BULK)

            subjects = []
            for session_obj, data in zip(sessions, outcome.sessions):
                for parsed in data.subjects:
                    subjects.append(RoutineSubject(
                        session=session_obj, subjectCode=parsed.subject_code,
                        rawName=parsed.raw_name,
                        techApplicability=parsed.tech_applicability,
                        serial=parsed.serial,
                    ))
            RoutineSubject.objects.bulk_create(subjects, batch_size=_BULK)

            RoutineParserIssue.objects.bulk_create([
                RoutineParserIssue(
                    routine=record, severity=i.severity, stage=i.stage,
                    code=i.code, message=i.message, context=i.context,
                )
                for i in outcome.issues
            ], batch_size=_BULK)

            # Activate this routine (one active per examType + regulation).
            RoutineImport.objects.filter(
                examType=record.examType, regulationYear=record.regulationYear,
                isActive=True,
            ).exclude(pk=record.pk).update(isActive=False)
            record.isActive = True

        stats['timings'] = {'parseSeconds': round(parse_seconds, 2)}
        record.stats = stats
        record.status = 'completed'
        record.completedAt = timezone.now()
        record.save(update_fields=['stats', 'status', 'completedAt', 'isActive'])
        return record

    except AlreadyImportedError:
        raise
    except Exception as exc:
        logger.exception('Routine import failed for %s', file_name)
        record.status = 'failed'
        record.errorMessage = str(exc)
        record.completedAt = timezone.now()
        record.save(update_fields=['status', 'errorMessage', 'completedAt'])
        raise


def _to_ddmmyyyy(iso: str) -> str:
    y, m, d = iso.split('-')
    return f'{d}-{m}-{y}'
