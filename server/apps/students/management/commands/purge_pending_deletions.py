"""
Permanently purge students whose 7-day deletion recovery window has elapsed.

Run daily from a systemd timer / cron (see deploy-scripts). Idempotent and safe
to re-run: it only touches requests that are still ``pending`` and already past
their ``purge_at``.

    python manage.py purge_pending_deletions          # purge due requests
    python manage.py purge_pending_deletions --dry-run # list, change nothing
"""
import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.students.models import StudentDeletionRequest
from apps.students.deletion_service import purge_student_completely

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Permanently delete students whose 7-day deletion window has elapsed.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='List what would be purged without deleting anything.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        due = (
            StudentDeletionRequest.objects
            .select_related('student')
            .filter(status='pending', purge_at__lte=now)
            .order_by('purge_at')
        )

        total = due.count()
        if not total:
            self.stdout.write('No student deletions are due.')
            return

        self.stdout.write(f'{total} student deletion(s) due for permanent purge.')
        purged = 0
        for req in due:
            student = req.student
            label = f'{student.fullNameEnglish} [{student.currentRollNumber}] (purge_at={req.purge_at.isoformat()})'
            if dry_run:
                self.stdout.write(f'  would purge: {label}')
                continue
            try:
                # Mark completed first so a mid-purge crash can't loop forever;
                # the request row is deleted anyway when the student cascades.
                req.status = 'completed'
                req.save(update_fields=['status', 'updatedAt'])
                purge_student_completely(student)
                purged += 1
                self.stdout.write(self.style.SUCCESS(f'  purged: {label}'))
            except Exception as exc:  # noqa: BLE001 - continue with the rest
                logger.exception('Failed to purge student %s', student.id)
                self.stdout.write(self.style.ERROR(f'  FAILED: {label} — {exc}'))

        if dry_run:
            self.stdout.write('Dry run complete — nothing was deleted.')
        else:
            self.stdout.write(self.style.SUCCESS(f'Done. Permanently purged {purged}/{total} student(s).'))
