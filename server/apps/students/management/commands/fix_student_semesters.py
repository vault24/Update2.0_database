"""
Management command to fix student current semesters based on their semester results
"""
from django.core.management.base import BaseCommand
from apps.students.models import Student


class Command(BaseCommand):
    help = 'Fix student current semesters based on their semester results'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
        parser.add_argument(
            '--student-id',
            type=str,
            help='Fix specific student by ID',
        )
        parser.add_argument(
            '--department',
            type=str,
            help='Fix students in specific department',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        student_id = options['student_id']
        department = options['department']
        
        # Build queryset
        queryset = Student.objects.all()
        
        if student_id:
            queryset = queryset.filter(id=student_id)
        
        if department:
            queryset = queryset.filter(department_id=department)
        
        # Get students that need fixing
        students_to_fix = []
        
        for student in queryset:
            # Calculate what the current semester should be
            highest_completed = student.get_highest_completed_semester()
            
            if highest_completed > 0:
                if highest_completed >= 8:
                    # Student should be in 8th semester and graduated
                    expected_semester = 8
                    expected_status = 'graduated'
                else:
                    # Student should be in next semester
                    expected_semester = highest_completed + 1
                    expected_status = student.status  # Keep current status unless graduated
                
                # Check if update is needed
                needs_semester_update = student.semester != expected_semester
                needs_status_update = (expected_status == 'graduated' and student.status != 'graduated')
                
                if needs_semester_update or needs_status_update:
                    students_to_fix.append({
                        'student': student,
                        'current_semester': student.semester,
                        'expected_semester': expected_semester,
                        'current_status': student.status,
                        'expected_status': expected_status,
                        'highest_completed': highest_completed,
                        'needs_semester_update': needs_semester_update,
                        'needs_status_update': needs_status_update,
                    })
        
        if not students_to_fix:
            self.stdout.write(
                self.style.SUCCESS('No students need semester updates.')
            )
            return
        
        # Display what will be updated
        self.stdout.write(f'\nFound {len(students_to_fix)} students that need updates:\n')
        
        for fix_info in students_to_fix:
            student = fix_info['student']
            self.stdout.write(
                f"Student: {student.fullNameEnglish} (Roll: {student.currentRollNumber})"
            )
            self.stdout.write(
                f"  Department: {student.department.name if student.department else 'N/A'}"
            )
            self.stdout.write(
                f"  Highest completed semester: {fix_info['highest_completed']}"
            )
            
            if fix_info['needs_semester_update']:
                self.stdout.write(
                    f"  Current semester: {fix_info['current_semester']} → {fix_info['expected_semester']}"
                )
            
            if fix_info['needs_status_update']:
                self.stdout.write(
                    f"  Status: {fix_info['current_status']} → {fix_info['expected_status']}"
                )
            
            self.stdout.write("")
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN: No changes were made. Use --dry-run=False to apply changes.')
            )
            return
        
        # Apply updates
        updated_count = 0
        
        for fix_info in students_to_fix:
            student = fix_info['student']
            
            if fix_info['needs_semester_update']:
                student.semester = fix_info['expected_semester']
            
            if fix_info['needs_status_update']:
                student.status = fix_info['expected_status']
            
            student.save()
            updated_count += 1
            
            self.stdout.write(
                f"Updated: {student.fullNameEnglish} (Roll: {student.currentRollNumber})"
            )
        
        self.stdout.write(
            self.style.SUCCESS(f'\nSuccessfully updated {updated_count} students.')
        )