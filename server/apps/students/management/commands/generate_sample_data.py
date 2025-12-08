"""
Management command to generate sample student data
"""
from django.core.management.base import BaseCommand
from apps.departments.models import Department
from apps.students.models import Student
from apps.applications.models import Application
import random
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Generate sample student and application data for testing'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--students',
            type=int,
            default=10,
            help='Number of students to create (default: 10)'
        )
        parser.add_argument(
            '--applications',
            type=int,
            default=5,
            help='Number of applications to create (default: 5)'
        )
    
    def handle(self, *args, **options):
        """Generate sample data"""
        num_students = options['students']
        num_applications = options['applications']
        
        # Ensure departments exist
        departments = list(Department.objects.all())
        if not departments:
            self.stdout.write(
                self.style.ERROR('No departments found. Please run seed_departments first.')
            )
            return
        
        # Sample data
        bangla_names = ['রহিম আহমেদ', 'করিম হোসেন', 'সালমা খাতুন', 'ফাতেমা বেগম', 'আব্দুল্লাহ']
        english_names = ['Rahim Ahmed', 'Karim Hossain', 'Salma Khatun', 'Fatema Begum', 'Abdullah']
        father_names = ['Ahmed Ali', 'Hossain Khan', 'Rahman Sheikh', 'Islam Mia', 'Karim Uddin']
        mother_names = ['Amina Begum', 'Rahima Khatun', 'Salma Akter', 'Fatema Begum', 'Ayesha Siddika']
        
        # Generate students
        created_students = 0
        for i in range(num_students):
            try:
                student = Student.objects.create(
                    fullNameBangla=random.choice(bangla_names),
                    fullNameEnglish=random.choice(english_names),
                    fatherName=random.choice(father_names),
                    fatherNID=f'{random.randint(1000000000, 9999999999)}',
                    motherName=random.choice(mother_names),
                    motherNID=f'{random.randint(1000000000, 9999999999)}',
                    dateOfBirth=(datetime.now() - timedelta(days=random.randint(6570, 9125))).date(),
                    birthCertificateNo=f'BC{random.randint(100000, 999999)}',
                    gender=random.choice(['Male', 'Female']),
                    religion=random.choice(['Islam', 'Hinduism', 'Buddhism', 'Christianity']),
                    bloodGroup=random.choice(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
                    maritalStatus=random.choice(['Single', 'Married']),
                    mobileStudent=f'017{random.randint(10000000, 99999999)}',
                    guardianMobile=f'018{random.randint(10000000, 99999999)}',
                    email=f'student{i}@example.com',
                    emergencyContact=f'019{random.randint(10000000, 99999999)}',
                    presentAddress={
                        'division': 'Dhaka',
                        'district': 'Dhaka',
                        'subDistrict': 'Mirpur',
                        'policeStation': 'Mirpur',
                        'postOffice': 'Mirpur',
                        'municipality': 'Dhaka',
                        'village': 'Mirpur',
                        'ward': str(random.randint(1, 9))
                    },
                    permanentAddress={
                        'division': random.choice(['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna']),
                        'district': 'District',
                        'subDistrict': 'SubDistrict',
                        'policeStation': 'PS',
                        'postOffice': 'PO',
                        'municipality': 'Municipality',
                        'village': 'Village',
                        'ward': str(random.randint(1, 9))
                    },
                    highestExam='SSC',
                    board=random.choice(['Dhaka', 'Chittagong', 'Rajshahi', 'Comilla']),
                    group='Science',
                    rollNumber=f'{random.randint(100000, 999999)}',
                    registrationNumber=f'{random.randint(1000000000, 9999999999)}',
                    passingYear=random.randint(2018, 2022),
                    gpa=round(random.uniform(3.0, 5.0), 2),
                    institutionName='Sample School',
                    currentRollNumber=f'{random.randint(100000, 999999)}',
                    currentRegistrationNumber=f'{random.randint(1000000000, 9999999999)}',
                    semester=random.randint(1, 8),
                    department=random.choice(departments),
                    session=f'{random.randint(2020, 2023)}-{random.randint(2021, 2024)}',
                    shift=random.choice(['Morning', 'Day', 'Evening']),
                    currentGroup='A',
                    status=random.choice(['active', 'active', 'active', 'discontinued']),
                    enrollmentDate=(datetime.now() - timedelta(days=random.randint(365, 1460))).date(),
                )
                
                # Set discontinued fields if status is discontinued
                if student.status == 'discontinued':
                    student.discontinuedReason = random.choice([
                        'Financial difficulties',
                        'Personal reasons',
                        'Health issues',
                        'Family emergency',
                        'Job opportunity',
                        'Transfer to another institution'
                    ])
                    student.lastSemester = random.randint(1, student.semester)
                    student.save()
                created_students += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created student: {student.fullNameEnglish}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating student: {str(e)}')
                )
        
        # Generate applications
        created_applications = 0
        for i in range(num_applications):
            try:
                application = Application.objects.create(
                    fullNameBangla=random.choice(bangla_names),
                    fullNameEnglish=random.choice(english_names),
                    fatherName=random.choice(father_names),
                    motherName=random.choice(mother_names),
                    department=random.choice(departments).name,
                    session=f'{random.randint(2020, 2023)}-{random.randint(2021, 2024)}',
                    shift=random.choice(['Morning', 'Day', 'Evening']),
                    rollNumber=f'{random.randint(100000, 999999)}',
                    registrationNumber=f'{random.randint(1000000000, 9999999999)}',
                    email=f'applicant{i}@example.com',
                    applicationType=random.choice(['Testimonial', 'Certificate', 'Transcript', 'Stipend']),
                    subject='Request for document',
                    message='I need this document for my job application.',
                    status=random.choice(['pending', 'pending', 'approved', 'rejected'])
                )
                created_applications += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created application: {application.fullNameEnglish}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating application: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSample data generation complete!'
                f'\nStudents created: {created_students}'
                f'\nApplications created: {created_applications}'
            )
        )
