"""
Semantic validation of parsed records.

Structural problems (residual tokens, unterminated records, unparsable
bodies) are raised where they are detected, inside the grammar stage. This
module checks what the *successfully parsed* records claim:

- duplicate rolls within the exam
- GPA / CGPA values outside the 0.00-4.00 scale
- subject codes of implausible shape
- record-family invariants (referred records need referred subjects, a
  passed record must not carry 'ref' placeholders, ...)

Every finding is an issue, never an exception: one bad record must not stop
a 40,000-record import, and the admin decides on the import screen whether
the reported issues are acceptable.
"""
from __future__ import annotations

import re
from decimal import Decimal

from .types import ParseIssue, ParseOutcome, RecordFamily

_GPA_MIN = Decimal('0')
_GPA_MAX = Decimal('4')
_SUBJECT_CODE = re.compile(r'\d{4,6}')


def validate(outcome: ParseOutcome) -> None:
    """Append semantic issues to ``outcome.issues`` in place."""
    seen_rolls: dict[str, str] = {}  # roll -> institute code

    for institute in outcome.institutes:
        for record in institute.records:
            roll = record.roll

            previous = seen_rolls.get(roll)
            if previous is not None:
                outcome.issues.append(ParseIssue(
                    'error', 'validate', 'duplicate-roll',
                    f'Roll {roll} appears in institute {previous} and again '
                    f'in {institute.code}; keeping the first occurrence',
                    roll=roll,
                ))
            else:
                seen_rolls[roll] = institute.code

            if record.cgpa is not None and not _GPA_MIN <= record.cgpa <= _GPA_MAX:
                outcome.issues.append(ParseIssue(
                    'error', 'validate', 'cgpa-out-of-range',
                    f'CGPA {record.cgpa} outside 0.00-4.00', roll=roll,
                ))

            referred_semesters = 0
            for grade in record.grades:
                if grade.gpa is None:
                    referred_semesters += 1
                elif not _GPA_MIN <= grade.gpa <= _GPA_MAX:
                    outcome.issues.append(ParseIssue(
                        'error', 'validate', 'gpa-out-of-range',
                        f'Semester {grade.semester} GPA {grade.gpa} outside '
                        f'0.00-4.00', roll=roll,
                    ))

            for subject in record.subjects:
                if not _SUBJECT_CODE.fullmatch(subject.code):
                    outcome.issues.append(ParseIssue(
                        'warning', 'validate', 'odd-subject-code',
                        f'Subject code {subject.code!r} has an unexpected '
                        f'shape', roll=roll,
                    ))

            if record.family is RecordFamily.PASSED and referred_semesters:
                outcome.issues.append(ParseIssue(
                    'warning', 'validate', 'passed-with-ref',
                    f'Passed record carries {referred_semesters} "ref" '
                    f'semester(s)', roll=roll,
                ))
            if record.family is RecordFamily.FAILED and not record.subjects:
                outcome.issues.append(ParseIssue(
                    'warning', 'validate', 'failed-without-subjects',
                    'Failed record lists no subject codes', roll=roll,
                ))
