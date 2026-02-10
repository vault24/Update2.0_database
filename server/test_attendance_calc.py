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
    
    # Get current semester attendance
    current_semester = student.semester
    for attendance_record in student.semesterAttendance:
        if attendance_record.get('semester') == current_semester:
            # Check if averagePercentage is provided
            if 'averagePercentage' in attendance_record:
                return Decimal(str(attendance_record.get('averagePercentage', 0)))
            
            # Calculate from subjects if averagePercentage not provided
            subjects = attendance_record.get('subjects', [])
            if subjects:
                total_present = sum(subj.get('present', 0) for subj in subjects)
                total_classes = sum(subj.get('total', 0) for subj in subjects)
                if total_classes > 0:
                    percentage = (total_present / total_classes) * 100
                    return Decimal(str(round(percentage, 2)))
            
            return Decimal('0.00')
    
    # If no attendance for current semester, return 0
    return Decimal('0.00')

try:
    student = Student.objects.get(id=student_id)
    print(f"Student: {student.fullNameEnglish}")
    print(f"Current Semester: {student.semester}")
    
    attendance = calculate_attendance(student)
    print(f"\nCalculated Attendance: {attendance}%")
    
    # Show calculation details
    for record in student.semesterAttendance:
        if record.get('semester') == student.semester:
            subjects = record.get('subjects', [])
            print(f"\nSubjects in Semester {student.semester}:")
            total_present = 0
            total_classes = 0
            for subj in subjects:
                present = subj.get('present', 0)
                total = subj.get('total', 0)
                total_present += present
                total_classes += total
                print(f"  - {subj.get('name')}: {present}/{total} = {(present/total*100):.2f}%")
            
            print(f"\nTotal: {total_present}/{total_classes} = {(total_present/total_classes*100):.2f}%")
            
except Student.DoesNotExist:
    print(f"Student with ID {student_id} not found")
