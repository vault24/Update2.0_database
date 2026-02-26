"""
Tests for Activity Logs app
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.response import Response
from django.test import RequestFactory
import uuid
from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from .models import ActivityLog
from .middleware import ActivityLogMiddleware


class ActivityLogModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin'
        )
    
    def test_create_activity_log(self):
        log = ActivityLog.objects.create(
            user=self.user,
            action_type='create',
            entity_type='Student',
            entity_id='123',
            description='Created student record'
        )
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.action_type, 'create')
        self.assertIn('testuser', str(log))


class ActivityLogSignalTest(TestCase):
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
    
    def test_create_signal_logs_activity(self):
        initial_count = ActivityLog.objects.count()
        
        Student.objects.create(
            rollNumber='CS001',
            fullNameEnglish='Test Student',
            fullNameBangla='টেস্ট স্টুডেন্ট',
            department=self.department,
            semester=1,
            shift='day',
            status='active'
        )
        
        # Check that a log was created
        self.assertGreater(ActivityLog.objects.count(), initial_count)
        
        # Verify log details
        log = ActivityLog.objects.filter(entity_type='Student').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.action_type, 'create')
    
    def test_delete_signal_logs_activity(self):
        student = Student.objects.create(
            rollNumber='CS001',
            fullNameEnglish='Test Student',
            fullNameBangla='টেস্ট স্টুডেন্ট',
            department=self.department,
            semester=1,
            shift='day',
            status='active'
        )
        
        initial_count = ActivityLog.objects.count()
        student_id = student.id
        student.delete()
        
        # Check that a delete log was created
        self.assertGreater(ActivityLog.objects.count(), initial_count)
        
        # Verify log details
        log = ActivityLog.objects.filter(
            entity_type='Student',
            action_type='delete',
            entity_id=str(student_id)
        ).first()
        self.assertIsNotNone(log)


class ActivityLogViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create some activity logs
        ActivityLog.objects.create(
            user=self.user,
            action_type='create',
            entity_type='Student',
            entity_id='123',
            description='Created student record'
        )
        ActivityLog.objects.create(
            user=self.user,
            action_type='update',
            entity_type='Student',
            entity_id='123',
            description='Updated student record'
        )
    
    def test_list_activity_logs(self):
        url = reverse('activitylog-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 2)
    
    def test_filter_by_action_type(self):
        url = reverse('activitylog-list')
        response = self.client.get(url, {'action_type': 'create'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for log in response.data['results']:
            self.assertEqual(log['action_type'], 'create')
    
    def test_filter_by_entity_type(self):
        url = reverse('activitylog-list')
        response = self.client.get(url, {'entity_type': 'Student'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for log in response.data['results']:
            self.assertEqual(log['entity_type'], 'Student')
    
    def test_export_logs(self):
        url = reverse('activitylog-export')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])


class ActivityLogMiddlewareTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='middleware_user',
            email='middleware@example.com',
            password='testpass123',
            role='registrar'
        )
        self.factory = RequestFactory()

    def test_logs_create_action_for_successful_post(self):
        def get_response(_request):
            return Response({'id': 'dep-123'}, status=status.HTTP_201_CREATED)

        middleware = ActivityLogMiddleware(get_response)
        request = self.factory.post('/api/departments/', data={'name': 'CSE', 'code': 'CSE'})
        request.user = self.user
        request.data = {'name': 'CSE', 'code': 'CSE'}

        middleware(request)

        log = ActivityLog.objects.latest('timestamp')
        self.assertEqual(log.action_type, 'create')
        self.assertEqual(log.entity_type, 'Department')
        self.assertEqual(log.entity_id, 'dep-123')
        self.assertEqual(log.user, self.user)

    def test_logs_approve_action_for_admission_approve_endpoint(self):
        admission_id = str(uuid.uuid4())

        def get_response(_request):
            return Response({'message': 'ok'}, status=status.HTTP_200_OK)

        middleware = ActivityLogMiddleware(get_response)
        request = self.factory.post(f'/api/admissions/{admission_id}/approve/', data={})
        request.user = self.user
        request.data = {}

        middleware(request)

        log = ActivityLog.objects.latest('timestamp')
        self.assertEqual(log.action_type, 'approve')
        self.assertEqual(log.entity_type, 'Admission')
        self.assertEqual(log.entity_id, admission_id)
        self.assertEqual(log.user, self.user)
