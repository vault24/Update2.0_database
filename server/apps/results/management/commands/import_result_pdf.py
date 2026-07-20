"""
Import an official BTEB result PDF from the command line.

    python manage.py import_result_pdf path/to/RESULT_5th_2022_Regulation.pdf
    python manage.py import_result_pdf path.pdf --replace   # re-import same file
"""
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.results.importer import AlreadyImportedError, import_result_pdf


class Command(BaseCommand):
    help = 'Parse and import an official BTEB result PDF (all institutes).'

    def add_arguments(self, parser):
        parser.add_argument('pdf_path', help='Path to the BTEB result PDF')
        parser.add_argument(
            '--replace', action='store_true',
            help='Re-import even if this exact file was imported before',
        )

    def handle(self, *args, **options):
        path = Path(options['pdf_path'])
        if not path.is_file():
            raise CommandError(f'File not found: {path}')

        try:
            record = import_result_pdf(
                file_bytes=path.read_bytes(),
                file_name=path.name,
                replace=options['replace'],
            )
        except AlreadyImportedError as exc:
            raise CommandError(str(exc)) from exc

        stats = record.stats
        self.stdout.write(self.style.SUCCESS(
            f'Imported {stats.get("recordCount", 0)} results '
            f'from {stats.get("instituteCount", 0)} institutes '
            f'({record.fileName})'
        ))
        self.stdout.write(f'  records by type: {stats.get("recordsByType")}')
        self.stdout.write(f'  issues: {stats.get("issuesBySeverity") or "none"}')
        self.stdout.write(f'  student sync: {stats.get("sync")}')
        self.stdout.write(f'  timings: {stats.get("timings")}')
