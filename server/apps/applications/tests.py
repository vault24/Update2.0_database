"""
Application Tests
"""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from hypothesis import given, strategies as st, settings
from hypothesis.extra.django import TestCase as HypothesisTestCase
from .models import Application


class ApplicationPropertyTests(HypothesisTestCase):
    """
    Property-based tests for Application model and API
    """
    
    @settings(max_examples=100, deadline=None)
    @given(
        fullNameBangla=st.text(min_size=1, max_size=255, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
        fullNameEnglish=st.text(min_size=1, max_size=255, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
        fatherName=st.text(min_size=1, max_size=255, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
        motherName=st.text(min_size=1, max_size=255, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
        department=st.text(min_size=1, max_size=255, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
        session=st.text(min_size=1, max_size=20, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
        shift=st.text(min_size=1, max_size=20, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
        rollNumber=st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
        registrationNumber=st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
        applicationType=st.sampled_from(['Testimonial', 'Certificate', 'Transcript', 'Stipend', 'Transfer', 'Other']),
        subject=st.text(min_size=1, max_size=255, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
        message=st.text(min_size=1, max_size=1000, alphabet=st.characters(blacklist_categories=('Cs', 'Cc', 'Zs', 'Zl', 'Zp'))).filter(lambda _v: _v.strip() == _v and _v.strip() != ''),
    )
    def test_property_10_application_submission_idempotency(
        self,
        fullNameBangla,
        fullNameEnglish,
        fatherName,
        motherName,
        department,
        session,
        shift,
        rollNumber,
        registrationNumber,
        applicationType,
        subject,
        message
    ):
        """
        **Feature: django-backend, Property 10: Application submission idempotency**
        
        For any valid application data, submitting via POST /api/applications/submit/
        should create exactly one application record and return a unique application ID
        
        **Validates: Requirements 7.1, 7.2**
        """
        from rest_framework.test import APIClient
        from django.contrib.auth import get_user_model
        import uuid as _uuid

        # Application submission is deny-by-default: authenticate the client
        # (any authenticated user may submit). Reflects the current security model.
        User = get_user_model()
        _s = _uuid.uuid4().hex[:8]
        submitter = User.objects.create_user(
            username=f'submit_{_s}', email=f'submit_{_s}@example.com',
            password='x', role='student', account_status='active',
        )
        client = APIClient()
        client.force_authenticate(user=submitter)

        # Prepare application data
        application_data = {
            'fullNameBangla': fullNameBangla,
            'fullNameEnglish': fullNameEnglish,
            'fatherName': fatherName,
            'motherName': motherName,
            'department': department,
            'session': session,
            'shift': shift,
            'rollNumber': rollNumber,
            'registrationNumber': registrationNumber,
            'applicationType': applicationType,
            'subject': subject,
            'message': message,
        }
        
        # Count applications before submission
        initial_count = Application.objects.count()
        
        # Submit application
        response = client.post('/api/applications/submit/', application_data, format='json')
        
        # Verify response status
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify exactly one application was created
        final_count = Application.objects.count()
        self.assertEqual(final_count, initial_count + 1)
        
        # Verify unique ID is returned
        self.assertIn('id', response.data)
        self.assertIsNotNone(response.data['id'])
        
        # Verify the application exists in database
        application = Application.objects.get(id=response.data['id'])
        self.assertEqual(application.fullNameEnglish, fullNameEnglish)
        self.assertEqual(application.applicationType, applicationType)
        self.assertEqual(application.status, 'pending')


class ApplicationAPITests(APITestCase):
    """
    Unit tests for Application API endpoints
    """

    def setUp(self):
        # The applications API is deny-by-default; submit needs any authenticated
        # user and review/approve/reject need an admin role, so authenticate as a
        # Registrar (satisfies both) — this reflects the intended security model.
        import uuid as _uuid
        from django.contrib.auth import get_user_model
        User = get_user_model()
        _s = _uuid.uuid4().hex[:8]
        self.admin_user = User.objects.create_user(
            username=f'apptest_admin_{_s}',
            email=f'apptest_admin_{_s}@example.com',
            password='testpass123',
            role='registrar',
            account_status='active',
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_submit_application_success(self):
        """Test successful application submission"""
        data = {
            'fullNameBangla': 'জন ডো',
            'fullNameEnglish': 'John Doe',
            'fatherName': 'Father Name',
            'motherName': 'Mother Name',
            'department': 'Computer Science',
            'session': '2023-24',
            'shift': 'Day',
            'rollNumber': '12345',
            'registrationNumber': '67890',
            'applicationType': 'Testimonial',
            'subject': 'Request for Testimonial',
            'message': 'I need a testimonial for job application.',
        }
        
        response = self.client.post('/api/applications/submit/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['status'], 'pending')
    
    def test_submit_application_missing_fields(self):
        """Test application submission with missing required fields"""
        data = {
            'fullNameEnglish': 'John Doe',
            # Missing other required fields
        }
        
        response = self.client.post('/api/applications/submit/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_list_applications(self):
        """Test listing applications"""
        # Create test applications
        Application.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father',
            motherName='Mother',
            department='CS',
            session='2023',
            shift='Day',
            rollNumber='123',
            registrationNumber='456',
            applicationType='Testimonial',
            subject='Test',
            message='Test message'
        )
        
        response = self.client.get('/api/applications/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_applications_by_status(self):
        """Test filtering applications by status"""
        # Create applications with different statuses
        Application.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father',
            motherName='Mother',
            department='CS',
            session='2023',
            shift='Day',
            rollNumber='123',
            registrationNumber='456',
            applicationType='Testimonial',
            subject='Test',
            message='Test message',
            status='pending'
        )
        
        Application.objects.create(
            fullNameBangla='জেন ডো',
            fullNameEnglish='Jane Doe',
            fatherName='Father',
            motherName='Mother',
            department='CS',
            session='2023',
            shift='Day',
            rollNumber='789',
            registrationNumber='012',
            applicationType='Certificate',
            subject='Test',
            message='Test message',
            status='approved'
        )
        
        response = self.client.get('/api/applications/?status=pending')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['status'], 'pending')
    
    def test_review_application(self):
        """Test reviewing an application"""
        # Create an application
        application = Application.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father',
            motherName='Mother',
            department='CS',
            session='2023',
            shift='Day',
            rollNumber='123',
            registrationNumber='456',
            applicationType='Testimonial',
            subject='Test',
            message='Test message'
        )
        
        review_data = {
            'status': 'approved',
            'reviewedBy': 'Admin User',
            'reviewNotes': 'Application approved'
        }
        
        response = self.client.put(
            f'/api/applications/{application.id}/review/',
            review_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'approved')
        self.assertEqual(response.data['reviewedBy'], 'Admin User')
        self.assertIsNotNone(response.data['reviewedAt'])
    
    def test_approve_application(self):
        """Test approving an application"""
        application = Application.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father',
            motherName='Mother',
            department='CS',
            session='2023',
            shift='Day',
            rollNumber='123',
            registrationNumber='456',
            applicationType='Testimonial',
            subject='Test',
            message='Test message'
        )
        
        response = self.client.post(
            f'/api/applications/{application.id}/approve/',
            {'reviewedBy': 'Admin', 'reviewNotes': 'Approved'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'approved')
        self.assertIsNotNone(response.data['reviewedAt'])
    
    def test_reject_application(self):
        """Test rejecting an application"""
        application = Application.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father',
            motherName='Mother',
            department='CS',
            session='2023',
            shift='Day',
            rollNumber='123',
            registrationNumber='456',
            applicationType='Testimonial',
            subject='Test',
            message='Test message'
        )
        
        response = self.client.post(
            f'/api/applications/{application.id}/reject/',
            {'reviewedBy': 'Admin', 'reviewNotes': 'Incomplete information'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'rejected')
        self.assertEqual(response.data['reviewNotes'], 'Incomplete information')
    
    def test_reject_application_without_notes(self):
        """Test rejecting application without review notes fails"""
        application = Application.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father',
            motherName='Mother',
            department='CS',
            session='2023',
            shift='Day',
            rollNumber='123',
            registrationNumber='456',
            applicationType='Testimonial',
            subject='Test',
            message='Test message'
        )
        
        response = self.client.post(
            f'/api/applications/{application.id}/reject/',
            {'reviewedBy': 'Admin'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_my_applications(self):
        """my-applications returns ONLY the logged-in student's own applications.

        The roll-number query param was intentionally removed (you can no longer
        view others' applications by guessing a roll number); scope is derived
        from the caller's linked Student account.
        """
        import uuid as _uuid
        from django.contrib.auth import get_user_model
        from apps.students.models import Student
        from apps.departments.models import Department

        User = get_user_model()
        _s = _uuid.uuid4().hex[:8]
        dept = Department.objects.create(name=f'CS {_s}', code=f'CS{_s[:5]}')
        student = Student.objects.create(
            fullNameEnglish='John Doe', fullNameBangla='জন ডো',
            currentRollNumber=f'R-{_s}', currentRegistrationNumber=f'REG-{_s}',
            department=dept, semester=1, shift='Day', status='active',
        )
        student_user = User.objects.create_user(
            username=f'stu_{_s}', email=f'stu_{_s}@example.com', password='x',
            role='student', account_status='active',
        )
        student_user.related_profile_id = student.id
        student_user.save(update_fields=['related_profile_id'])

        # Their own application (matched by roll number / FK)…
        Application.objects.create(
            fullNameBangla='জন ডো', fullNameEnglish='John Doe',
            fatherName='Father', motherName='Mother', department='CS',
            session='2023', shift='Day', rollNumber=student.currentRollNumber,
            registrationNumber='456', applicationType='Testimonial',
            subject='Test', message='Test message', student=student,
        )
        # …and someone else's, which must NOT be returned.
        Application.objects.create(
            fullNameBangla='জেন ডো', fullNameEnglish='Jane Doe',
            fatherName='Father', motherName='Mother', department='CS',
            session='2023', shift='Day', rollNumber='OTHER-999',
            registrationNumber='012', applicationType='Certificate',
            subject='Test', message='Test message',
        )

        self.client.force_authenticate(user=student_user)
        response = self.client.get('/api/applications/my-applications/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['applications'][0]['rollNumber'], student.currentRollNumber)

    def test_my_applications_without_roll_number(self):
        """my-applications no longer requires a roll-number param: it derives the
        caller's own scope and returns 200 (an admin, with no student profile,
        gets an empty list)."""
        response = self.client.get('/api/applications/my-applications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('applications', response.data)
    
    def test_filter_applications_by_type(self):
        """Test filtering applications by type"""
        Application.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father',
            motherName='Mother',
            department='CS',
            session='2023',
            shift='Day',
            rollNumber='123',
            registrationNumber='456',
            applicationType='Testimonial',
            subject='Test',
            message='Test message'
        )
        
        Application.objects.create(
            fullNameBangla='জেন ডো',
            fullNameEnglish='Jane Doe',
            fatherName='Father',
            motherName='Mother',
            department='CS',
            session='2023',
            shift='Day',
            rollNumber='789',
            registrationNumber='012',
            applicationType='Certificate',
            subject='Test',
            message='Test message'
        )
        
        response = self.client.get('/api/applications/?applicationType=Testimonial')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['applicationType'], 'Testimonial')
