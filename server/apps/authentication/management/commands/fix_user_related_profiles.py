"""
Management command to fix users with missing related_profile_id
"""
from django.core.management.base import BaseCommand
from apps.authentication.models import User
from apps.students.models import Student
from apps.teachers.models import Teacher


class Command(BaseCommand):
    help = 'Fix users with missing related_profile_id by linking them to their profiles'

    def handle(self, *args, **options):
        self.stdout.write('Fixing users with missing related_profile_id...\n')
        
        # Fix students
        student_users = User.objects.filter(role__in=['student', 'captain'], related_profile_id__isnull=True)
        fixed_students = 0
        
        for user in student_users:
            # Try to find student by email
            student = Student.objects.filter(email=user.email).first()
            if student:
                user.related_profile_id = student.id
                user.save(update_fields=['related_profile_id'])
                fixed_students += 1
                self.stdout.write(f'  ✓ Fixed student user {user.email} -> {student.id}')
            else:
                self.stdout.write(self.style.WARNING(f'  ✗ No student profile found for {user.email}'))
        
        # Fix teachers
        teacher_users = User.objects.filter(role='teacher', related_profile_id__isnull=True)
        fixed_teachers = 0
        
        for user in teacher_users:
            # Try to find teacher by email
            teacher = Teacher.objects.filter(email=user.email).first()
            if teacher:
                user.related_profile_id = teacher.id
                user.save(update_fields=['related_profile_id'])
                fixed_teachers += 1
                self.stdout.write(f'  ✓ Fixed teacher user {user.email} -> {teacher.id}')
            else:
                self.stdout.write(self.style.WARNING(f'  ✗ No teacher profile found for {user.email}'))
        
        self.stdout.write(self.style.SUCCESS(f'\nFixed {fixed_students} student users and {fixed_teachers} teacher users'))
