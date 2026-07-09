import uuid
"""
Tests for Marks app (model + basic CRUD via a registrar user).

Role-based access-control scoping is covered separately in
``test_role_access.py``.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from .models import MarksRecord


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


class MarksRecordModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com',
            password='testpass123', role='registrar')
        self.department = Department.objects.create(name=f'Computer Science {uuid.uuid4().hex[:6]}', code=f'CS{uuid.uuid4().hex[:5]}')
        self.student = _make_student(self.department)

    def test_create_marks_record(self):
        record = MarksRecord.objects.create(
            student=self.student, subject_code='CS101', subject_name='Programming',
            semester=1, exam_type='midterm', marks_obtained=Decimal('85.50'),
            total_marks=Decimal('100.00'), recorded_by=self.user)
        self.assertEqual(record.student, self.student)
        self.assertEqual(record.marks_obtained, Decimal('85.50'))
        self.assertEqual(str(record), "Test Student - Programming (midterm): 85.50/100.00")

    def test_percentage_calculation(self):
        record = MarksRecord.objects.create(
            student=self.student, subject_code='CS101', subject_name='Programming',
            semester=1, exam_type='midterm', marks_obtained=Decimal('85.00'),
            total_marks=Decimal('100.00'), recorded_by=self.user)
        self.assertEqual(record.percentage(), 85.0)

    def test_percentage_with_zero_total(self):
        record = MarksRecord.objects.create(
            student=self.student, subject_code='CS101', subject_name='Programming',
            semester=1, exam_type='midterm', marks_obtained=Decimal('0.00'),
            total_marks=Decimal('0.00'), recorded_by=self.user)
        self.assertEqual(record.percentage(), 0)


class MarksViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Registrar has full marks access (row scoping is a no-op).
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com',
            password='testpass123', role='registrar')
        self.client.force_authenticate(user=self.user)
        self.department = Department.objects.create(name=f'Computer Science {uuid.uuid4().hex[:6]}', code=f'CS{uuid.uuid4().hex[:5]}')
        self.student = _make_student(self.department)

    def _record(self, **kw):
        defaults = dict(
            student=self.student, subject_code='CS101', subject_name='Programming',
            semester=1, exam_type='midterm', marks_obtained=Decimal('85.50'),
            total_marks=Decimal('100.00'), recorded_by=self.user)
        defaults.update(kw)
        return MarksRecord.objects.create(**defaults)

    def test_create_marks_record(self):
        data = {
            'student': str(self.student.id), 'subject_code': 'CS101',
            'subject_name': 'Programming', 'semester': 1, 'exam_type': 'midterm',
            'marks_obtained': '85.50', 'total_marks': '100.00',
            'recorded_by': str(self.user.id)}
        response = self.client.post('/api/marks/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MarksRecord.objects.count(), 1)

    def test_create_marks_exceeding_total(self):
        data = {
            'student': str(self.student.id), 'subject_code': 'CS101',
            'subject_name': 'Programming', 'semester': 1, 'exam_type': 'midterm',
            'marks_obtained': '110.00', 'total_marks': '100.00',
            'recorded_by': str(self.user.id)}
        response = self.client.post('/api/marks/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_marks_records(self):
        self._record()
        response = self.client.get('/api/marks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_exam_type(self):
        self._record(exam_type='midterm')
        self._record(exam_type='final', subject_code='CS102')
        response = self.client.get('/api/marks/', {'exam_type': 'midterm'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_student_marks(self):
        self._record(subject_code='CS101')
        self._record(subject_code='CS102', subject_name='Data Structures')
        response = self.client.get('/api/marks/student_marks/', {'student': str(self.student.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['marks']), 2)

    def test_student_marks_without_student_id(self):
        response = self.client.get('/api/marks/student_marks/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
