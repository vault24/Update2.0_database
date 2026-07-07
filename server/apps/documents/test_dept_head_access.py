"""
Regression test: a Department Head may reach the documents API.

The RBAC middleware previously omitted /api/documents/ from the
department_head policy, so a head got 403 when opening a student's documents in
their profile page. This uses a real session login (client.login) so the
middleware — which reads the session user — actually runs.
"""
from rest_framework.test import APITestCase

from apps.authentication.models import User


class DeptHeadDocumentAccessTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.head = User.objects.create_user(
            username='dh', email='dh@x.com', password='pw123456',
            role='department_head', account_status='active')

    def test_department_head_can_list_documents(self):
        self.assertTrue(self.client.login(username='dh', password='pw123456'))
        r = self.client.get('/api/documents/?page_size=100')
        self.assertNotEqual(r.status_code, 403)
        self.assertEqual(r.status_code, 200)
