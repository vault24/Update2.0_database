import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.students.models import Student
import json

student_id = '3aad04f7-db5f-4669-a18c-3e307b3a6622'

try:
    student = Student.objects.get(id=student_id)
    print(f"Student: {student.fullNameEnglish}")
    print(f"Current Semester: {student.semester}")
    print(f"Status: {student.status}")
    print(f"\nSemester Attendance Data:")
    print(json.dumps(student.semesterAttendance, indent=2))
    
    # Check current semester attendance
    current_sem = student.semester
    current_attendance = None
    
    for record in student.semesterAttendance:
        if record.get('semester') == current_sem:
            current_attendance = record.get('averagePercentage')
            print(f"\n✓ Current Semester ({current_sem}) Attendance: {current_attendance}%")
            break
    
    if not current_attendance:
        print(f"\n✗ No attendance record found for current semester {current_sem}")
        
except Student.DoesNotExist:
    print(f"Student with ID {student_id} not found")
