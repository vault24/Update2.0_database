"""
Management command to fix users with missing or incorrect related_profile_id
"""
from django.core.management.base import BaseCommand
from apps.authentication.models import User
from apps.students.models import Student
from apps.teachers.models import Teacher


class Command(BaseCommand):
    help = 'Fix users with missing or incorrect related_profile_id by linking them to their profiles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update all users, even if related_profile_id is already set',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        
        self.stdout.write('Fixing users with missing or incorrect related_profile_id...\n')
        
        # Fix students
        if force:
            student_users = User.objects.filter(role__in=['student', 'captain'])
            self.stdout.write('Checking ALL student users (force mode)...')
        else:
            student_users = User.objects.filter(role__in=['student', 'captain'], related_profile_id__isnull=True)
            self.stdout.write('Checking student users with NULL related_profile_id...')
        
        fixed_students = 0
        
        for user in student_users:
            # Try to find student by email
            student = Student.objects.filter(email=user.email).first()
            if student:
                if user.related_profile_id != student.id:
                    old_id = user.related_profile_id
                    user.related_profile_id = student.id
                    user.save(update_fields=['related_profile_id'])
                    fixed_students += 1
                    self.stdout.write(f'  ✓ Fixed student user {user.email}: {old_id} -> {student.id}')
                else:
                    self.stdout.write(f'  ✓ Student user {user.email} already correct: {student.id}')
            else:
                self.stdout.write(self.style.WARNING(f'  ✗ No student profile found for {user.email}'))
        
        # Fix teachers
        if force:
            teacher_users = User.objects.filter(role='teacher')
            self.stdout.write('\nChecking ALL teacher users (force mode)...')
        else:
            teacher_users = User.objects.filter(role='teacher', related_profile_id__isnull=True)
            self.stdout.write('\nChecking teacher users with NULL related_profile_id...')
        
        fixed_teachers = 0
        
        for user in teacher_users:
            # Try to find teacher by email
            teacher = Teacher.objects.filter(email=user.email).first()
            if teacher:
                if user.related_profile_id != teacher.id:
                    old_id = user.related_profile_id
                    user.related_profile_id = teacher.id
                    user.save(update_fields=['related_profile_id'])
                    fixed_teachers += 1
                    self.stdout.write(f'  ✓ Fixed teacher user {user.email}: {old_id} -> {teacher.id}')
                else:
                    self.stdout.write(f'  ✓ Teacher user {user.email} already correct: {teacher.id}')
            else:
                self.stdout.write(self.style.WARNING(f'  ✗ No teacher profile found for {user.email}'))
        
        self.stdout.write(self.style.SUCCESS(f'\nFixed {fixed_students} student users and {fixed_teachers} teacher users'))
