"""Semantic validation of a parsed routine."""
from __future__ import annotations

from .types import RoutineIssue, RoutineOutcome

_CODE_LEN = 5


def validate(outcome: RoutineOutcome) -> None:
    """Append issues in place: duplicate codes, empty sessions, missing meta."""
    seen: dict[str, str] = {}   # code -> "date time"
    for session in outcome.sessions:
        when = f'{session.exam_date} {session.start_time:%H:%M}'
        if not session.subjects:
            outcome.issues.append(RoutineIssue(
                'warning', 'validate', 'empty-session',
                f'Session {when} has no subjects',
            ))
        for subject in session.subjects:
            if len(subject.subject_code) != _CODE_LEN or not subject.subject_code.isdigit():
                outcome.issues.append(RoutineIssue(
                    'warning', 'validate', 'odd-subject-code',
                    f'Subject code {subject.subject_code!r} is not 5 digits',
                ))
            previous = seen.get(subject.subject_code)
            if previous is not None:
                outcome.issues.append(RoutineIssue(
                    'error', 'validate', 'duplicate-code',
                    f'Subject {subject.subject_code} scheduled twice '
                    f'({previous} and {when}) — keeping the first',
                ))
            else:
                seen[subject.subject_code] = when

    if outcome.meta.regulation_year is None:
        outcome.issues.append(RoutineIssue(
            'error', 'validate', 'missing-regulation',
            'Could not determine the regulation year from the routine notice',
        ))
    if not outcome.sessions:
        outcome.issues.append(RoutineIssue(
            'error', 'validate', 'no-sessions',
            'No exam sessions were parsed — is this an official BTEB routine PDF?',
        ))
