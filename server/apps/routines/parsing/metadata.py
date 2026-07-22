"""Routine notice metadata (regulation, memo, exam session, publish date)."""
from __future__ import annotations

import re

from .types import RoutineMeta

# "৫৭.১৭.…" memo, digit-normalized to Latin by this point.
_MEMO = re.compile(r'\b(\d{2}\.\d{2}\.\d{4}\.\d{3}\.\d{2}\.\d{3}\.\d{2}\.\d{2}\.\d{3})\b')
# Gregorian publication date: "12 July, 2026" style or a DD-MM-YYYY.
_PUB_DMY = re.compile(r'\b(\d{1,2})\s+(জুলাই|আগস্ট|জুন|সেপ্টেম্বর|অক্টোবর|মে|এপ্রিল)[^\n]*?(\d{4})\s*খ্রি')
_REGULATION = re.compile(r'\((\d{4})\s*প্র[মিব়্রখব]{0,6}ধ[ানন]{0,4}\)')
# "পরীক্ষা-২০২৫" (digit-normalized).
_SESSION = re.compile(r'পরীক্ষা[- ]?(\d{4})')

_BN_MONTHS = {
    'জানুয়ারি': 1, 'ফেব্রুয়ারি': 2, 'মার্চ': 3, 'এপ্রিল': 4, 'মে': 5,
    'জুন': 6, 'জুলাই': 7, 'আগস্ট': 8, 'সেপ্টেম্বর': 9, 'অক্টোবর': 10,
    'নভেম্বর': 11, 'ডিসেম্বর': 12,
}


def extract_meta(text: str) -> RoutineMeta:
    meta = RoutineMeta(exam_type='final')

    reg = _REGULATION.search(text)
    if reg:
        meta.regulation_year = int(reg.group(1))

    memo = _MEMO.search(text)
    if memo:
        meta.memo_no = memo.group(1)

    session = _SESSION.search(text)
    if session:
        meta.exam_session = f'পরীক্ষা-{session.group(1)}'

    pub = _PUB_DMY.search(text)
    if pub:
        month = _BN_MONTHS.get(pub.group(2))
        if month:
            meta.publication_date = f'{int(pub.group(1)):02d}-{month:02d}-{pub.group(3)}'

    return meta
