"""
Teacher Request Tests
"""
from django.test import TestCase
from .models import TeacherRequest
from apps.teachers.models import Teacher
from apps.students.models import Student
from apps.departments.models import Department
from datetime import date


class TeacherRequestModelTest(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            name='Computer Technology',
            code='CT'
        )
        
        self.teacher = Teacher.objects.create(
            fullNameBangla='আব্দুল করিম',
            fullNameEnglish='Abdul Karim',
            designation='Senior Instructor',
            department=self.department,
            email='abdul.karim@test.edu.bd',
            mobileNumber='01712345678',
            officeLocation='Room 201',
            joiningDate=date(2020, 1, 1)
        )
        
        self.student = Student.objects.create(
            fullNameBangla='রাকিব হাসান',
            fullNameEnglish='Rakib Hasan',
            fatherName='Hasan Ali',
            fatherNID='1234567890',
            motherName='Fatima Begum',
            motherNID='0987654321',
            dateOfBirth=date(2000, 1, 1),
            birthCertificateNo='12345',
            gender='Male',
            mobileStudent='01812345678',
            guardianMobile='01912345678',
            emergencyContact='01712345678',
            presentAddress={},
            permanentAddress={},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber='123456',
            registrationNumber='1234567890',
            passingYear=2020,
            gpa=5.00,
            currentRollNumber='CT-2020-001',
            currentRegistrationNumber='REG-2020-001',
            semester=1,
            department=self.department,
            session='2020-2021',
            shift='Day',
            currentGroup='A',
            enrollmentDate=date(2020, 1, 1)
        )
    
    def test_create_teacher_request(self):
        request = TeacherRequest.objects.create(
            student=self.student,
            teacher=self.teacher,
            subject='Programming Help',
            message='I need help with my programming assignment'
        )
        self.assertEqual(request.status, 'pending')
        self.assertEqual(request.subject, 'Programming Help')
