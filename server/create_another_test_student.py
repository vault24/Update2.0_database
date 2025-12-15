#!/usr/bin/env python3
"""
Create another test student for frontend testing
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

def create_another_test_student():
    print("=== Creating Another Test Student ===\n")
    
    # Get a department
    department = Department.objects.first()
    
    # Create test student
    student = Student.objects.create(
        id=str(uuid.uuid4()),
        fullNameEnglish="Jane Smith",
        fullNameBangla="জেন স্মিথ",
        fatherName="John Smith",
        fatherNID="1111111111",
        motherName="Mary Smith",
        motherNID="2222222222",
        dateOfBirth="1999-05-15",
        birthCertificateNo="11111111111111111",
        gender="Female",
        religion="Christianity",
        bloodGroup="B+",
        mobileStudent="01711111111",
        guardianMobile="01811111111",
        email="jane@example.com",
        emergencyContact="01911111111",
        presentAddress={
            "division": "Chittagong",
            "district": "Chittagong",
            "upazila": "Kotwali",
            "postOffice": "Kotwali",
            "village": "Kotwali"
        },
        permanentAddress={
            "division": "Chittagong",
            "district": "Chittagong",
            "upazila": "Kotwali",
            "postOffice": "Kotwali",
            "village": "Kotwali"
        },
        highestExam="HSC",
        board="Chittagong",
        group="Science",
        rollNumber="111111",
        registrationNumber="1111111111",
        passingYear=2019,
        gpa=5.0,
        institutionName="Chittagong College",
        currentRollNumber="831000",
        currentRegistrationNumber="1111111111111",
        semester=8,
        department=department,
        session="2019-20",
        shift="Day",
        currentGroup="A",
        enrollmentDate="2019-09-01",
        status="active",
        semesterResults=[
            {
                "semester": 1,
                "year": 2020,
                "resultType": "gpa",
                "gpa": 4.0,
                "cgpa": 4.0,
                "subjects": []
            },
            {
                "semester": 2,
                "year": 2020,
                "resultType": "gpa",
                "gpa": 4.1,
                "cgpa": 4.05,
                "subjects": []
            },
            {
                "semester": 3,
                "year": 2021,
                "resultType": "gpa",
                "gpa": 4.2,
                "cgpa": 4.1,
                "subjects": []
            },
            {
                "semester": 4,
                "year": 2021,
                "resultType": "gpa",
                "gpa": 4.3,
                "cgpa": 4.15,
                "subjects": []
            },
            {
                "semester": 5,
                "year": 2022,
                "resultType": "gpa",
                "gpa": 4.4,
                "cgpa": 4.2,
                "subjects": []
            },
            {
                "semester": 6,
                "year": 2022,
                "resultType": "gpa",
                "gpa": 4.5,
                "cgpa": 4.25,
                "subjects": []
            },
            {
                "semester": 7,
                "year": 2023,
                "resultType": "gpa",
                "gpa": 4.6,
                "cgpa": 4.3,
                "subjects": []
            },
            {
                "semester": 8,
                "year": 2024,
                "resultType": "gpa",
                "gpa": 4.7,
                "cgpa": 4.35,
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
    create_another_test_student()