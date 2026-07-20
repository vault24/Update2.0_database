"""
Stream assembly.

Turns classified lines from all pages into one contiguous record stream per
institute section. Because boilerplate was already removed line-by-line, a
record that crosses a column or page boundary — even one whose subject list
is interrupted by a full page footer + next page header — becomes contiguous
here simply by joining the surviving CONTENT lines with spaces.

Institute attribution is stream-based, not page-based: a section starts at
its institute header line and runs until the next header, regardless of how
many pages it spans or whether the next section starts mid-page.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .lines import ClassifiedLine, LineKind


@dataclass
class SectionStream:
    """One institute's notice section, assembled and ready for the grammar."""

    code: str
    name: str
    #: CONTENT lines joined with single spaces.
    stream: str = ''
    #: Rule texts from "Expelled: (…) -" headings seen inside this section.
    expelled_rules: list[str] = field(default_factory=list)
    #: First page this section appeared on (diagnostics only).
    first_page: int = 0


@dataclass
class AssembledDocument:
    sections: list[SectionStream] = field(default_factory=list)
    #: Joined text of every SECTION_PARAGRAPH line (exam metadata source).
    paragraph_text: str = ''
    #: CONTENT that appeared before any institute header — always suspicious.
    orphan_stream: str = ''


def assemble(lines: list[ClassifiedLine]) -> AssembledDocument:
    sections: list[SectionStream] = []
    paragraph_parts: list[str] = []
    orphan_parts: list[str] = []
    current: SectionStream | None = None
    current_parts: list[str] = []

    def flush() -> None:
        nonlocal current
        if current is not None:
            current.stream = ' '.join(current_parts)
            sections.append(current)
            current = None
        current_parts.clear()

    for line in lines:
        if line.kind == LineKind.BOILERPLATE:
            continue
        if line.kind == LineKind.SECTION_PARAGRAPH:
            paragraph_parts.append(line.text)
            continue
        if line.kind == LineKind.INSTITUTE_HEADER:
            flush()
            assert line.match is not None
            current = SectionStream(
                code=line.match.group('code'),
                name=line.match.group('name').strip(),
                first_page=line.page,
            )
            continue
        if line.kind == LineKind.EXPELLED_HEADING:
            assert line.match is not None
            if current is not None:
                current.expelled_rules.append(line.match.group('rule').strip())
            continue
        # CONTENT
        if current is None:
            orphan_parts.append(line.text)
        else:
            current_parts.append(line.text)

    flush()
    return AssembledDocument(
        sections=sections,
        paragraph_text=' '.join(paragraph_parts),
        orphan_stream=' '.join(orphan_parts),
    )
