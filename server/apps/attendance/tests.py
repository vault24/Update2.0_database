import uuid
"""
Tests for Attendance app (model + basic CRUD via an admin/registrar user).

Role-based access-control scoping is covered separately in
``test_role_access.py``.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from .models import AttendanceRecord


def _make_student(dept, roll='CS001', sem=1, shift='Day'):
    return Student.objects.create(
        fullNameEnglish='Test Student',
        fullNameBangla='টেস্ট স্টুডেন্ট',
        currentRollNumber=roll,
        currentRegistrationNumber=f'REG-{roll}',
        department=dept,
        semester=sem,
        shift=shift,
        status='active',
    )


class AttendanceRecordModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com',
            password='testpass123', role='registrar')
        self.department = Department.objects.create(name=f'Computer Science {uuid.uuid4().hex[:6]}', code=f'CS{uuid.uuid4().hex[:5]}')
        self.student = _make_student(self.department)

    def test_create_attendance_record(self):
        record = AttendanceRecord.objects.create(
            student=self.student, subject_code='CS101', subject_name='Programming',
            semester=1, date=date.today(), is_present=True, recorded_by=self.user)
        self.assertEqual(record.student, self.student)
        self.assertTrue(record.is_present)
        # __str__ includes the workflow status in brackets.
        self.assertEqual(
            str(record),
            f"Test Student - Programming ({date.today()}) - Present [direct]")

    def test_unique_constraint(self):
        AttendanceRecord.objects.create(
            student=self.student, subject_code='CS101', subject_name='Programming',
            semester=1, date=date.today(), is_present=True, recorded_by=self.user)
        with self.assertRaises(Exception):
            AttendanceRecord.objects.create(
                student=self.student, subject_code='CS101', subject_name='Programming',
                semester=1, date=date.today(), is_present=False, recorded_by=self.user)


class AttendanceViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Registrar has full attendance access (row scoping is a no-op).
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com',
            password='testpass123', role='registrar')
        self.client.force_authenticate(user=self.user)
        self.department = Department.objects.create(name=f'Computer Science {uuid.uuid4().hex[:6]}', code=f'CS{uuid.uuid4().hex[:5]}')
        self.student = _make_student(self.department)

    def test_create_attendance_record(self):
        data = {
            'student': str(self.student.id), 'subject_code': 'CS101',
            'subject_name': 'Programming', 'semester': 1,
            'date': date.today().isoformat(), 'is_present': True,
            'recorded_by': str(self.user.id),
        }
        response = self.client.post('/api/attendance/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AttendanceRecord.objects.count(), 1)

    def test_list_attendance_records(self):
        AttendanceRecord.objects.create(
            student=self.student, subject_code='CS101', subject_name='Programming',
            semester=1, date=date.today(), is_present=True, recorded_by=self.user)
        response = self.client.get('/api/attendance/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_student_summary(self):
        for i in range(5):
            AttendanceRecord.objects.create(
                student=self.student, subject_code='CS101', subject_name='Programming',
                semester=1, date=date.today() - timedelta(days=i),
                is_present=i < 3, status='approved', recorded_by=self.user)
        response = self.client.get(
            '/api/attendance/student_summary/', {'student': str(self.student.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data['summary'][0]
        self.assertEqual(summary['total'], 5)
        self.assertEqual(summary['present'], 3)
        self.assertEqual(summary['percentage'], 60.0)

    def test_student_summary_without_student_id(self):
        response = self.client.get('/api/attendance/student_summary/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
