"""
Pipeline orchestration: PDF in, ParseOutcome out.

Two-pass residual resolution: every section is segmented first so the modal
roll length of the whole document is known, then residual tokens are audited
against it (bare expelled rolls are promoted to records; everything else is
reported). This keeps "what is a roll" adaptive per document instead of
hardcoding today's 6-digit scheme.
"""
from __future__ import annotations

from typing import Optional

from .assembler import assemble
from .extraction import PypdfExtractor, Source, TextExtractor
from .grammar import modal_roll_length, parse_section, resolve_residuals
from .lines import classify_line
from .metadata import extract_exam_meta
from .types import InstituteResults, ParseIssue, ParseOutcome
from .validation import validate


def parse_result_pdf(
    source: Source, extractor: Optional[TextExtractor] = None,
) -> ParseOutcome:
    extractor = extractor or PypdfExtractor()
    pages = extractor.extract_pages(source)

    classified = [
        classify_line(line, page.number)
        for page in pages
        for line in page.text.splitlines()
    ]
    document = assemble(classified)

    issues: list[ParseIssue] = []
    exam = extract_exam_meta(
        document.paragraph_text,
        '\n'.join(page.text for page in pages),
        issues,
    )

    if document.orphan_stream.strip():
        issues.append(ParseIssue(
            'warning', 'parse', 'content-before-first-institute',
            'Content found before the first institute header',
            context=document.orphan_stream[:300],
        ))

    section_parses = [
        (section, parse_section(section.stream, section.expelled_rules))
        for section in document.sections
    ]

    all_records = [r for _, parse in section_parses for r in parse.records]
    roll_length = modal_roll_length(all_records)

    outcome = ParseOutcome(exam=exam, issues=issues, page_count=len(pages))
    for section, parsed in section_parses:
        resolve_residuals(
            parsed,
            section.expelled_rules,
            roll_length,
            f'institute {section.code}',
        )
        outcome.institutes.append(InstituteResults(
            code=section.code,
            name=section.name,
            records=parsed.records,
        ))
        outcome.issues.extend(parsed.issues)

    validate(outcome)
    return outcome
