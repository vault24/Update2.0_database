import uuid
"""
Tests for Correction Requests app
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from .models import CorrectionRequest


class CorrectionRequestModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='registrar', account_status='active'
        )
        self.department = Department.objects.create(name=f'Computer Science {uuid.uuid4().hex[:6]}', code=f'CS{uuid.uuid4().hex[:5]}'
        )
        _sr = uuid.uuid4().hex[:8]
        self.student = Student.objects.create(
            rollNumber='CS001',
            currentRollNumber=f'CS-{_sr}',
            currentRegistrationNumber=f'REG-{_sr}',
            fullNameEnglish='Test Student',
            fullNameBangla='টেস্ট স্টুডেন্ট',
            department=self.department,
            semester=1,
            shift='day',
            status='active'
        )
    
    def test_create_correction_request(self):
        request = CorrectionRequest.objects.create(
            student=self.student,
            field_name='mobileStudent',
            current_value='01712345678',
            requested_value='01812345678',
            reason='Changed mobile number'
        )
        self.assertEqual(request.student, self.student)
        self.assertEqual(request.status, 'pending')
        self.assertEqual(str(request), "Test Student - mobileStudent (pending)")


class CorrectionRequestViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='registrar', account_status='active'
        )
        self.client.force_authenticate(user=self.user)
        
        self.department = Department.objects.create(name=f'Computer Science {uuid.uuid4().hex[:6]}', code=f'CS{uuid.uuid4().hex[:5]}'
        )
        _sr = uuid.uuid4().hex[:8]
        self.student = Student.objects.create(
            rollNumber='CS001',
            currentRollNumber=f'CS-{_sr}',
            currentRegistrationNumber=f'REG-{_sr}',
            fullNameEnglish='Test Student',
            fullNameBangla='টেস্ট স্টুডেন্ট',
            department=self.department,
            semester=1,
            shift='day',
            status='active',
            mobileStudent='01712345678'
        )
    
    def test_create_correction_request(self):
        url = reverse('correction-request-list')
        data = {
            'student': str(self.student.id),
            'field_name': 'mobileStudent',
            'current_value': '01712345678',
            'requested_value': '01812345678',
            'reason': 'Changed mobile number'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CorrectionRequest.objects.count(), 1)
    
    def test_list_correction_requests(self):
        CorrectionRequest.objects.create(
            student=self.student,
            field_name='mobileStudent',
            current_value='01712345678',
            requested_value='01812345678',
            reason='Changed mobile number'
        )
        url = reverse('correction-request-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_by_status(self):
        CorrectionRequest.objects.create(
            student=self.student,
            field_name='mobileStudent',
            current_value='01712345678',
            requested_value='01812345678',
            reason='Changed mobile number',
            status='pending'
        )
        CorrectionRequest.objects.create(
            student=self.student,
            field_name='email',
            current_value='old@example.com',
            requested_value='new@example.com',
            reason='Changed email',
            status='approved'
        )
        url = reverse('correction-request-list')
        response = self.client.get(url, {'status': 'pending'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_approve_correction_request(self):
        request = CorrectionRequest.objects.create(
            student=self.student,
            field_name='mobileStudent',
            current_value='01712345678',
            requested_value='01812345678',
            reason='Changed mobile number'
        )
        url = reverse('correction-request-approve', kwargs={'pk': str(request.id)})
        data = {'review_notes': 'Approved after verification'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        request.refresh_from_db()
        self.assertEqual(request.status, 'approved')
        self.assertEqual(request.reviewed_by, self.user)
        
        # Verify student field was updated
        self.student.refresh_from_db()
        self.assertEqual(self.student.mobileStudent, '01812345678')
    
    def test_reject_correction_request(self):
        request = CorrectionRequest.objects.create(
            student=self.student,
            field_name='mobileStudent',
            current_value='01712345678',
            requested_value='01812345678',
            reason='Changed mobile number'
        )
        url = reverse('correction-request-reject', kwargs={'pk': str(request.id)})
        data = {'review_notes': 'Insufficient documentation'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        request.refresh_from_db()
        self.assertEqual(request.status, 'rejected')
        self.assertEqual(request.reviewed_by, self.user)
    
    def test_cannot_approve_non_pending_request(self):
        request = CorrectionRequest.objects.create(
            student=self.student,
            field_name='mobileStudent',
            current_value='01712345678',
            requested_value='01812345678',
            reason='Changed mobile number',
            status='approved'
        )
        url = reverse('correction-request-approve', kwargs={'pk': str(request.id)})
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_my_requests(self):
        CorrectionRequest.objects.create(
            student=self.student,
            field_name='mobileStudent',
            current_value='01712345678',
            requested_value='01812345678',
            reason='Changed mobile number'
        )
        url = reverse('correction-request-my-requests')
        response = self.client.get(url, {'student': str(self.student.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('requests', response.data)
        self.assertEqual(len(response.data['requests']), 1)
    
    def test_my_requests_without_student_id(self):
        # my_requests derives the caller's own scope: an admin with no `student`
        # filter gets all requests (200), not a 400 — there is no "must pass a
        # student id" contract. (Non-admins get only their own.)
        url = reverse('correction-request-my-requests')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('requests', response.data)
