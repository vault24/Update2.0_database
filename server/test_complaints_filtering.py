"""
Test script to verify complaints filtering is working correctly
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.authentication.models import User
from apps.students.models import Student
from apps.complaints.models import Complaint

print("Testing Complaints Filtering\n" + "="*50)

# Get a student user with valid related_profile_id
student_users = User.objects.filter(
    role__in=['student', 'captain'],
    related_profile_id__isnull=False
)

if not student_users.exists():
    print("ERROR: No student users with valid related_profile_id found!")
    exit(1)

# Test with first student
test_user = student_users.first()
print(f"\nTest User:")
print(f"  ID: {test_user.id}")
print(f"  Email: {test_user.email}")
print(f"  Role: {test_user.role}")
print(f"  Related Profile ID: {test_user.related_profile_id}")

# Get the student profile
student_profile = Student.objects.filter(id=test_user.related_profile_id).first()
if not student_profile:
    print(f"\nERROR: Student profile {test_user.related_profile_id} not found!")
    exit(1)

print(f"\nStudent Profile:")
print(f"  ID: {student_profile.id}")
print(f"  Name: {student_profile.fullNameEnglish}")

# Get all complaints
all_complaints = Complaint.objects.all()
print(f"\nTotal Complaints in Database: {all_complaints.count()}")

# Get complaints for this student
student_complaints = Complaint.objects.filter(student=student_profile)
print(f"Complaints for this student: {student_complaints.count()}")

if student_complaints.exists():
    print("\nStudent's Complaints:")
    for complaint in student_complaints:
        print(f"  - {complaint.reference_number}: {complaint.title}")
else:
    print("\nNo complaints found for this student")

# Check if there are complaints from other students
other_complaints = Complaint.objects.exclude(student=student_profile)
print(f"\nComplaints from other students: {other_complaints.count()}")

if other_complaints.exists():
    print("\nOther Students' Complaints (should NOT be visible):")
    for complaint in other_complaints[:5]:
        student_name = complaint.student.fullNameEnglish if complaint.student else "Unknown"
        print(f"  - {complaint.reference_number}: {complaint.title} (by {student_name})")

print("\n" + "="*50)
print("Test completed!")
