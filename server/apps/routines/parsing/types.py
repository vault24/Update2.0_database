"""Typed data model produced by the routine parser (no Django)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, time
from typing import Optional


@dataclass(frozen=True)
class ParsedRoutineSubject:
    subject_code: str
    raw_name: str = ''
    tech_applicability: str = ''
    serial: Optional[int] = None


@dataclass
class RoutineSessionData:
    section: str            # 'theory' | 'practical'
    exam_date: date
    start_time: time
    slot: str               # 'morning' | 'afternoon' | 'other'
    weekday: int            # derived from exam_date (0=Mon … 6=Sun)
    duration_minutes: int = 180
    pobo_label: str = ''
    regulation_year: Optional[int] = None
    subjects: list[ParsedRoutineSubject] = field(default_factory=list)


@dataclass
class RoutineIssue:
    severity: str           # 'error' | 'warning' | 'info'
    stage: str              # 'extract' | 'section' | 'parse' | 'validate'
    code: str
    message: str
    context: str = ''


@dataclass
class RoutineMeta:
    regulation_year: Optional[int] = None
    exam_type: str = 'final'
    exam_session: str = ''      # e.g. "পরীক্ষা-২০২৫"
    memo_no: str = ''
    publication_date: str = ''  # dd-mm-yyyy as printed


@dataclass
class RoutineOutcome:
    meta: RoutineMeta
    sessions: list[RoutineSessionData] = field(default_factory=list)
    issues: list[RoutineIssue] = field(default_factory=list)
    page_count: int = 0

    @property
    def subjects(self) -> list[ParsedRoutineSubject]:
        return [s for session in self.sessions for s in session.subjects]

    def stats(self) -> dict:
        by_section: dict[str, int] = {}
        for session in self.sessions:
            by_section[session.section] = by_section.get(session.section, 0) + 1
        by_severity: dict[str, int] = {}
        for issue in self.issues:
            by_severity[issue.severity] = by_severity.get(issue.severity, 0) + 1
        dates = [s.exam_date for s in self.sessions]
        return {
            'pageCount': self.page_count,
            'sessionCount': len(self.sessions),
            'sessionsBySection': by_section,
            'subjectCount': len(self.subjects),
            'examStartDate': min(dates).isoformat() if dates else None,
            'examEndDate': max(dates).isoformat() if dates else None,
            'issuesBySeverity': by_severity,
        }
