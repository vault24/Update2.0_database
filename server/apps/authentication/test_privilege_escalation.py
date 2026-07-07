"""
Red-team regression tests for admin privilege escalation and IP spoofing.
"""
from django.test import TestCase, RequestFactory, override_settings
from django.contrib.auth.hashers import make_password
from rest_framework.test import APITestCase

from apps.authentication.models import User, SignupRequest
from apps.authentication.services import SecurityService


class SignupApprovalEscalationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.registrar = User.objects.create_user(
            username='reg', email='reg@x.com', password='pw',
            role='registrar', account_status='active')
        cls.dept_head = User.objects.create_user(
            username='dh', email='dh@x.com', password='pw',
            role='department_head', account_status='active')
        cls.principal = User.objects.create_superuser(
            username='principal', email='p@x.com', password='pw', role='institute_head')

    def _pending_principal_request(self):
        return SignupRequest.objects.create(
            username='newprincipal', email='np@x.com', first_name='N', last_name='P',
            requested_role='institute_head', password_hash=make_password('pw'),
            status='pending')

    def test_registrar_cannot_approve_admin_signup(self):
        req = self._pending_principal_request()
        self.client.force_authenticate(self.registrar)
        r = self.client.post(f'/api/auth/signup-requests/{req.id}/approve/')
        self.assertEqual(r.status_code, 403)
        self.assertFalse(User.objects.filter(username='newprincipal').exists())

    def test_department_head_cannot_approve_admin_signup(self):
        req = self._pending_principal_request()
        self.client.force_authenticate(self.dept_head)
        r = self.client.post(f'/api/auth/signup-requests/{req.id}/approve/')
        self.assertEqual(r.status_code, 403)
        self.assertFalse(User.objects.filter(username='newprincipal').exists())

    def test_registrar_cannot_reject_admin_signup(self):
        req = self._pending_principal_request()
        self.client.force_authenticate(self.registrar)
        r = self.client.post(f'/api/auth/signup-requests/{req.id}/reject/', {}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_principal_can_approve_admin_signup(self):
        req = self._pending_principal_request()
        self.client.force_authenticate(self.principal)
        r = self.client.post(f'/api/auth/signup-requests/{req.id}/approve/')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(User.objects.filter(username='newprincipal', role='institute_head').exists())


class ClientIpSpoofingTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()

    @override_settings(TRUST_PROXY_HEADERS=True)
    def test_uses_real_ip_not_spoofed_xff_behind_proxy(self):
        req = self.rf.post('/api/auth/login/',
                           HTTP_X_FORWARDED_FOR='1.2.3.4, 10.0.0.9',
                           HTTP_X_REAL_IP='10.0.0.9', REMOTE_ADDR='127.0.0.1')
        # Must NOT return the client-controlled left-most X-Forwarded-For value.
        self.assertEqual(SecurityService.get_client_ip(req), '10.0.0.9')

    @override_settings(TRUST_PROXY_HEADERS=False)
    def test_ignores_xff_when_not_behind_proxy(self):
        req = self.rf.post('/api/auth/login/',
                           HTTP_X_FORWARDED_FOR='1.2.3.4', REMOTE_ADDR='203.0.113.7')
        self.assertEqual(SecurityService.get_client_ip(req), '203.0.113.7')
