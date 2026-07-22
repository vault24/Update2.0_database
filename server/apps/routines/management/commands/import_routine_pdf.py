"""
Import a BTEB exam routine PDF from the command line.

    python manage.py import_routine_pdf path/to/routine.pdf [--replace]
"""
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.routines.importer import AlreadyImportedError, import_routine_pdf


class Command(BaseCommand):
    help = 'Parse and import a BTEB exam routine PDF (theory schedule).'

    def add_arguments(self, parser):
        parser.add_argument('pdf_path')
        parser.add_argument('--replace', action='store_true')

    def handle(self, *args, **options):
        path = Path(options['pdf_path'])
        if not path.is_file():
            raise CommandError(f'File not found: {path}')
        try:
            record = import_routine_pdf(
                file_bytes=path.read_bytes(), file_name=path.name,
                replace=options['replace'],
            )
        except AlreadyImportedError as exc:
            raise CommandError(str(exc)) from exc

        stats = record.stats
        self.stdout.write(self.style.SUCCESS(
            f'Imported {stats.get("subjectCount", 0)} subjects across '
            f'{stats.get("sessionCount", 0)} sessions '
            f'(regulation {record.regulationYear}, {record.examType})'
        ))
        self.stdout.write(f'  exam window: {record.examStartDate} → {record.examEndDate}')
        self.stdout.write(f'  issues: {stats.get("issuesBySeverity") or "none"}')
