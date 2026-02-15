"""
Management command to fix students who were automatically marked as 'graduated'
but don't have an Alumni record.

This fixes students affected by the bug where adding 8th semester results
automatically changed status to 'graduated' without creating an Alumni record.
"""
from django.core.management.base import BaseCommand
from apps.students.models import Student
from apps.alumni.models import Alumni


class Command(BaseCommand):
    help = 'Fix students marked as graduated without Alumni records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        self.stdout.write(self.style.WARNING('=' * 80))
        self.stdout.write(self.style.WARNING('Fixing Graduated Students Without Alumni Records'))
        self.stdout.write(self.style.WARNING('=' * 80))
        
        if dry_run:
            self.stdout.write(self.style.NOTICE('\n🔍 DRY RUN MODE - No changes will be made\n'))
        
        # Find students with 'graduated' status but no Alumni record
        graduated_students = Student.objects.filter(status='graduated')
        
        self.stdout.write(f'\nFound {graduated_students.count()} students with "graduated" status')
        
        students_without_alumni = []
        for student in graduated_students:
            if not hasattr(student, 'alumni'):
                students_without_alumni.append(student)
        
        self.stdout.write(f'Found {len(students_without_alumni)} students without Alumni records\n')
        
        if not students_without_alumni:
            self.stdout.write(self.style.SUCCESS('✅ No students need fixing!'))
            return
        
        # Display students that will be fixed
        self.stdout.write(self.style.WARNING('\nStudents to be fixed:'))
        self.stdout.write('-' * 80)
        for student in students_without_alumni:
            has_8th_sem = student.has_completed_eighth_semester()
            self.stdout.write(
                f'  • {student.fullNameEnglish} (Roll: {student.currentRollNumber})\n'
                f'    Status: {student.status}, Semester: {student.semester}, '
                f'Has 8th Sem Results: {has_8th_sem}'
            )
        self.stdout.write('-' * 80)
        
        if dry_run:
            self.stdout.write(self.style.NOTICE('\n🔍 DRY RUN - No changes made'))
            return
        
        # Ask for confirmation
        self.stdout.write(self.style.WARNING(
            f'\n⚠️  This will change the status of {len(students_without_alumni)} students back to "active"'
        ))
        self.stdout.write(self.style.NOTICE(
            'These students will then be able to be properly transitioned to Alumni\n'
            'using the "Send to Alumni" button in the admin interface.'
        ))
        
        confirm = input('\nDo you want to proceed? (yes/no): ')
        
        if confirm.lower() != 'yes':
            self.stdout.write(self.style.ERROR('\n❌ Operation cancelled'))
            return
        
        # Fix the students
        fixed_count = 0
        for student in students_without_alumni:
            try:
                student.status = 'active'
                student.save()
                fixed_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Fixed: {student.fullNameEnglish} - Status changed to "active"'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'❌ Error fixing {student.fullNameEnglish}: {str(e)}'
                    )
                )
        
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Successfully fixed {fixed_count} out of {len(students_without_alumni)} students'
        ))
        self.stdout.write(self.style.NOTICE(
            '\nThese students can now be properly transitioned to Alumni using the\n'
            '"Send to Alumni" button in the Student Details page.'
        ))
