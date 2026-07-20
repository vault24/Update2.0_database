"""
Typed data model for everything the parser produces.

These are plain dataclasses (no Django) so parser code and tests never need
a database. The importer maps them onto ORM models.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum
from typing import Optional


class RecordFamily(str, Enum):
    """The grammatical families a published result record can belong to.

    The family is decided by the record's own syntax — never by which notice
    section it appeared under — so section re-ordering or new section
    wordings cannot mislabel records.
    """

    #: ``ROLL (gpa5: 3.36, ..., gpa1: 3.23)`` — passed every subject.
    #: Final-semester variant ``ROLL cgpa: 3.28 (gpa8: ..., gpa1: ...)``
    #: additionally carries a cgpa.
    PASSED = 'passed'
    #: ``ROLL { gpa5: ref, ..., ref_sub: 26441(T), ... }`` — failed a small
    #: number of subjects; GPA history with 'ref' placeholders.
    REFERRED = 'referred'
    #: ``ROLL { 26441(T), 26442(T,P), ... }`` — failed many subjects; no GPA
    #: block, only subject codes.
    FAILED = 'failed'
    #: ``ROLL ( Expelled_sub - 26453; reffered_sub - ... )`` or a bare roll
    #: under an "Expelled: (Combined Disciplinary Rule X.Y) -" heading.
    EXPELLED = 'expelled'
    #: ``ROLL ( continuousfail_sub- 26481; reffered_sub- ... )`` — failed the
    #: continuous-assessment (theory/practical) part.
    CONTINUOUS_FAIL = 'continuous_fail'


class SubjectRole(str, Enum):
    """Why a subject code is attached to a record."""

    REFERRED = 'referred'
    EXPELLED = 'expelled'
    CONTINUOUS_FAIL = 'continuous_fail'


@dataclass(frozen=True)
class SubjectRef:
    """One subject code with its theory/practical flags.

    BTEB prints ``26441(T)``, ``26471(P)`` or ``26447(T,P)``; expelled and
    continuous-assessment codes appear bare (both flags False).
    """

    code: str
    theory: bool = False
    practical: bool = False
    role: SubjectRole = SubjectRole.REFERRED


@dataclass(frozen=True)
class SemesterGrade:
    """One semester inside a GPA history; gpa is None when printed as 'ref'."""

    semester: int
    gpa: Optional[Decimal]

    @property
    def is_referred(self) -> bool:
        return self.gpa is None


@dataclass
class ParsedRecord:
    """One student's parsed result."""

    roll: str
    family: RecordFamily
    cgpa: Optional[Decimal] = None
    grades: list[SemesterGrade] = field(default_factory=list)
    subjects: list[SubjectRef] = field(default_factory=list)
    #: Disciplinary rule text for expelled students, when published.
    expelled_rule: str = ''


@dataclass
class ParseIssue:
    """A diagnostic produced anywhere in the pipeline."""

    severity: str  # 'error' | 'warning' | 'info'
    stage: str     # 'extract' | 'classify' | 'parse' | 'validate'
    code: str      # stable machine code, e.g. 'residual-tokens'
    message: str
    context: str = ''
    roll: str = ''


@dataclass
class ExamMeta:
    """Exam identity extracted from the notice paragraphs and page header."""

    semester: Optional[int] = None
    regulation_year: Optional[int] = None
    program: str = ''
    held_in: str = ''
    publication_date: str = ''   # dd-mm-yyyy as printed
    memo_no: str = ''


@dataclass
class InstituteResults:
    """Everything parsed from one institute's notice section."""

    code: str
    name: str
    records: list[ParsedRecord] = field(default_factory=list)


@dataclass
class ParseOutcome:
    """The full result of parsing one PDF."""

    exam: ExamMeta
    institutes: list[InstituteResults] = field(default_factory=list)
    issues: list[ParseIssue] = field(default_factory=list)
    page_count: int = 0

    @property
    def records(self) -> list[ParsedRecord]:
        return [r for inst in self.institutes for r in inst.records]

    def stats(self) -> dict:
        """Aggregate statistics for the import screen / ImportLog."""
        by_family: dict[str, int] = {}
        for record in self.records:
            by_family[record.family.value] = by_family.get(record.family.value, 0) + 1
        by_severity: dict[str, int] = {}
        for issue in self.issues:
            by_severity[issue.severity] = by_severity.get(issue.severity, 0) + 1
        return {
            'pageCount': self.page_count,
            'instituteCount': len(self.institutes),
            'recordCount': len(self.records),
            'recordsByType': by_family,
            'issuesBySeverity': by_severity,
        }
