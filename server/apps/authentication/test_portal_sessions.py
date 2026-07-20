"""
Per-portal session isolation tests (apps.authentication.portal_sessions).

The admin SPA sends `X-Portal: admin` with every request, which keeps its
session in a separate cookie — so a student login and an admin login coexist
in the same browser instead of logging each other out.
"""
from django.conf import settings
from django.test import TestCase

from apps.authentication.models import User
from apps.authentication.portal_sessions import PortalWebsocketCookieMiddleware

ADMIN_HEADER = {'HTTP_X_PORTAL': 'admin'}


class PortalSessionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.student = User.objects.create_user(
            username='portalstudent', email='ps@x.com', password='pw',
            role='student', account_status='active',
        )
        cls.admin = User.objects.create_user(
            username='portaladmin', email='pa@x.com', password='pw',
            role='registrar', account_status='active',
        )

    def _login(self, username, portal=None):
        payload = {'username': username, 'password': 'pw'}
        extra = {}
        if portal == 'admin':
            payload['portal'] = 'admin'
            extra = ADMIN_HEADER
        response = self.client.post(
            '/api/auth/login/', payload, content_type='application/json', **extra,
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_both_portals_stay_logged_in(self):
        """Admin login must not replace the student session (and vice versa)."""
        self._login('portalstudent')
        self._login('portaladmin', portal='admin')

        # Two distinct cookies now exist in the same "browser".
        self.assertIn(settings.SESSION_COOKIE_NAME, self.client.cookies)
        self.assertIn(settings.ADMIN_SESSION_COOKIE_NAME, self.client.cookies)

        # Each portal sees its own user.
        student_me = self.client.get('/api/auth/me/').json()
        admin_me = self.client.get('/api/auth/me/', **ADMIN_HEADER).json()
        self.assertEqual(
            (student_me.get('user') or student_me)['username'], 'portalstudent',
        )
        self.assertEqual(
            (admin_me.get('user') or admin_me)['username'], 'portaladmin',
        )

    def test_admin_logout_keeps_student_session(self):
        self._login('portalstudent')
        self._login('portaladmin', portal='admin')

        response = self.client.post('/api/auth/logout/', **ADMIN_HEADER)
        self.assertIn(response.status_code, (200, 204))

        # Admin side is out; student side is untouched.
        admin_me = self.client.get('/api/auth/me/', **ADMIN_HEADER)
        self.assertIn(admin_me.status_code, (401, 403))
        student_me = self.client.get('/api/auth/me/')
        self.assertEqual(student_me.status_code, 200)

    def test_headerless_request_falls_back_to_admin_session(self):
        """Direct links (file downloads) from the admin panel authenticate via
        the admin cookie when no student session exists."""
        self._login('portaladmin', portal='admin')
        response = self.client.get('/api/auth/me/')  # no X-Portal header
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual((data.get('user') or data)['username'], 'portaladmin')


class WebsocketCookieRewriteTests(TestCase):
    def test_admin_ws_scope_uses_admin_cookie(self):
        middleware = PortalWebsocketCookieMiddleware(inner=None)
        headers = [
            (b'host', b'localhost'),
            (b'cookie', b'sessionid=studentkey; admin_sessionid=adminkey'),
        ]
        rewritten = middleware._rewrite_cookie_header(headers)
        cookie = dict(rewritten)[b'cookie'].decode()
        self.assertIn('sessionid=adminkey', cookie)

    def test_portal_detection(self):
        is_admin = PortalWebsocketCookieMiddleware._is_admin_portal
        self.assertTrue(is_admin({'query_string': b'portal=admin'}))
        self.assertTrue(is_admin({'query_string': b'foo=1&portal=admin'}))
        self.assertFalse(is_admin({'query_string': b''}))
        self.assertFalse(is_admin({'query_string': b'portal=student'}))
