"""
Tests for Dashboard app
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from apps.teachers.models import Teacher
from apps.admissions.models import Admission
from apps.applications.models import Application


class DashboardStatsViewTest(TestCase):
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
        Student.objects.create(
            rollNumber='CS001',
            fullNameEnglish='Test Student',
            fullNameBangla='টেস্ট স্টুডেন্ট',
            department=self.department,
            semester=1,
            shift='day',
            status='active'
        )
    
    def test_get_dashboard_stats(self):
        url = reverse('dashboard-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('students', response.data)
        self.assertIn('alumni', response.data)
        self.assertIn('applications', response.data)


class AdminDashboardViewTest(TestCase):
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
    
    def test_get_admin_dashboard(self):
        url = reverse('dashboard-admin')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('kpis', response.data)
        self.assertIn('departmentSummaries', response.data)


class StudentDashboardViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='student'
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
    
    def test_get_student_dashboard(self):
        url = reverse('dashboard-student')
        response = self.client.get(url, {'student': str(self.student.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('student', response.data)
        self.assertIn('attendance', response.data)
        self.assertIn('marks', response.data)
    
    def test_student_dashboard_without_id(self):
        url = reverse('dashboard-student')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TeacherDashboardViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='teacher'
        )
        self.client.force_authenticate(user=self.user)
        
        self.department = Department.objects.create(
            name='Computer Science',
            code='CS'
        )
        self.teacher = Teacher.objects.create(
            fullNameEnglish='Test Teacher',
            fullNameBangla='টেস্ট টিচার',
            designation='Lecturer',
            department=self.department
        )
    
    def test_get_teacher_dashboard(self):
        url = reverse('dashboard-teacher')
        response = self.client.get(url, {'teacher': str(self.teacher.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('teacher', response.data)
        self.assertIn('assignedClasses', response.data)
    
    def test_teacher_dashboard_without_id(self):
        url = reverse('dashboard-teacher')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AnalyticsViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_get_department_distribution(self):
        url = reverse('dashboard-analytics')
        response = self.client.get(url, {'type': 'department-distribution'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('data', response.data)
    
    def test_get_attendance_summary(self):
        url = reverse('dashboard-analytics')
        response = self.client.get(url, {'type': 'attendance-summary'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('data', response.data)
