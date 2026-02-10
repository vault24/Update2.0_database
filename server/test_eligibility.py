import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.students.models import Student
from decimal import Decimal

student_id = '3aad04f7-db5f-4669-a18c-3e307b3a6622'

def calculate_attendance(student):
    """Calculate average attendance for a student based on current semester"""
    if not student.semesterAttendance:
        return Decimal('0.00')
    
    current_semester = student.semester
    for attendance_record in student.semesterAttendance:
        if attendance_record.get('semester') == current_semester:
            if 'averagePercentage' in attendance_record:
                return Decimal(str(attendance_record.get('averagePercentage', 0)))
            
            subjects = attendance_record.get('subjects', [])
            if subjects:
                total_present = sum(subj.get('present', 0) for subj in subjects)
                total_classes = sum(subj.get('total', 0) for subj in subjects)
                if total_classes > 0:
                    percentage = (total_present / total_classes) * 100
                    return Decimal(str(round(percentage, 2)))
            
            return Decimal('0.00')
    
    return Decimal('0.00')

def get_subject_status(student):
    """Get referred subjects count for a student"""
    if not student.semesterResults:
        return 0, 0, 0
    
    latest_semester = student.semester
    for result in student.semesterResults:
        if result.get('semester') == latest_semester:
            referred = len(result.get('referredSubjects', []))
            subjects = result.get('subjects', [])
            total = len(subjects)
            passed = total - referred
            return referred, total, passed
    
    return 0, 6, 6

try:
    student = Student.objects.get(id=student_id)
    
    print("=" * 60)
    print("ELIGIBILITY CHECK")
    print("=" * 60)
    print(f"Student: {student.fullNameEnglish}")
    print(f"Roll: {student.currentRollNumber}")
    print(f"Department: {student.department.name if student.department else 'N/A'}")
    print(f"Current Semester: {student.semester}")
    print(f"Status: {student.status}")
    
    # Calculate attendance
    attendance = calculate_attendance(student)
    print(f"\n✓ Attendance: {attendance}%")
    
    # Get subject status
    referred, total, passed = get_subject_status(student)
    print(f"✓ Subjects: {passed}/{total} passed, {referred} referred")
    
    # Check eligibility with default criteria
    min_attendance = 75
    pass_requirement = 'all_pass'
    
    print(f"\n--- Eligibility Criteria ---")
    print(f"Min Attendance: {min_attendance}%")
    print(f"Pass Requirement: {pass_requirement}")
    
    print(f"\n--- Eligibility Check ---")
    
    # Check attendance
    if attendance >= min_attendance:
        print(f"✓ Attendance Check: PASS ({attendance}% >= {min_attendance}%)")
    else:
        print(f"✗ Attendance Check: FAIL ({attendance}% < {min_attendance}%)")
    
    # Check pass requirement
    if pass_requirement == 'all_pass':
        if referred == 0:
            print(f"✓ Pass Requirement: PASS (No referred subjects)")
        else:
            print(f"✗ Pass Requirement: FAIL ({referred} referred subjects)")
    
    # Final result
    is_eligible = attendance >= min_attendance and (pass_requirement != 'all_pass' or referred == 0)
    
    print(f"\n{'='*60}")
    if is_eligible:
        print("✓✓✓ STUDENT IS ELIGIBLE ✓✓✓")
    else:
        print("✗✗✗ STUDENT IS NOT ELIGIBLE ✗✗✗")
    print(f"{'='*60}")
    
except Student.DoesNotExist:
    print(f"Student with ID {student_id} not found")
