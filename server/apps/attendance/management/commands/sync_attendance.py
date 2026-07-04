"""
Backfill/refresh student profile attendance from teacher attendance records.

Only touches departments where autoAttendanceSync is enabled (or the one
passed with --department, which can be combined with --force to sync a
department regardless of its toggle — useful for one-off backfills).

Usage:
    python manage.py sync_attendance
    python manage.py sync_attendance --department <uuid>
    python manage.py sync_attendance --department <uuid> --force
"""
from django.core.management.base import BaseCommand

from apps.attendance.sync import sync_student_attendance
from apps.departments.models import Department
from apps.students.models import Student


class Command(BaseCommand):
    help = 'Sync teacher attendance records into student profile attendance'

    def add_arguments(self, parser):
        parser.add_argument('--department', help='Limit to one department UUID')
        parser.add_argument(
            '--force', action='store_true',
            help='Sync even when the department toggle is off (requires --department)',
        )

    def handle(self, *args, **options):
        departments = Department.objects.all()
        if options['department']:
            departments = departments.filter(id=options['department'])
        if not options['force']:
            departments = departments.filter(autoAttendanceSync=True)
        elif not options['department']:
            self.stderr.write('--force requires --department')
            return

        total = 0
        for department in departments:
            students = Student.objects.filter(
                department=department, status='active'
            ).select_related('department')
            synced = 0
            for student in students:
                try:
                    if options['force'] and not department.autoAttendanceSync:
                        # Temporarily treat as enabled for this run.
                        department.autoAttendanceSync = True
                        student.department = department
                    if sync_student_attendance(student):
                        synced += 1
                except Exception as exc:
                    self.stderr.write(f'  failed for {student.id}: {exc}')
            total += synced
            self.stdout.write(f'{department.name}: {synced} students synced')

        self.stdout.write(self.style.SUCCESS(f'Done — {total} student profiles updated'))
