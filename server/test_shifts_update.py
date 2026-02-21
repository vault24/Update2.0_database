"""
Test script to verify shifts field update works
Run with: python manage.py shell < test_shifts_update.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.teachers.models import Teacher
from apps.teachers.serializers import TeacherUpdateSerializer

# Get first teacher
teacher = Teacher.objects.first()
if teacher:
    print(f"Testing with teacher: {teacher.fullNameEnglish}")
    print(f"Current shifts: {teacher.shifts}")
    
    # Test update
    serializer = TeacherUpdateSerializer(teacher, data={'shifts': ['morning', 'day']}, partial=True)
    if serializer.is_valid():
        serializer.save()
        print(f"✓ Update successful! New shifts: {teacher.shifts}")
    else:
        print(f"✗ Validation errors: {serializer.errors}")
else:
    print("No teachers found in database")
