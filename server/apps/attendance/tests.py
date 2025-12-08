"""
Tests for Attendance app
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from .models import AttendanceRecord


class AttendanceRecordModelTest(TestCase):
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
    
    def test_create_attendance_record(self):
        record = AttendanceRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            date=date.today(),
            is_present=True,
            recorded_by=self.user
        )
        self.assertEqual(record.student, self.student)
        self.assertTrue(record.is_present)
        self.assertEqual(str(record), f"Test Student - Programming ({date.today()}) - Present")
    
    def test_unique_constraint(self):
        AttendanceRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            date=date.today(),
            is_present=True,
            recorded_by=self.user
        )
        with self.assertRaises(Exception):
            AttendanceRecord.objects.create(
                student=self.student,
                subject_code='CS101',
                subject_name='Programming',
                semester=1,
                date=date.today(),
                is_present=False,
                recorded_by=self.user
            )


class AttendanceViewSetTest(TestCase):
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
    
    def test_create_attendance_record(self):
        url = reverse('attendancerecord-list')
        data = {
            'student': str(self.student.id),
            'subject_code': 'CS101',
            'subject_name': 'Programming',
            'semester': 1,
            'date': date.today().isoformat(),
            'is_present': True,
            'recorded_by': str(self.user.id)
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AttendanceRecord.objects.count(), 1)
    
    def test_list_attendance_records(self):
        AttendanceRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            date=date.today(),
            is_present=True,
            recorded_by=self.user
        )
        url = reverse('attendancerecord-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_by_student(self):
        AttendanceRecord.objects.create(
            student=self.student,
            subject_code='CS101',
            subject_name='Programming',
            semester=1,
            date=date.today(),
            is_present=True,
            recorded_by=self.user
        )
        url = reverse('attendancerecord-list')
        response = self.client.get(url, {'student': str(self.student.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_student_summary(self):
        # Create multiple attendance records
        for i in range(5):
            AttendanceRecord.objects.create(
                student=self.student,
                subject_code='CS101',
                subject_name='Programming',
                semester=1,
                date=date.today() - timedelta(days=i),
                is_present=i < 3,  # 3 present, 2 absent
                recorded_by=self.user
            )
        
        url = reverse('attendancerecord-student-summary')
        response = self.client.get(url, {'student': str(self.student.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('summary', response.data)
        summary = response.data['summary'][0]
        self.assertEqual(summary['total'], 5)
        self.assertEqual(summary['present'], 3)
        self.assertEqual(summary['percentage'], 60.0)
    
    def test_student_summary_without_student_id(self):
        url = reverse('attendancerecord-student-summary')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
