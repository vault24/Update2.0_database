#!/usr/bin/env python3
"""
Check student data to understand eligibility issues
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

def check_students():
    print("=== Student Data Analysis ===\n")
    
    # 1. Check total students
    total_students = Student.objects.count()
    print(f"1. Total students in database: {total_students}")
    
    if total_students == 0:
        print("   No students found in database!")
        return
    
    # 2. Check students by status
    print("\n2. Students by status:")
    for status in ['active', 'inactive', 'graduated', 'discontinued']:
        count = Student.objects.filter(status=status).count()
        print(f"   {status}: {count}")
    
    # 3. Check students by semester
    print("\n3. Students by semester:")
    for semester in range(1, 9):
        count = Student.objects.filter(semester=semester).count()
        print(f"   Semester {semester}: {count}")
    
    # 4. Check active students in detail
    print("\n4. Active students details:")
    active_students = Student.objects.filter(status='active')[:10]  # First 10
    
    for student in active_students:
        print(f"\n   Student: {student.fullNameEnglish}")
        print(f"   - Roll: {student.currentRollNumber}")
        print(f"   - Semester: {student.semester}")
        print(f"   - Status: {student.status}")
        print(f"   - Semester Results: {len(student.semesterResults) if student.semesterResults else 0} records")
        
        if student.semesterResults:
            print("   - Results by semester:")
            for result in student.semesterResults:
                semester = result.get('semester', 'Unknown')
                result_type = result.get('resultType', 'Unknown')
                gpa = result.get('gpa', 'N/A')
                print(f"     * Semester {semester}: {result_type}, GPA: {gpa}")
        
        # Check eligibility
        is_8th_semester = student.semester == 8
        has_8th_result = False
        if student.semesterResults:
            has_8th_result = any(
                result.get('semester') == 8 and 
                result.get('resultType') == 'gpa' and 
                result.get('gpa', 0) > 0
                for result in student.semesterResults
            )
        
        is_eligible = student.status == 'active' and (is_8th_semester or has_8th_result)
        print(f"   - Eligible for alumni: {is_eligible}")
        print(f"     (8th semester: {is_8th_semester}, has 8th result: {has_8th_result})")

if __name__ == "__main__":
    check_students()