#!/usr/bin/env python3
"""
Create a test student for alumni transition testing
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
from apps.departments.models import Department
import uuid

def create_test_student():
    print("=== Creating Test Student ===\n")
    
    # Get a department
    department = Department.objects.first()
    if not department:
        print("No departments found! Creating one...")
        department = Department.objects.create(
            name="Computer Science & Technology",
            code="CST"
        )
    
    # Create test student
    student = Student.objects.create(
        id=str(uuid.uuid4()),
        fullNameEnglish="Test Student for Alumni",
        fullNameBangla="টেস্ট স্টুডেন্ট",
        fatherName="Test Father",
        fatherNID="1234567890",
        motherName="Test Mother",
        motherNID="0987654321",
        dateOfBirth="2000-01-01",
        birthCertificateNo="12345678901234567",
        gender="Male",
        religion="Islam",
        bloodGroup="A+",
        mobileStudent="01700000000",
        guardianMobile="01800000000",
        email="test@example.com",
        emergencyContact="01900000000",
        presentAddress={
            "division": "Dhaka",
            "district": "Dhaka",
            "upazila": "Dhanmondi",
            "postOffice": "Dhanmondi",
            "village": "Dhanmondi"
        },
        permanentAddress={
            "division": "Dhaka",
            "district": "Dhaka",
            "upazila": "Dhanmondi",
            "postOffice": "Dhanmondi",
            "village": "Dhanmondi"
        },
        highestExam="HSC",
        board="Dhaka",
        group="Science",
        rollNumber="123456",
        registrationNumber="1234567890",
        passingYear=2020,
        gpa=4.5,
        institutionName="Test College",
        currentRollNumber="830999",
        currentRegistrationNumber="1234567890123",
        semester=8,
        department=department,
        session="2020-21",
        shift="Day",
        currentGroup="A",
        enrollmentDate="2020-09-01",
        status="active",
        semesterResults=[
            {
                "semester": 1,
                "year": 2021,
                "resultType": "gpa",
                "gpa": 3.5,
                "cgpa": 3.5,
                "subjects": []
            },
            {
                "semester": 2,
                "year": 2021,
                "resultType": "gpa",
                "gpa": 3.6,
                "cgpa": 3.55,
                "subjects": []
            },
            {
                "semester": 3,
                "year": 2022,
                "resultType": "gpa",
                "gpa": 3.7,
                "cgpa": 3.6,
                "subjects": []
            },
            {
                "semester": 4,
                "year": 2022,
                "resultType": "gpa",
                "gpa": 3.8,
                "cgpa": 3.65,
                "subjects": []
            },
            {
                "semester": 5,
                "year": 2023,
                "resultType": "gpa",
                "gpa": 3.9,
                "cgpa": 3.7,
                "subjects": []
            },
            {
                "semester": 6,
                "year": 2023,
                "resultType": "gpa",
                "gpa": 4.0,
                "cgpa": 3.75,
                "subjects": []
            },
            {
                "semester": 7,
                "year": 2024,
                "resultType": "gpa",
                "gpa": 3.8,
                "cgpa": 3.76,
                "subjects": []
            },
            {
                "semester": 8,
                "year": 2024,
                "resultType": "gpa",
                "gpa": 3.9,
                "cgpa": 3.78,
                "subjects": []
            }
        ]
    )
    
    print(f"✓ Created test student: {student.fullNameEnglish}")
    print(f"  - ID: {student.id}")
    print(f"  - Roll: {student.currentRollNumber}")
    print(f"  - Semester: {student.semester}")
    print(f"  - Status: {student.status}")
    print(f"  - Has 8th semester result: {student.has_completed_eighth_semester()}")
    
    return student

if __name__ == "__main__":
    create_test_student()