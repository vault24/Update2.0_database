"""Test helper: a TextExtractor that serves pre-baked page texts."""
from apps.results.parsing.extraction import PageText


class FakeExtractor:
    def __init__(self, pages: list[str]):
        self._pages = pages

    def extract_pages(self, source) -> list[PageText]:
        return [PageText(number=i + 1, text=t) for i, t in enumerate(self._pages)]
