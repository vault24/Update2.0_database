"""
BTEB result-PDF parsing engine.

Pure-Python (no Django imports) so the whole pipeline is unit-testable and
reusable outside the web app. Public entry point:

    from apps.results.parsing import parse_result_pdf
    outcome = parse_result_pdf("RESULT_5th_2022_Regulation.pdf")

Pipeline stages (each independently replaceable):

    extraction  -> raw text per page (pypdf, content-stream order)
    lines       -> classify every line: boilerplate / headers / content
    assembler   -> contiguous record stream per institute section
    grammar     -> segment streams into records, parse each record family
    metadata    -> exam identity from the notice paragraphs
    validation  -> semantic checks + residual-token audit
    pipeline    -> orchestrates the above into a ParseOutcome

Design rule: nothing keys off page numbers or coordinates. Records are
recognised purely by their own grammar, so BTEB re-flowing the layout does
not break parsing; genuinely new constructs surface as residual-token
issues instead of disappearing silently.
"""
from .pipeline import parse_result_pdf
from .types import (
    ExamMeta,
    InstituteResults,
    ParseIssue,
    ParseOutcome,
    ParsedRecord,
    RecordFamily,
    SemesterGrade,
    SubjectRef,
    SubjectRole,
)

__all__ = [
    'parse_result_pdf',
    'ExamMeta',
    'InstituteResults',
    'ParseIssue',
    'ParseOutcome',
    'ParsedRecord',
    'RecordFamily',
    'SemesterGrade',
    'SubjectRef',
    'SubjectRole',
]
