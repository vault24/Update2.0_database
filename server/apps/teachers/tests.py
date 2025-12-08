"""
Teacher Tests
"""
from django.test import TestCase
from .models import Teacher
from apps.departments.models import Department
from datetime import date


class TeacherModelTest(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            name='Computer Technology',
            code='CT'
        )
    
    def test_create_teacher(self):
        teacher = Teacher.objects.create(
            fullNameBangla='আব্দুল করিম',
            fullNameEnglish='Abdul Karim',
            designation='Senior Instructor',
            department=self.department,
            email='abdul.karim@test.edu.bd',
            mobileNumber='01712345678',
            officeLocation='Room 201',
            joiningDate=date(2020, 1, 1)
        )
        self.assertEqual(teacher.fullNameEnglish, 'Abdul Karim')
        self.assertEqual(teacher.employmentStatus, 'active')
