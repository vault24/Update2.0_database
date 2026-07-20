"""
Text extraction backends.

Why pypdf, and why content-stream order matters
-----------------------------------------------
BTEB notices lay records out in four columns. Layout-analysing extractors
(pdfplumber and friends) re-sort text into visual line order, which
interleaves the columns row-by-row and shreds records; measured on a real
notice, two-thirds of records were destroyed. pypdf (like PyMuPDF) emits
text in content-stream order — the order the generator wrote it — which
keeps every record's tokens contiguous, including records that continue in
the next column or on the next page. pypdf is also MIT-licensed and pure
Python, so it is the default backend; the ``TextExtractor`` protocol keeps
the backend swappable (PyMuPDF, or an OCR path if BTEB ever ships scans).
"""
from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Protocol, Union

Source = Union[str, bytes, io.IOBase]


@dataclass(frozen=True)
class PageText:
    """Raw text of one page, 1-based page number preserved for diagnostics."""

    number: int
    text: str


class TextExtractor(Protocol):
    def extract_pages(self, source: Source) -> list[PageText]:
        """Extract every page's raw text in content-stream order."""
        ...


class PypdfExtractor:
    """Default backend, built on pypdf."""

    def extract_pages(self, source: Source) -> list[PageText]:
        from pypdf import PdfReader

        if isinstance(source, bytes):
            source = io.BytesIO(source)
        reader = PdfReader(source)
        pages = []
        for index, page in enumerate(reader.pages):
            pages.append(PageText(number=index + 1, text=page.extract_text() or ''))
        return pages
