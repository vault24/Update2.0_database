#!/usr/bin/env python3
"""
Add 8th semester results to active student for testing
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

def add_8th_semester_results():
    print("=== Adding 8th Semester Results ===\n")
    
    # Find the active student
    active_student = Student.objects.filter(status='active').first()
    
    if not active_student:
        print("No active student found!")
        return
    
    print(f"Adding 8th semester results to: {active_student.fullNameEnglish}")
    print(f"Current semester: {active_student.semester}")
    print(f"Current results: {len(active_student.semesterResults) if active_student.semesterResults else 0}")
    
    # Add 8th semester results
    if not active_student.semesterResults:
        active_student.semesterResults = []
    
    # Add results for semesters 3-8 to make the student eligible
    new_results = [
        {
            "semester": 3,
            "year": 2023,
            "resultType": "gpa",
            "gpa": 3.5,
            "cgpa": 3.6,
            "subjects": []
        },
        {
            "semester": 4,
            "year": 2023,
            "resultType": "gpa",
            "gpa": 3.7,
            "cgpa": 3.65,
            "subjects": []
        },
        {
            "semester": 5,
            "year": 2024,
            "resultType": "gpa",
            "gpa": 3.8,
            "cgpa": 3.7,
            "subjects": []
        },
        {
            "semester": 6,
            "year": 2024,
            "resultType": "gpa",
            "gpa": 3.6,
            "cgpa": 3.68,
            "subjects": []
        },
        {
            "semester": 7,
            "year": 2024,
            "resultType": "gpa",
            "gpa": 3.9,
            "cgpa": 3.72,
            "subjects": []
        },
        {
            "semester": 8,
            "year": 2024,
            "resultType": "gpa",
            "gpa": 3.75,
            "cgpa": 3.73,
            "subjects": []
        }
    ]
    
    # Add new results to existing ones
    active_student.semesterResults.extend(new_results)
    
    # Also update the student to 8th semester
    active_student.semester = 8
    
    active_student.save()
    
    print(f"✓ Added results for semesters 3-8")
    print(f"✓ Updated student to 8th semester")
    print(f"✓ Student now has {len(active_student.semesterResults)} semester results")
    
    # Check eligibility
    has_8th_result = any(
        result.get('semester') == 8 and 
        result.get('resultType') == 'gpa' and 
        result.get('gpa', 0) > 0
        for result in active_student.semesterResults
    )
    
    is_eligible = active_student.status == 'active' and (active_student.semester == 8 or has_8th_result)
    print(f"✓ Student is now eligible for alumni: {is_eligible}")

if __name__ == "__main__":
    add_8th_semester_results()