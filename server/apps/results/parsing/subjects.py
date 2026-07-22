"""
BTEB Probidhan course-structure PDF parser.

Input: the official per-technology "Course Structure of Diploma in
Engineering Probidhan-YYYY" PDF. Each semester is a table:

    Computer Science & Technology (85) 3rd Semester
    Code  Name  Theory Practical  Continuous Final Total  Continuous Final Total  [Grand Total]
    3 25931 Mathematics-III 3 3 4 60 90 150 25 25 50 200

Hazards handled (all observed on the real documents):
- subject names wrap across lines ("Computer Architecture &\\nMicroprocessor")
- missing values print as "-" — and are sometimes omitted entirely
  ("Principles of Marketing 2  2 40 60 100 - - - 100" has no practical
  periods token at all)
- the newer 7-semester technologies (73/74/75 …) print EXTRA columns after
  the Grand Total ("… 150 - - - - 3"), a variable number per row, so
  neither pure front- nor end-alignment works; the 7 marks columns are
  located by their arithmetic invariants instead (thC+thF=thT,
  prC+prF=prT, thT+prT=GT)
- glued tokens from extraction: a code fused to the next word ("27372AI…")
  and a name fused to its first numeric column ("…Remote Sensing2 3 3 …")
- per-semester totals rows ("13 21 20 260 …") have no 5-digit code in the
  second position, so the row anchor skips them, as it does the "38.2%" rows

Like the result parser: pure Python, anchored on the rows' own grammar,
nothing keyed to page positions.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from .extraction import PypdfExtractor, Source, TextExtractor
from .types import ParseIssue


@dataclass
class ParsedSubject:
    code: str
    name: str
    semester: int
    technology: str = ''
    tech_code: str = ''
    regulation_year: Optional[int] = None
    credit: Optional[int] = None
    theory_periods: Optional[int] = None
    practical_periods: Optional[int] = None
    theory_continuous: Optional[int] = None
    theory_final: Optional[int] = None
    theory_total: Optional[int] = None
    practical_continuous: Optional[int] = None
    practical_final: Optional[int] = None
    practical_total: Optional[int] = None
    total_marks: Optional[int] = None


@dataclass
class SubjectParseOutcome:
    subjects: list[ParsedSubject] = field(default_factory=list)
    issues: list[ParseIssue] = field(default_factory=list)
    technology: str = ''
    tech_code: str = ''
    regulation_year: Optional[int] = None
    semesters: list[int] = field(default_factory=list)


#: "Computer Science & Technology (85) 3rd Semester"
_SECTION = re.compile(
    r'^(?P<tech>[^\n(]+?)\s*\((?P<code>\d{1,3})\)\s+'
    r'(?P<sem>\d{1,2})(?:st|nd|rd|th)\s+Semester',
    re.M,
)

_PROBIDHAN = re.compile(r'Probidhan[\s-]*(?P<year>\d{4})', re.I)

#: Row anchor: serial + 5-digit subject code. The totals rows fail this
#: (their second token is not a 5-digit code). The lookahead (instead of
#: consuming whitespace) also anchors rows whose code fused to the name
#: during extraction ("4 27372AI for Photogrammetry …").
_ROW = re.compile(r'^\s*\d{1,2}\s+(?P<code>\d{5})(?=\s|[A-Za-z])', re.M)

#: A value token in the numeric tail: an integer or the "-" placeholder.
_VALUE = re.compile(r'^(?:\d{1,4}|-+)$')


def _to_int(token: str) -> Optional[int]:
    return int(token) if token.isdigit() else None


def _marks_window(tail: list[str]) -> int:
    """Find where the 7 marks columns start inside the numeric tail.

    Layouts vary: the classic 10-column rows end with the marks (start =
    len-7); the newer technologies append a variable number of extra
    columns after the Grand Total, and occasionally omit a periods token.
    At most 3 tokens (theory periods, practical periods, credit) can sit
    before the marks, so try starts 0..3 and score each window by the
    printed arithmetic: thC+thF=thT, prC+prF=prT, thT+prT=GT.
    """
    best_start, best_score = 0, None
    for start in range(0, min(3, len(tail) - 7) + 1):
        thC, thF, thT, prC, prF, prT, gt = (
            _to_int(t) for t in tail[start:start + 7]
        )
        score = 0
        for a, b, c in ((thC, thF, thT), (prC, prF, prT)):
            if a is not None and b is not None and c is not None:
                score += 2 if a + b == c else -2
        if gt is not None:
            score += 1 if (thT or 0) + (prT or 0) == gt else -1
        else:
            score -= 1
        # Ties go to the later start (more head tokens = classic layout).
        if best_score is None or score >= best_score:
            best_start, best_score = start, score
    return best_start


def _parse_row(code: str, body: str, semester: int, issues: list[ParseIssue]) -> Optional[dict]:
    """Split one row body (after the code) into name + numeric columns."""
    # Un-glue a name fused to its first numeric column ("…Sensing2 3 3 …").
    body = re.sub(r'(?<=[A-Za-z])(?=\d)', ' ', body)
    tokens = body.split()
    # Walk back from the end collecting the whole numeric tail (up to 20:
    # 3 periods/credit + 7 marks + extra columns on the newer layouts).
    tail: list[str] = []
    while tokens and _VALUE.match(tokens[-1]) and len(tail) < 20:
        tail.insert(0, tokens.pop())
    name = ' '.join(tokens).strip()

    if not name or len(tail) < 7:
        issues.append(ParseIssue(
            'warning', 'parse', 'subject-row-unparsed',
            f'Could not split subject row for code {code} '
            f'(semester {semester})',
            context=body[:160],
        ))
        return None

    # Locate the 7 marks columns (TheoryCont, TheoryFinal, TheoryTotal,
    # PracCont, PracFinal, PracTotal, GrandTotal); what precedes them
    # (0–3 tokens) is periods + credit, credit last. Tokens after the
    # marks are the newer layouts' extra columns — ignored.
    start = _marks_window(tail)
    marks = tail[start:start + 7]
    head = tail[:start]
    credit = _to_int(head[-1]) if head else None
    theory_periods = _to_int(head[0]) if len(head) >= 2 else None
    practical_periods = _to_int(head[1]) if len(head) >= 3 else None

    return {
        'name': re.sub(r'\s+', ' ', name),
        'credit': credit,
        'theory_periods': theory_periods,
        'practical_periods': practical_periods,
        'theory_continuous': _to_int(marks[0]),
        'theory_final': _to_int(marks[1]),
        'theory_total': _to_int(marks[2]),
        'practical_continuous': _to_int(marks[3]),
        'practical_final': _to_int(marks[4]),
        'practical_total': _to_int(marks[5]),
        'total_marks': _to_int(marks[6]),
    }


def parse_subject_pdf(
    source: Source, extractor: Optional[TextExtractor] = None,
) -> SubjectParseOutcome:
    extractor = extractor or PypdfExtractor()
    pages = extractor.extract_pages(source)
    text = '\n'.join(page.text for page in pages)

    outcome = SubjectParseOutcome()

    match = _PROBIDHAN.search(text)
    if match:
        outcome.regulation_year = int(match.group('year'))

    sections = list(_SECTION.finditer(text))
    if not sections:
        outcome.issues.append(ParseIssue(
            'error', 'parse', 'no-subject-sections',
            'No "<Technology> (NN) Nth Semester" section headers found — is '
            'this an official BTEB course-structure PDF?',
        ))
        return outcome

    outcome.technology = sections[0].group('tech').strip()
    outcome.tech_code = sections[0].group('code')

    seen: dict[tuple[str, int], ParsedSubject] = {}
    for index, section in enumerate(sections):
        semester = int(section.group('sem'))
        start = section.end()
        end = sections[index + 1].start() if index + 1 < len(sections) else len(text)
        block = text[start:end]

        rows = list(_ROW.finditer(block))
        for row_index, row in enumerate(rows):
            row_end = rows[row_index + 1].start() if row_index + 1 < len(rows) else len(block)
            # A row slice may include the per-semester totals line and the
            # percentage line (they follow the LAST subject of a section).
            # Wrapped-name continuation lines always contain letters, while
            # the totals line is numbers-only — cut there.
            kept_lines = []
            for line in block[row.end():row_end].splitlines():
                stripped = line.strip()
                if not stripped:
                    continue
                is_numbers_only = (
                    not re.search(r'[A-Za-z]', stripped)
                    and len(stripped.split()) >= 5
                )
                if is_numbers_only or '%' in stripped:
                    break
                kept_lines.append(stripped)
            body = ' '.join(kept_lines).strip()

            parsed = _parse_row(row.group('code'), body, semester, outcome.issues)
            if parsed is None:
                continue
            key = (row.group('code'), semester)
            seen[key] = ParsedSubject(
                code=row.group('code'),
                semester=semester,
                technology=outcome.technology,
                tech_code=outcome.tech_code,
                regulation_year=outcome.regulation_year,
                **parsed,
            )
        if semester not in outcome.semesters:
            outcome.semesters.append(semester)

    outcome.subjects = list(seen.values())
    if not outcome.subjects:
        outcome.issues.append(ParseIssue(
            'error', 'parse', 'no-subjects-found',
            'Section headers were found but no subject rows parsed.',
        ))
    return outcome
