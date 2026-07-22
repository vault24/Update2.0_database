"""
Text normalization + section splitting for BTEB routine PDFs.

Bengali digits are normalized to Latin so the numeric anchors (dates,
5-digit codes, times) are reliable regardless of which script the PDF used
for a given number. Page furniture (footers, the docx path line) is dropped.
"""
from __future__ import annotations

import re

# Bengali (০-৯) → Latin (0-9).
_BENGALI_DIGITS = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')

# Section headers are printed as "(ক)", "(খ)", … Bengali letters ka..una.
_SECTION_LETTERS = 'কখগঘঙচছজঝ'
_SECTION_RE = re.compile(r'\((?P<letter>[' + _SECTION_LETTERS + r'])\)\s*(?P<title>[^\n]{0,80})')

# Time words → 24h base hour; slot label.
_TIME_WORDS = {
    'সকাল': ('morning', 0),      # morning as printed (10:00 → 10:00)
    'দুপুর': ('afternoon', 12),
    'বিকাল': ('afternoon', 12),  # afternoon (2:00 → 14:00)
    'রাত': ('other', 12),
}


def normalize_digits(text: str) -> str:
    return text.translate(_BENGALI_DIGITS)


def clean_lines(text: str) -> str:
    """Drop page furniture, keep meaningful lines, normalize digits."""
    kept = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if re.match(r'P\s*a\s*g\s*e\s+\d+\s*\|', line):
            continue
        if line.startswith('E:\\') or 'Rutine_' in line or 'Website:' in line:
            continue
        kept.append(line)
    return normalize_digits('\n'.join(kept))


def split_sections(text: str) -> list[tuple[str, str, str]]:
    """Return [(letter, title, body), …] for each lettered section.

    The preamble before the first "(ক)" is returned as an initial
    ('', '<preamble title>', body) entry so metadata can be read from it.
    """
    marks = list(_SECTION_RE.finditer(text))
    sections: list[tuple[str, str, str]] = []
    if not marks:
        return [('', '', text)]
    if marks[0].start() > 0:
        sections.append(('', 'preamble', text[:marks[0].start()]))
    for index, match in enumerate(marks):
        end = marks[index + 1].start() if index + 1 < len(marks) else len(text)
        sections.append((match.group('letter'), match.group('title').strip(),
                         text[match.start():end]))
    return sections
