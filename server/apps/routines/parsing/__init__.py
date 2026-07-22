"""
BTEB exam-routine parsing engine.

Pure-Python (Django-free) so it is unit-testable without a database. Reuses
the result module's PDF text extractor. Public entry point:

    from apps.routines.parsing import parse_routine_pdf
    outcome = parse_routine_pdf("routine.pdf")

Pipeline: extract text → strip page furniture → split the lettered sections
(only theory schedule is a per-subject routine) → walk sessions (date/time/
pobo) collecting subject rows (serial/code/name/tech) → validate.

Design rule (same as the result parser): anchor on the data's own grammar
(dates, 5-digit codes), never on page geometry, and normalize Bengali↔Latin
digits so the numeric anchors are robust.
"""
from .pipeline import parse_routine_pdf
from .types import (
    ParsedRoutineSubject,
    RoutineIssue,
    RoutineMeta,
    RoutineOutcome,
    RoutineSessionData,
)

__all__ = [
    'parse_routine_pdf',
    'ParsedRoutineSubject',
    'RoutineIssue',
    'RoutineMeta',
    'RoutineOutcome',
    'RoutineSessionData',
]
