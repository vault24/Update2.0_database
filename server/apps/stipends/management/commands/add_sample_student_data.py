"""
Management command to add sample student data for stipend testing
"""
from django.core.management.base import BaseCommand
from apps.students.models import Student
from apps.departments.models import Department
from decimal import Decimal
import random


class Command(BaseCommand):
    help = 'Add sample student data with results and attendance for stipend testing'

    def handle(self, *args, **options):
        # Get or create department
        dept, _ = Department.objects.get_or_create(
            code='CT',
            defaults={
                'name': 'Computer Technology',
                'description': 'Computer Technology Department'
            }
        )
        
        # Sample student data
        students_data = [
            {
                'name': 'Mohammad Rahman',
                'nameBangla': 'মোহাম্মদ রহমান',
                'roll': 'CT-2024-001',
                'attendance': 92,
                'gpa': 3.75,
                'referred': 0
            },
            {
                'name': 'Fatima Akter',
                'nameBangla': 'ফাতিমা আক্তার',
                'roll': 'CT-2024-002',
                'attendance': 88,
                'gpa': 3.50,
                'referred': 0
            },
            {
                'name': 'Abdul Karim',
                'nameBangla': 'আব্দুল করিম',
                'roll': 'CT-2024-003',
                'attendance': 85,
                'gpa': 3.25,
                'referred': 1
            },
            {
                'name': 'Nusrat Jahan',
                'nameBangla': 'নুসরাত জাহান',
                'roll': 'CT-2024-004',
                'attendance': 90,
                'gpa': 3.80,
                'referred': 0
            },
            {
                'name': 'Rafiqul Islam',
                'nameBangla': 'রফিকুল ইসলাম',
                'roll': 'CT-2024-005',
                'attendance': 78,
                'gpa': 3.10,
                'referred': 1
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for data in students_data:
            # Check if student exists
            student, created = Student.objects.get_or_create(
                currentRollNumber=data['roll'],
                defaults={
                    'fullNameEnglish': data['name'],
                    'fullNameBangla': data['nameBangla'],
                    'fatherName': 'Father Name',
                    'fatherNID': '1234567890',
                    'motherName': 'Mother Name',
                    'motherNID': '0987654321',
                    'dateOfBirth': '2005-01-01',
                    'birthCertificateNo': '12345678901234567',
                    'gender': 'Male',
                    'religion': 'Islam',
                    'bloodGroup': 'A+',
                    'mobileStudent': '01712345678',
                    'guardianMobile': '01812345678',
                    'email': f"{data['roll'].lower().replace('-', '')}@example.com",
                    'emergencyContact': '01912345678',
                    'presentAddress': {
                        'village': 'Test Village',
                        'postOffice': 'Test PO',
                        'upazila': 'Test Upazila',
                        'district': 'Dhaka',
                        'division': 'Dhaka'
                    },
                    'permanentAddress': {
                        'village': 'Test Village',
                        'postOffice': 'Test PO',
                        'upazila': 'Test Upazila',
                        'district': 'Dhaka',
                        'division': 'Dhaka'
                    },
                    'highestExam': 'SSC',
                    'board': 'Dhaka',
                    'group': 'Science',
                    'rollNumber': '123456',
                    'registrationNumber': '1234567890',
                    'passingYear': 2023,
                    'gpa': Decimal('4.50'),
                    'currentRegistrationNumber': f"REG-{data['roll']}",
                    'semester': 4,
                    'department': dept,
                    'session': '2023-2024',
                    'shift': random.choice(['Morning', 'Day', 'Evening']),
                    'currentGroup': 'Computer',
                    'status': 'active',
                    'enrollmentDate': '2023-01-01',
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created student: {data["name"]}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'Student already exists: {data["name"]}'))
            
            # Add semester results
            semester_results = [
                {
                    'semester': 3,
                    'year': 2024,
                    'resultType': 'gpa',
                    'gpa': float(data['gpa'] - 0.1),
                    'cgpa': float(data['gpa'] - 0.15),
                    'subjects': [
                        {'code': 'CT301', 'name': 'Programming', 'credit': 4, 'grade': 'A', 'gradePoint': 4.0},
                        {'code': 'CT302', 'name': 'Database', 'credit': 4, 'grade': 'A-', 'gradePoint': 3.5},
                        {'code': 'CT303', 'name': 'Networking', 'credit': 3, 'grade': 'B+', 'gradePoint': 3.25},
                    ],
                    'referredSubjects': ['CT304'] if data['referred'] > 0 else []
                },
                {
                    'semester': 4,
                    'year': 2024,
                    'resultType': 'gpa',
                    'gpa': float(data['gpa']),
                    'cgpa': float(data['gpa'] - 0.05),
                    'subjects': [
                        {'code': 'CT401', 'name': 'Web Development', 'credit': 4, 'grade': 'A+', 'gradePoint': 4.0},
                        {'code': 'CT402', 'name': 'Software Engineering', 'credit': 4, 'grade': 'A', 'gradePoint': 4.0},
                        {'code': 'CT403', 'name': 'Data Structures', 'credit': 3, 'grade': 'A-', 'gradePoint': 3.5},
                    ],
                    'referredSubjects': []
                }
            ]
            
            # Add semester attendance
            semester_attendance = [
                {
                    'semester': 3,
                    'year': 2024,
                    'subjects': [
                        {'code': 'CT301', 'name': 'Programming', 'present': 45, 'total': 50, 'percentage': 90},
                        {'code': 'CT302', 'name': 'Database', 'present': 42, 'total': 50, 'percentage': 84},
                    ],
                    'averagePercentage': float(data['attendance'] - 2)
                },
                {
                    'semester': 4,
                    'year': 2024,
                    'subjects': [
                        {'code': 'CT401', 'name': 'Web Development', 'present': 46, 'total': 50, 'percentage': 92},
                        {'code': 'CT402', 'name': 'Software Engineering', 'present': 44, 'total': 50, 'percentage': 88},
                    ],
                    'averagePercentage': float(data['attendance'])
                }
            ]
            
            student.semesterResults = semester_results
            student.semesterAttendance = semester_attendance
            student.save()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully processed {len(students_data)} students '
                f'({created_count} created, {updated_count} updated)'
            )
        )
