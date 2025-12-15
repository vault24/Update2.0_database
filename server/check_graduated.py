#!/usr/bin/env python3
"""
Check graduated students and alumni records
"""
import os
import sys
import django

# Add the server directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.students.models import Student
from apps.alumni.models import Alumni

def check_graduated_students():
    print("=== Graduated Students Analysis ===\n")
    
    # Check graduated students
    graduated_students = Student.objects.filter(status='graduated')
    print(f"Graduated students: {graduated_students.count()}")
    
    for student in graduated_students:
        print(f"\nStudent: {student.fullNameEnglish}")
        print(f"- Roll: {student.currentRollNumber}")
        print(f"- Semester: {student.semester}")
        print(f"- Status: {student.status}")
        
        # Check if has alumni record
        try:
            alumni = student.alumni
            print(f"- Has alumni record: YES")
            print(f"  * Alumni Type: {alumni.alumniType}")
            print(f"  * Graduation Year: {alumni.graduationYear}")
            print(f"  * Support Category: {alumni.currentSupportCategory}")
        except Alumni.DoesNotExist:
            print(f"- Has alumni record: NO")
    
    # Check all alumni records
    print(f"\nTotal alumni records: {Alumni.objects.count()}")
    for alumni in Alumni.objects.all():
        print(f"- {alumni.student.fullNameEnglish} (Year: {alumni.graduationYear})")

if __name__ == "__main__":
    check_graduated_students()