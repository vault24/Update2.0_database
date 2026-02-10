"""
Management command to update all semester 8 students to graduated status
"""
from django.core.management.base import BaseCommand
from apps.students.models import Student


class Command(BaseCommand):
    help = 'Update all semester 8 students to graduated status'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find all semester 8 students who are not graduated
        semester_8_students = Student.objects.filter(
            semester=8,
            status='active'
        )
        
        if not semester_8_students.exists():
            self.stdout.write(
                self.style.SUCCESS('No semester 8 students with active status found.')
            )
            return
        
        self.stdout.write(f'Found {semester_8_students.count()} semester 8 students with active status:')
        
        for student in semester_8_students:
            self.stdout.write(f'  - {student.fullNameEnglish} ({student.currentRollNumber})')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('\nDry run mode - no changes made.')
            )
            return
        
        # Update students to graduated status
        updated_count = semester_8_students.update(status='graduated')
        
        self.stdout.write(
            self.style.SUCCESS(f'\nSuccessfully updated {updated_count} students to graduated status.')
        )
        
        # Show updated students
        self.stdout.write('\nUpdated students:')
        for student in semester_8_students:
            student.refresh_from_db()
            self.stdout.write(f'  - {student.fullNameEnglish}: {student.status}')