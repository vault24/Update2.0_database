#!/usr/bin/env python3
"""
Test script to debug alumni API issues
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
from apps.departments.models import Department

def test_alumni_functionality():
    print("=== Alumni API Debug Test ===\n")
    
    # 1. Check if there are any existing alumni
    print("1. Checking existing alumni records:")
    alumni_count = Alumni.objects.count()
    print(f"   Total alumni in database: {alumni_count}")
    
    if alumni_count > 0:
        print("   Existing alumni:")
        for alumni in Alumni.objects.all()[:5]:  # Show first 5
            print(f"   - {alumni.student.fullNameEnglish} (Graduation: {alumni.graduationYear})")
    
    print()
    
    # 2. Check students eligible for alumni transition
    print("2. Checking students eligible for alumni transition:")
    active_students = Student.objects.filter(status='active')
    print(f"   Total active students: {active_students.count()}")
    
    eligible_students = []
    for student in active_students:
        if student.semester == 8:
            print(f"   - {student.fullNameEnglish} (8th semester)")
            eligible_students.append(student)
        elif student.semesterResults:
            has_8th_result = any(
                result.get('semester') == 8 and 
                result.get('resultType') == 'gpa' and 
                result.get('gpa', 0) > 0
                for result in student.semesterResults
            )
            if has_8th_result:
                print(f"   - {student.fullNameEnglish} (has 8th semester results)")
                eligible_students.append(student)
    
    print(f"   Total eligible students: {len(eligible_students)}")
    print()
    
    # 3. Test creating an alumni record manually
    if eligible_students:
        test_student = eligible_students[0]
        print(f"3. Testing alumni creation for: {test_student.fullNameEnglish}")
        
        # Check if already has alumni record
        if hasattr(test_student, 'alumni'):
            print(f"   Student already has alumni record: {test_student.alumni}")
        else:
            try:
                # Create alumni record
                alumni = Alumni.objects.create(
                    student=test_student,
                    alumniType='recent',
                    graduationYear=2024,
                    currentSupportCategory='no_support_needed'
                )
                print(f"   ✓ Successfully created alumni record: {alumni}")
                
                # Update student status
                test_student.status = 'graduated'
                test_student.save()
                print(f"   ✓ Updated student status to graduated")
                
            except Exception as e:
                print(f"   ✗ Error creating alumni record: {e}")
    else:
        print("3. No eligible students found for testing")
    
    print()
    
    # 4. Final check
    print("4. Final alumni count:")
    final_count = Alumni.objects.count()
    print(f"   Total alumni after test: {final_count}")
    
    if final_count > 0:
        print("   Alumni records:")
        for alumni in Alumni.objects.all():
            print(f"   - {alumni.student.fullNameEnglish} (Status: {alumni.student.status}, Year: {alumni.graduationYear})")

if __name__ == "__main__":
    test_alumni_functionality()