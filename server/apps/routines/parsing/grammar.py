"""
Session + subject-row extraction from a theory-schedule section.

A session is anchored by a date (DD-MM-YYYY). Within a session the following
time word/value and pobo header give the slot; subject rows are
``<serial> <5-digit-code> <name…> <technology: pobo…>``. Anchoring on dates
and codes (both numeric, already digit-normalized) keeps the parse robust to
the PDF's garbled Bengali.
"""
from __future__ import annotations

import re
from datetime import date, datetime, time
from typing import Optional

from .text import _TIME_WORDS
from .types import ParsedRoutineSubject, RoutineIssue, RoutineSessionData

_DATE = re.compile(r'\b(\d{2})-(\d{2})-(\d{4})\b')
_TIME = re.compile(r'(সকাল|দুপুর|বিকাল|রাত)\s*(\d{1,2})[:.](\d{2})')
# A subject row: line starting with a small serial then a 5-digit code.
_ROW = re.compile(r'(?m)^\s*(\d{1,3})\s+(\d{5})\b(.*)$')
_POBO = re.compile(r'([০-৯\d][^\n]*?পব[ােো ]*[^\n]*?\((\d{4})\s*প্র[^\)]*\))')
_REGULATION = re.compile(r'\((\d{4})\s*প্র[মিব়্রখব]{0,6}ধ[ানন]{0,4}\)')


def _parse_date(match: re.Match) -> Optional[date]:
    try:
        return date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
    except ValueError:
        return None


def parse_theory_section(
    body: str, issues: list[RoutineIssue], section: str = 'theory',
) -> list[RoutineSessionData]:
    """Split one schedule section into sessions with their subject rows."""
    sessions: list[RoutineSessionData] = []
    date_matches = list(_DATE.finditer(body))
    if not date_matches:
        return sessions

    for index, dmatch in enumerate(date_matches):
        start = dmatch.start()
        end = date_matches[index + 1].start() if index + 1 < len(date_matches) else len(body)
        chunk = body[start:end]

        exam_date = _parse_date(dmatch)
        if exam_date is None:
            issues.append(RoutineIssue(
                'warning', 'parse', 'bad-date',
                f'Unparsable date {dmatch.group(0)!r}', context=chunk[:80],
            ))
            continue

        tmatch = _TIME.search(chunk)
        if tmatch:
            slot, base = _TIME_WORDS.get(tmatch.group(1), ('other', 0))
            hour = int(tmatch.group(2))
            minute = int(tmatch.group(3))
            # "বিকাল 2:00" → 14:00 (add 12 unless already 12/afternoon-stated).
            if base == 12 and hour < 12:
                hour += 12
            try:
                start_time = time(hour, minute)
            except ValueError:
                start_time = time(10, 0)
                issues.append(RoutineIssue(
                    'warning', 'parse', 'bad-time',
                    f'Unparsable time {tmatch.group(0)!r}; defaulted to 10:00',
                ))
        else:
            slot, start_time = 'morning', time(10, 0)

        reg = _REGULATION.search(chunk)
        regulation_year = int(reg.group(1)) if reg else None
        pobo = _POBO.search(chunk)
        pobo_label = ''
        if pobo:
            pobo_label = re.sub(r'\s+', ' ', pobo.group(1)).strip()[:120]

        subjects = _parse_rows(chunk)
        if not subjects:
            # A date with no rows is usually a wrapped continuation; skip
            # quietly unless it is clearly a lone stray.
            continue

        sessions.append(RoutineSessionData(
            section=section,
            exam_date=exam_date,
            start_time=start_time,
            slot=slot,
            weekday=exam_date.weekday(),
            duration_minutes=180,
            pobo_label=pobo_label,
            regulation_year=regulation_year,
            subjects=subjects,
        ))
    return sessions


def _parse_rows(chunk: str) -> list[ParsedRoutineSubject]:
    rows: list[ParsedRoutineSubject] = []
    for match in _ROW.finditer(chunk):
        serial = int(match.group(1))
        code = match.group(2)
        tail = match.group(3).strip()
        # Split the tail into name vs "technology: pobo" — the applicability
        # begins at the first "<pobo> পর্ব:" fragment.
        name, applicability = tail, ''
        split = re.search(r'([০-৯\d].{0,4}পব[ােো ]*[:：])', tail)
        if split:
            name = tail[:split.start()].strip()
            applicability = tail[split.start():].strip()
        rows.append(ParsedRoutineSubject(
            subject_code=code,
            raw_name=re.sub(r'\s+', ' ', name).strip()[:255],
            tech_applicability=re.sub(r'\s+', ' ', applicability).strip()[:600],
            serial=serial,
        ))
    return rows
