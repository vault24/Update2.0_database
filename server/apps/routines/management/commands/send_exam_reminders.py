"""
Send due exam reminders (notification + email) to students.

Run HOURLY via cron / systemd timer (see deploy-scripts/exam-reminder-timer.sh).
Idempotent: every send is recorded in ExamReminderLog, so overlapping or
repeated runs never double-send.

    manage.py send_exam_reminders            # send whatever is due now
    manage.py send_exam_reminders --dry-run  # report only, send nothing
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Send due exam reminders (countdown / day-before / exam-day).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would be sent without sending anything.',
        )

    def handle(self, *args, **options):
        from apps.routines.reminders import send_due_reminders

        stats = send_due_reminders(dry_run=options['dry_run'])
        if options['dry_run']:
            self.stdout.write(self.style.WARNING('[dry-run] nothing was sent'))
        self.stdout.write(self.style.SUCCESS(
            f"countdown={stats['countdown']} day_before={stats['day_before']} "
            f"exam_day={stats['exam_day']} students={stats['students']}"
        ))
