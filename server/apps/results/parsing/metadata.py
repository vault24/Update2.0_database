"""
Exam metadata extraction.

The exam identity is read from the notice paragraphs' canonical sentence:

    "... in the 5th Semester (2022 Regulation) Examination of
     DIPLOMA IN ENGINEERING, 2025 held in January-March, 2026 ..."

and from the page header's "Memo No." / "Date :" lines. Every institute
section repeats the same values, so we take the most common match across the
whole document — a single garbled instance (bad line wrap, OCR noise) can
never corrupt the metadata.
"""
from __future__ import annotations

import re
from collections import Counter

from .types import ExamMeta, ParseIssue

_EXAM_SENTENCE = re.compile(
    r'(?P<semester>\d{1,2})(?:st|nd|rd|th)\s+Semester\s*'
    r'\(\s*(?P<regulation>\d{4})\s+Regulation\s*\)\s*'
    r'Examination\s+of\s+(?P<program>[A-Z][A-Z &.]+?),\s*'
    r'(?P<held>\d{4}\s+held\s+in\s+[A-Za-z]+(?:-[A-Za-z]+)?,\s*\d{4})'
)

#: Plain notice memo, e.g. "57.17.0000.301.31.002.25.300". The distribution
#: page's "(522)"-suffixed variant is excluded so the notice memo wins.
_MEMO = re.compile(r'Memo No\.\s*(?P<memo>[\d.]+)(?!\()')
_DATE = re.compile(r'Date\s*:\s*(?P<date>\d{2}-\d{2}-\d{4})')


def extract_exam_meta(
    paragraph_text: str, raw_pages_text: str, issues: list[ParseIssue],
) -> ExamMeta:
    meta = ExamMeta()

    sentences = Counter(
        (m.group('semester'), m.group('regulation'), m.group('program'), m.group('held'))
        for m in _EXAM_SENTENCE.finditer(paragraph_text)
    )
    if sentences:
        semester, regulation, program, held = sentences.most_common(1)[0][0]
        meta.semester = int(semester)
        meta.regulation_year = int(regulation)
        meta.program = program.strip()
        meta.held_in = re.sub(r'\s+', ' ', held).strip()
        if len(sentences) > 1:
            issues.append(ParseIssue(
                'warning', 'parse', 'ambiguous-exam-sentence',
                f'{len(sentences)} distinct exam identities found in the '
                f'notice paragraphs; using the most frequent one',
                context=str(sentences.most_common(3)),
            ))
    else:
        issues.append(ParseIssue(
            'error', 'parse', 'missing-exam-metadata',
            'Could not find the exam identity sentence ("Nth Semester '
            '(YYYY Regulation) Examination of …") in any notice paragraph',
        ))

    memos = Counter(m.group('memo') for m in _MEMO.finditer(raw_pages_text))
    if memos:
        meta.memo_no = memos.most_common(1)[0][0].rstrip('.')

    dates = Counter(m.group('date') for m in _DATE.finditer(raw_pages_text))
    if dates:
        meta.publication_date = dates.most_common(1)[0][0]

    return meta
