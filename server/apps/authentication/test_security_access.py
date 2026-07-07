"""
Regression tests for the API-wide "deny by default" access policy.

Historically several viewsets shipped with DRF's implicit AllowAny default (or
an explicit `permission_classes = [AllowAny]`), and the RBAC middleware passed
unauthenticated requests straight through -- exposing student PII, grades,
attendance and documents to anonymous callers. These tests lock in the fix:
sensitive endpoints must reject anonymous access, while the intentionally
public endpoints stay reachable.
"""
from rest_framework.test import APITestCase
from rest_framework import status


class AnonymousAccessDeniedTests(APITestCase):
    """Anonymous callers must be rejected on sensitive collection endpoints."""

    SENSITIVE_ENDPOINTS = [
        '/api/students/',
        '/api/marks/',
        '/api/attendance/',
        '/api/documents/',
        '/api/class-routines/',
        '/api/teachers/',
        '/api/admissions/',
    ]

    def test_sensitive_endpoints_reject_anonymous(self):
        for url in self.SENSITIVE_ENDPOINTS:
            resp = self.client.get(url)
            self.assertIn(
                resp.status_code,
                (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
                msg=f'{url} returned {resp.status_code}; expected 401/403 for anonymous',
            )

    def test_public_endpoints_allow_anonymous(self):
        # Institute settings and the department list back the pre-login pages.
        for url in ('/api/settings/', '/api/departments/'):
            resp = self.client.get(url)
            self.assertEqual(
                resp.status_code, status.HTTP_200_OK,
                msg=f'{url} returned {resp.status_code}; expected 200 for anonymous',
            )
