"""
Tests for portal access enforcement: student-side accounts may only use the
student portal, admin/superuser accounts may only use the admin portal.
"""
from django.test import TestCase, Client
from .models import User
from .serializers import LoginSerializer, user_allowed_for_portal


class PortalHelperTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stud@example.com', email='stud@example.com',
            password='pass12345', role='student', account_status='active',
        )
        self.captain = User.objects.create_user(
            username='cap@example.com', email='cap@example.com',
            password='pass12345', role='captain', account_status='active',
        )
        self.registrar = User.objects.create_user(
            username='reg@example.com', email='reg@example.com',
            password='pass12345', role='registrar', account_status='active',
        )
        self.principal = User.objects.create_superuser(
            username='boss@example.com', email='boss@example.com', password='pass12345',
        )

    def test_student_roles_allowed_on_student_portal(self):
        self.assertTrue(user_allowed_for_portal(self.student, 'student'))
        self.assertTrue(user_allowed_for_portal(self.captain, 'student'))

    def test_admin_and_superuser_blocked_on_student_portal(self):
        self.assertFalse(user_allowed_for_portal(self.registrar, 'student'))
        self.assertFalse(user_allowed_for_portal(self.principal, 'student'))

    def test_admin_and_superuser_allowed_on_admin_portal(self):
        self.assertTrue(user_allowed_for_portal(self.registrar, 'admin'))
        self.assertTrue(user_allowed_for_portal(self.principal, 'admin'))

    def test_student_blocked_on_admin_portal(self):
        self.assertFalse(user_allowed_for_portal(self.student, 'admin'))


class LoginSerializerPortalTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='s@example.com', email='s@example.com',
            password='pass12345', role='student', account_status='active',
        )
        self.registrar = User.objects.create_user(
            username='r@example.com', email='r@example.com',
            password='pass12345', role='registrar', account_status='active',
        )

    def _validate(self, username, portal):
        s = LoginSerializer(
            data={'username': username, 'password': 'pass12345'},
            context={'portal': portal},
        )
        return s

    def test_admin_cannot_login_on_student_portal(self):
        s = self._validate('r@example.com', 'student')
        self.assertFalse(s.is_valid())

    def test_student_can_login_on_student_portal(self):
        s = self._validate('s@example.com', 'student')
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data['user'], self.student)

    def test_student_cannot_login_on_admin_portal(self):
        s = self._validate('s@example.com', 'admin')
        self.assertFalse(s.is_valid())


class LoginEndpointPortalTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.registrar = User.objects.create_user(
            username='admin@example.com', email='admin@example.com',
            password='pass12345', role='registrar', account_status='active',
        )
        self.student = User.objects.create_user(
            username='kid@example.com', email='kid@example.com',
            password='pass12345', role='student', account_status='active',
        )

    def test_admin_login_rejected_on_student_portal(self):
        resp = self.client.post(
            '/api/auth/login/',
            {'username': 'admin@example.com', 'password': 'pass12345', 'portal': 'student'},
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 400)
        # No session should have been established.
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_student_login_ok_on_student_portal(self):
        resp = self.client.post(
            '/api/auth/login/',
            {'username': 'kid@example.com', 'password': 'pass12345', 'portal': 'student'},
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(str(self.client.session.get('_auth_user_id')), str(self.student.pk))
