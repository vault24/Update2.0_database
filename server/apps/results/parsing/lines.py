"""
Line classification.

Every line of every page is classified before any record parsing happens.
This is the layer that makes cross-page and cross-column records trivial:
page footers/headers that the PDF interleaves *inside* a record are
classified as boilerplate line-by-line and dropped, after which the record's
tokens become contiguous again in the assembled stream.

The classifier is a declarative rule registry. Adding support for a new
BTEB wording means adding one rule here — no control flow changes. Anything
no rule claims stays CONTENT; if it then fails record segmentation it shows
up in the residual-token audit as a warning, so unknown wordings degrade
into visible diagnostics, never silent data loss.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Pattern


class LineKind(Enum):
    #: Page furniture, letterhead, signatures, the distribution ("copy") page.
    BOILERPLATE = 'boilerplate'
    #: ``12053 - Thakurgaon Polytechnic Institute, Thakurgaon``
    INSTITUTE_HEADER = 'institute_header'
    #: The "It is to be notified…" notice paragraphs (any wrapped line).
    SECTION_PARAGRAPH = 'section_paragraph'
    #: ``Expelled: (Combined Disciplinary Rule 1.3) -``
    EXPELLED_HEADING = 'expelled_heading'
    #: Anything else — candidate record text.
    CONTENT = 'content'


@dataclass(frozen=True)
class ClassifiedLine:
    kind: LineKind
    text: str
    page: int
    match: Optional[re.Match] = None


#: ``^…$`` rules — the whole (stripped) line must match.
_FULL_LINE_BOILERPLATE: list[Pattern[str]] = [re.compile(p) for p in (
    r'Page \d+ of \d+',
    r'Bangladesh Technical Education Board',
    r'Office of the Controller of Examinations',
    r'Agargaon, Sherebangla Nagar, Dhaka-\d+',
    r'NOTICE',
    r'Note:',
    r'\(\s*En?rg\..*\)',                      # signature: ( Enrg. … )
    r'Controller of Examinations',
    r'Bangladesh Technical Education Board,\s*Dhaka',
    r'Phone\s*:.*',
    # Stray margin digits: section numerals ("1", "2") and column artifacts.
    # Real rolls are never alone on a line without their body following in
    # the same stream, and are longer than 3 digits anyway.
    r'\d{1,3}',
)]

#: Substring rules — the line belongs to a known multi-line boilerplate
#: passage if it contains one of these distinctive fragments. Wrapping can
#: split the passages at any point, so fragments cover each sentence's parts.
_FRAGMENT_BOILERPLATE: Pattern[str] = re.compile(
    '|'.join((
        # Memo/date header line (memo value is read by metadata.py, but the
        # line itself must not enter the record stream).
        r'Memo No\.',
        r'^Date\s*:',
        # "Note:" paragraph sentences.
        r'The result is hereby published',
        r'authority of correcting',
        r'holds the',
        r'No complain',
        r'will be entertained',
        r'The withheld student',
        r'admit card for next examination',
        r'candidates will be published',
        r'their candidature',
        # Distribution ("copy of the published result") page.
        r'Copy of the published result',
        r'Director General',
        r'Director \(',
        r'Secretary, Bangladesh',
        r'Principal, ',
        r'Principal/Director',
        r'Deputy Controller',
        r'Assistant Controller',
        r'Guard file',
        r'Mohammed Abul',                    # copy-page signatory name line
        r'B[an]?gladesh Technical Education Board, Dhaka',  # incl. BTEB's typo
    ))
)

#: Notice-paragraph fragments. One entry per sentence chunk a line wrap can
#: isolate, across all section wordings observed on real notices.
_SECTION_PARAGRAPH: Pattern[str] = re.compile(
    '|'.join((
        r'It is to be notified',
        r'roll numbers who have',
        r'listed below in accordance',
        r'in accordance with the regulation',
        r'beside the respective roll numbers',
        r'Examination of DIPLOMA',
        r'held in [A-Z][a-z]+',
        r'The obtained',
        r'each semester GPA',
        r'GPA & CGPA',
        r'CGPA and each semester',
        r'The subjects in which',
        r'referred in previous semester',
        r'continous assesment',              # sic — BTEB's own spelling
        r'continuous assessment',            # in case BTEB ever fixes it
    ))
)

_INSTITUTE_HEADER: Pattern[str] = re.compile(
    r'^(?P<code>\d{4,6})\s*-\s*(?P<name>[^\d\s].{2,})$'
)

# The optional digit prefix absorbs section margin numerals that the text
# layer sometimes glues onto the heading line ("5 Expelled: (…) -").
_EXPELLED_HEADING: Pattern[str] = re.compile(
    r'^(?:\d{1,3}\s+)?Expelled:\s*\((?P<rule>[^)]*)\)\s*-?\s*$'
)


def classify_line(text: str, page: int) -> ClassifiedLine:
    """Classify one raw line. Order matters: specific kinds win over CONTENT."""
    stripped = text.strip()
    if not stripped:
        return ClassifiedLine(LineKind.BOILERPLATE, stripped, page)

    for pattern in _FULL_LINE_BOILERPLATE:
        if pattern.fullmatch(stripped):
            return ClassifiedLine(LineKind.BOILERPLATE, stripped, page)
    if _FRAGMENT_BOILERPLATE.search(stripped):
        return ClassifiedLine(LineKind.BOILERPLATE, stripped, page)

    match = _EXPELLED_HEADING.match(stripped)
    if match:
        return ClassifiedLine(LineKind.EXPELLED_HEADING, stripped, page, match)

    match = _INSTITUTE_HEADER.match(stripped)
    if match:
        return ClassifiedLine(LineKind.INSTITUTE_HEADER, stripped, page, match)

    if _SECTION_PARAGRAPH.search(stripped):
        return ClassifiedLine(LineKind.SECTION_PARAGRAPH, stripped, page)

    return ClassifiedLine(LineKind.CONTENT, stripped, page)
