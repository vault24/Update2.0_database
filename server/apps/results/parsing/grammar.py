"""
Record segmentation and per-family parsing.

A record is recognised purely by its own syntax: a roll number immediately
followed by one of the four openers observed on real BTEB notices.

    ROLL { ... }                         referred (has gpaN keys) / failed
    ROLL ( gpaN: ... )                   passed, non-final semester
    ROLL cgpa: X.XX ( gpaN: ... )        passed, final semester
    ROLL ( Expelled_sub - ... )          expelled (partial)
    ROLL ( continuousfail_sub- ... )     continuous-assessment failure
    ROLL                                 expelled (bare), only under an
                                         "Expelled: (...)" heading

Anchoring on syntax rather than digit counts or positions is what keeps the
parser stable across regulations: roll length, semester count and column
layout may all change without touching this module.

Everything between consumed records is collected as *residual* text and
audited: leftover roll-length numbers under an Expelled heading become bare
expelled records; anything else becomes a warning issue. New BTEB
constructs therefore surface loudly instead of vanishing.
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import Optional

from .types import (
    ParseIssue,
    ParsedRecord,
    RecordFamily,
    SemesterGrade,
    SubjectRef,
    SubjectRole,
)

# A roll is 4–10 digits: wide enough for every historical BTEB scheme,
# narrow enough to reject page numbers (stray 1–3 digit tokens are already
# filtered as boilerplate). The *opener lookahead* is what really
# distinguishes rolls from subject codes.
_ROLL = r'\d{4,10}'

#: Openers. The paren alternative requires a known label right after "(" so a
#: subject code followed by its own "(T)" suffix can never anchor a record.
#: The paren match ends exactly on "(" (label check lives in the lookahead)
#: so the balanced-paren scan can start from the opener itself.
_ANCHOR = re.compile(
    rf'(?<!\d)(?P<roll>{_ROLL})\s*'
    r'(?P<opener>\{|\((?=\s*(?:gpa\d|Expelled_sub|continuousfail_sub))|cgpa\s*:)'
)

_KV = re.compile(r'gpa(?P<sem>\d{1,2})\s*:\s*(?P<value>ref|\d+(?:\.\d+)?)')

#: ``26441(T)`` / ``26471(P)`` / ``26447(T,P)`` — whitespace tolerated inside
#: the suffix because line wrapping can split it (observed: "(T,\nP)").
#: The suffix is optional: expelled / continuous-assessment codes print bare.
_SUBJECT = re.compile(
    r'(?P<code>\d{3,6})\s*(?:\(\s*(?P<first>[TP])\s*(?:,\s*(?P<second>[TP])\s*)?\))?'
)

#: Body of the special paren families. BTEB spells "reffered_sub" (sic);
#: accept the correct spelling too in case it is ever fixed.
_SPECIAL_BODY = re.compile(
    r'^(?P<label>Expelled_sub|continuousfail_sub)\s*-\s*(?P<own>[^;]*)'
    r'(?:;\s*ref+er+ed_sub\s*-\s*(?P<referred>.*))?$',
    re.S,
)

#: Matched at the position right after the "cgpa :" opener.
_CGPA_VALUE = re.compile(r'\s*(?P<cgpa>\d+(?:\.\d+)?)\s*\(')


@dataclass
class SectionParse:
    """Everything the grammar produced from one institute stream."""

    records: list[ParsedRecord] = field(default_factory=list)
    issues: list[ParseIssue] = field(default_factory=list)
    #: Unconsumed stream text, audited by ``resolve_residuals``.
    residual: str = ''


def _decimal(raw: str) -> Optional[Decimal]:
    try:
        return Decimal(raw)
    except InvalidOperation:
        return None


def _parse_grades(body: str, issues: list[ParseIssue], roll: str) -> list[SemesterGrade]:
    grades: list[SemesterGrade] = []
    seen: set[int] = set()
    for match in _KV.finditer(body):
        semester = int(match.group('sem'))
        if semester in seen:
            issues.append(ParseIssue(
                'warning', 'parse', 'duplicate-semester',
                f'Semester {semester} listed twice in GPA history',
                roll=roll,
            ))
            continue
        seen.add(semester)
        if match.group('value') == 'ref':
            grades.append(SemesterGrade(semester=semester, gpa=None))
        else:
            value = _decimal(match.group('value'))
            if value is None:
                issues.append(ParseIssue(
                    'error', 'parse', 'malformed-gpa',
                    f'Unreadable GPA value {match.group("value")!r}',
                    roll=roll,
                ))
                continue
            grades.append(SemesterGrade(semester=semester, gpa=value))
    return grades


def _parse_subjects(text: str, role: SubjectRole) -> list[SubjectRef]:
    subjects: list[SubjectRef] = []
    for match in _SUBJECT.finditer(text):
        letters = {match.group('first'), match.group('second')} - {None}
        subjects.append(SubjectRef(
            code=match.group('code'),
            theory='T' in letters,
            practical='P' in letters,
            role=role,
        ))
    return subjects


def _parse_brace_body(roll: str, body: str, issues: list[ParseIssue]) -> ParsedRecord:
    """``{ gpaN: …, ref_sub: … }`` (referred) or ``{ code(T), … }`` (failed)."""
    if _KV.search(body):
        head, sep, tail = body.partition('ref_sub')
        subjects_text = tail.lstrip(':').lstrip() if sep else ''
        record = ParsedRecord(
            roll=roll,
            family=RecordFamily.REFERRED,
            grades=_parse_grades(head, issues, roll),
            subjects=_parse_subjects(subjects_text, SubjectRole.REFERRED),
        )
        if not record.subjects:
            issues.append(ParseIssue(
                'warning', 'parse', 'referred-without-subjects',
                'GPA history contains "ref" but no ref_sub list was found',
                roll=roll,
            ))
        return record
    return ParsedRecord(
        roll=roll,
        family=RecordFamily.FAILED,
        subjects=_parse_subjects(body, SubjectRole.REFERRED),
    )


def _parse_special_body(
    roll: str, body: str, issues: list[ParseIssue], expelled_rule: str,
) -> Optional[ParsedRecord]:
    """``Expelled_sub - …`` / ``continuousfail_sub- …`` paren bodies."""
    match = _SPECIAL_BODY.match(body.strip())
    if not match:
        issues.append(ParseIssue(
            'error', 'parse', 'malformed-special-record',
            f'Unrecognised special record body: {body[:120]!r}',
            roll=roll,
        ))
        return None
    if match.group('label') == 'Expelled_sub':
        family, own_role = RecordFamily.EXPELLED, SubjectRole.EXPELLED
    else:
        family, own_role = RecordFamily.CONTINUOUS_FAIL, SubjectRole.CONTINUOUS_FAIL
    subjects = _parse_subjects(match.group('own'), own_role)
    if match.group('referred'):
        subjects += _parse_subjects(match.group('referred'), SubjectRole.REFERRED)
    return ParsedRecord(
        roll=roll,
        family=family,
        subjects=subjects,
        expelled_rule=expelled_rule if family is RecordFamily.EXPELLED else '',
    )


def _balanced_paren_end(stream: str, open_index: int) -> int:
    """Index just past the ")" matching stream[open_index] == "(".

    Depth-aware because special bodies nest subject suffixes: "( … 26441(T) )".
    Returns -1 when unbalanced (truncated document).
    """
    depth = 0
    for index in range(open_index, len(stream)):
        char = stream[index]
        if char == '(':
            depth += 1
        elif char == ')':
            depth -= 1
            if depth == 0:
                return index + 1
    return -1


def parse_section(stream: str, expelled_rules: list[str]) -> SectionParse:
    """Segment one institute stream into records + residual text."""
    result = SectionParse()
    # Only an unambiguous section-wide rule is attributed to expelled
    # records; headings interleave too freely for positional matching.
    distinct_rules = sorted(set(expelled_rules))
    section_rule = distinct_rules[0] if len(distinct_rules) == 1 else ''

    residual_parts: list[str] = []
    cursor = 0
    for anchor in _ANCHOR.finditer(stream):
        if anchor.start() < cursor:
            continue  # anchor inside an already-consumed record body
        roll = anchor.group('roll')
        opener = anchor.group('opener')
        residual_parts.append(stream[cursor:anchor.start()])

        if opener == '{':
            close = stream.find('}', anchor.end())
            if close == -1:
                result.issues.append(ParseIssue(
                    'error', 'parse', 'unterminated-record',
                    'Opening "{" without matching "}" (truncated document?)',
                    roll=roll,
                ))
                cursor = anchor.end()
                continue
            body = stream[anchor.end():close]
            result.records.append(_parse_brace_body(roll, body, result.issues))
            cursor = close + 1

        elif opener == '(':
            close = _balanced_paren_end(stream, anchor.end() - 1)
            if close == -1:
                result.issues.append(ParseIssue(
                    'error', 'parse', 'unterminated-record',
                    'Opening "(" without matching ")" (truncated document?)',
                    roll=roll,
                ))
                cursor = anchor.end()
                continue
            body = stream[anchor.end():close - 1]
            if body.lstrip().startswith('gpa'):
                record = ParsedRecord(
                    roll=roll,
                    family=RecordFamily.PASSED,
                    grades=_parse_grades(body, result.issues, roll),
                )
                result.records.append(record)
            else:
                record = _parse_special_body(roll, body, result.issues, section_rule)
                if record is not None:
                    result.records.append(record)
            cursor = close

        else:  # cgpa form — anchor.end() sits right after "cgpa :"
            head = _CGPA_VALUE.match(stream, anchor.end())
            if head is None:
                result.issues.append(ParseIssue(
                    'error', 'parse', 'malformed-cgpa-record',
                    f'cgpa opener without a parsable value near: '
                    f'{stream[anchor.start():anchor.start() + 80]!r}',
                    roll=roll,
                ))
                cursor = anchor.end()
                continue
            open_paren = head.end() - 1
            close = _balanced_paren_end(stream, open_paren)
            if close == -1:
                result.issues.append(ParseIssue(
                    'error', 'parse', 'unterminated-record',
                    'cgpa history "(" without matching ")"',
                    roll=roll,
                ))
                cursor = anchor.end()
                continue
            body = stream[open_paren + 1:close - 1]
            result.records.append(ParsedRecord(
                roll=roll,
                family=RecordFamily.PASSED,
                cgpa=_decimal(head.group('cgpa')),
                grades=_parse_grades(body, result.issues, roll),
            ))
            cursor = close

    residual_parts.append(stream[cursor:])
    result.residual = ' '.join(part for part in residual_parts if part.strip())
    return result


def resolve_residuals(
    section: SectionParse,
    expelled_rules: list[str],
    modal_roll_length: int,
    institute_label: str,
) -> None:
    """Audit a section's residual text, promoting bare expelled rolls.

    ``modal_roll_length`` is the most common roll length among successfully
    parsed records in the whole document — an adaptive yardstick that lets us
    tell a bare roll from a stray subject code without hardcoding "6 digits".
    """
    tokens = [t for t in re.split(r'[\s,;]+', section.residual) if t and t not in '-.']
    distinct_rules = sorted(set(expelled_rules))
    section_rule = distinct_rules[0] if len(distinct_rules) == 1 else ''
    leftovers: list[str] = []

    for token in tokens:
        if (
            expelled_rules
            and re.fullmatch(r'\d+', token)
            and len(token) == modal_roll_length
        ):
            section.records.append(ParsedRecord(
                roll=token,
                family=RecordFamily.EXPELLED,
                expelled_rule=section_rule,
            ))
            section.issues.append(ParseIssue(
                'info', 'parse', 'bare-expelled-roll',
                f'Roll {token} listed without a body under an Expelled '
                f'heading — recorded as expelled',
                roll=token,
            ))
        else:
            leftovers.append(token)

    if leftovers:
        section.issues.append(ParseIssue(
            'warning', 'parse', 'residual-tokens',
            f'{len(leftovers)} token(s) in {institute_label} did not belong '
            f'to any recognised record or boilerplate',
            context=' '.join(leftovers)[:500],
        ))


def modal_roll_length(records: list[ParsedRecord], default: int = 6) -> int:
    lengths = Counter(len(record.roll) for record in records)
    if not lengths:
        return default
    return lengths.most_common(1)[0][0]
