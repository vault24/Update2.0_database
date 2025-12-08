"""
Tests for Marks app
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from .models import MarksRecord


class MarksRecordModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin'
        )
        self.department = Department.objects.create(
            name='Computer Science',
            code='CS'
        )
        self.student = Student.objects.create(
            rollNumber='CS001',
            fullNameEnglish='Test Student',
            fullNameBangla='টেস্ট স্টুডেন্ট',
            department=self.department,
            semester=1,
            shift='day',
            status='active'
        )
    
    def test_create_marks_record(self):
        record = MarksRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            exam_type='midterm',
            marks_obtained=Decimal('85.50'),
            total_marks=Decimal('100.00'),
            recorded_by=self.user
        )
        self.assertEqual(record.student, self.student)
        self.assertEqual(record.marks_obtained, Decimal('85.50'))
        self.assertEqual(str(record), "Test Student - Programming (midterm): 85.50/100.00")
    
    def test_percentage_calculation(self):
        record = MarksRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            exam_type='midterm',
            marks_obtained=Decimal('85.00'),
            total_marks=Decimal('100.00'),
            recorded_by=self.user
        )
        self.assertEqual(record.percentage(), 85.0)
    
    def test_percentage_with_zero_total(self):
        record = MarksRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            exam_type='midterm',
            marks_obtained=Decimal('0.00'),
            total_marks=Decimal('0.00'),
            recorded_by=self.user
        )
        self.assertEqual(record.percentage(), 0)


class MarksViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin'
        )
        self.client.force_authenticate(user=self.user)
        
        self.department = Department.objects.create(
            name='Computer Science',
            code='CS'
        )
        self.student = Student.objects.create(
            rollNumber='CS001',
            fullNameEnglish='Test Student',
            fullNameBangla='টেস্ট স্টুডেন্ট',
            department=self.department,
            semester=1,
            shift='day',
            status='active'
        )
    
    def test_create_marks_record(self):
        url = reverse('marksrecord-list')
        data = {
            'student': str(self.student.id),
            'subject_code': 'CS101',
            'subject_name': 'Programming',
            'semester': 1,
            'exam_type': 'midterm',
            'marks_obtained': '85.50',
            'total_marks': '100.00',
            'recorded_by': str(self.user.id)
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MarksRecord.objects.count(), 1)
    
    def test_create_marks_exceeding_total(self):
        url = reverse('marksrecord-list')
        data = {
            'student': str(self.student.id),
            'subject_code': 'CS101',
            'subject_name': 'Programming',
            'semester': 1,
            'exam_type': 'midterm',
            'marks_obtained': '110.00',
            'total_marks': '100.00',
            'recorded_by': str(self.user.id)
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_list_marks_records(self):
        MarksRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            exam_type='midterm',
            marks_obtained=Decimal('85.50'),
            total_marks=Decimal('100.00'),
            recorded_by=self.user
        )
        url = reverse('marksrecord-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_by_student(self):
        MarksRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            exam_type='midterm',
            marks_obtained=Decimal('85.50'),
            total_marks=Decimal('100.00'),
            recorded_by=self.user
        )
        url = reverse('marksrecord-list')
        response = self.client.get(url, {'student': str(self.student.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_by_exam_type(self):
        MarksRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            exam_type='midterm',
            marks_obtained=Decimal('85.50'),
            total_marks=Decimal('100.00'),
            recorded_by=self.user
        )
        MarksRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            exam_type='final',
            marks_obtained=Decimal('90.00'),
            total_marks=Decimal('100.00'),
            recorded_by=self.user
        )
        url = reverse('marksrecord-list')
        response = self.client.get(url, {'exam_type': 'midterm'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_student_marks(self):
        MarksRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            exam_type='midterm',
            marks_obtained=Decimal('85.50'),
            total_marks=Decimal('100.00'),
            recorded_by=self.user
        )
        MarksRecord.objects.create(
            student=self.student,
            subject_code='CS102',
            subject_name='Data Structures',
            semester=1,
            exam_type='midterm',
            marks_obtained=Decimal('90.00'),
            total_marks=Decimal('100.00'),
            recorded_by=self.user
        )
        
        url = reverse('marksrecord-student-marks')
        response = self.client.get(url, {'student': str(self.student.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('marks', response.data)
        self.assertEqual(len(response.data['marks']), 2)
    
    def test_student_marks_filter_by_semester(self):
        MarksRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            exam_type='midterm',
            marks_obtained=Decimal('85.50'),
            total_marks=Decimal('100.00'),
            recorded_by=self.user
        )
        
        url = reverse('marksrecord-student-marks')
        response = self.client.get(url, {'student': str(self.student.id), 'semester': 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['marks']), 1)
    
    def test_student_marks_without_student_id(self):
        url = reverse('marksrecord-student-marks')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
