"""Routine pipeline: PDF in, RoutineOutcome out."""
from __future__ import annotations

from typing import Optional

from apps.results.parsing.extraction import PypdfExtractor, Source, TextExtractor

from .grammar import parse_theory_section
from .metadata import extract_meta
from .text import clean_lines, split_sections
from .types import RoutineOutcome
from .validation import validate

# The theory written-exam schedule is section (ক); a document may occasionally
# carry the schedule under a different leading letter, so we detect the
# schedule section by its date+code density rather than hardcoding the letter.


def parse_routine_pdf(
    source: Source, extractor: Optional[TextExtractor] = None,
) -> RoutineOutcome:
    extractor = extractor or PypdfExtractor()
    pages = extractor.extract_pages(source)
    text = clean_lines('\n'.join(page.text for page in pages))

    meta = extract_meta(text)
    outcome = RoutineOutcome(meta=meta, page_count=len(pages))

    sections = split_sections(text)
    # Parse every lettered section that looks like a written schedule (has
    # dated sittings with subject rows). In practice this is section (ক); the
    # practical section (খ) has date ranges, not per-subject rows, so it
    # yields no sessions and is naturally skipped.
    for letter, _title, body in sections:
        if not letter:
            continue
        sessions = parse_theory_section(body, outcome.issues, section='theory')
        outcome.sessions.extend(sessions)

    validate(outcome)
    return outcome
