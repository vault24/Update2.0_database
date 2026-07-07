"""
Regression tests for assorted security hardening:

* registration cannot self-assign an admin role (privilege escalation)
* stored XSS in the server-rendered approval document is escaped
* login / OTP-send endpoints are rate limited
* the file-storage path guard rejects traversal and sibling-prefix escapes
"""
from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status

from apps.authentication.serializers import RegisterSerializer


class RegistrationRoleEscalationTests(TestCase):
    BASE = {
        'username': 'eviladmin', 'email': 'evil@x.com',
        'password': 'S3curePass!23', 'confirm_password': 'S3curePass!23',
        'first_name': 'E', 'last_name': 'V',
    }

    def test_cannot_register_as_admin_role(self):
        for role in ('institute_head', 'registrar', 'department_head', 'superuser'):
            s = RegisterSerializer(data={**self.BASE, 'role': role})
            self.assertFalse(s.is_valid(), f'role={role} should be rejected')
            self.assertIn('role', s.errors)

    def test_teacher_role_still_allowed(self):
        s = RegisterSerializer(data={
            **self.BASE, 'role': 'teacher',
            'full_name_english': 'T', 'full_name_bangla': 'T', 'designation': 'Lecturer'})
        self.assertTrue(s.is_valid(), s.errors)


class DocumentXSSTests(TestCase):
    def test_user_supplied_fields_are_escaped(self):
        from apps.applications.models import Application
        from apps.applications.views import _render_document_html
        from apps.documents.models import DocumentTemplate

        tmpl = DocumentTemplate.objects.create(
            name='Testimonial', slug='testimonial',
            html_content='<p>Name: {{name}} Father: [Father Name]</p>')
        payload = '<script>alert(1)</script>'
        app = Application.objects.create(
            fullNameBangla='x', fullNameEnglish=payload, fatherName=payload,
            motherName='m', department='CS', session='2023', shift='Day',
            rollNumber='1', registrationNumber='1', subject='s', message='m',
            applicationType='testimonial', status='approved', template=tmpl)

        html = _render_document_html(app, request=None)
        self.assertNotIn('<script>alert(1)</script>', html)
        self.assertIn('&lt;script&gt;', html)


class AuthThrottleTests(APITestCase):
    """
    Throttling is disabled by default under the test runner, so we enable a low
    rate directly on the throttle classes (DRF binds THROTTLE_RATES at import,
    which override_settings cannot reach).
    """

    def setUp(self):
        from apps.authentication.throttles import LoginRateThrottle, OTPSendRateThrottle
        cache.clear()
        self._rates = {'login': '3/min', 'otp': '3/min'}
        LoginRateThrottle.THROTTLE_RATES = self._rates
        OTPSendRateThrottle.THROTTLE_RATES = self._rates

    def tearDown(self):
        from apps.authentication.throttles import LoginRateThrottle, OTPSendRateThrottle
        LoginRateThrottle.THROTTLE_RATES = {'login': None, 'otp': None}
        OTPSendRateThrottle.THROTTLE_RATES = {'login': None, 'otp': None}
        cache.clear()

    def test_login_is_rate_limited(self):
        codes = []
        for _ in range(6):
            r = self.client.post('/api/auth/login/',
                                 {'username': 'nobody', 'password': 'wrong'}, format='json')
            codes.append(r.status_code)
        self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, codes,
                      msg=f'expected a 429 after repeated logins, got {codes}')

    def test_otp_send_is_rate_limited(self):
        codes = []
        for i in range(6):
            r = self.client.post('/api/auth/register/send-otp/',
                                 {'email': f'a{i}@x.com', 'username': f'u{i}',
                                  'password': 'S3curePass!23', 'confirm_password': 'S3curePass!23',
                                  'role': 'student', 'ssc_board_roll': f'12345{i}'}, format='json')
            codes.append(r.status_code)
        self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, codes,
                      msg=f'expected a 429 after repeated OTP sends, got {codes}')


class PathTraversalGuardTests(TestCase):
    def test_secure_path_rejects_traversal_and_siblings(self):
        from utils.structured_file_storage import structured_storage as s
        # Normal relative path resolves inside the storage root.
        self.assertIsNotNone(s._get_secure_path('documents/2024/x.pdf'))
        # Traversal escaping the root is rejected.
        self.assertIsNone(s._get_secure_path('../../../etc/passwd'))
        self.assertIsNone(s._get_secure_path('..\\..\\secret.txt'))
        # A sibling dir sharing the root's name prefix must NOT be treated inside.
        sibling = f'..{chr(92)}{s.storage_root.name}_evil{chr(92)}x'
        self.assertIsNone(s._get_secure_path(sibling))
