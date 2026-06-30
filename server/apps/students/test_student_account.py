"""
Tests for admin-managed Student Portal accounts:
create / view / manage with mandatory admin-password confirmation.
"""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from apps.departments.models import Department
from apps.students.models import Student
from apps.students.serializers import StudentCreateSerializer
from apps.students.test_admin_add import base_payload

User = get_user_model()


class StudentAccountTests(APITestCase):
    def setUp(self):
        self.dept = Department.objects.create(name='Computer Technology', code='CST')
        serializer = StudentCreateSerializer(data=base_payload(self.dept))
        serializer.is_valid(raise_exception=True)
        self.student = serializer.save()

        self.admin = User.objects.create_user(
            username='reg@example.com', email='reg@example.com',
            password='adminpass123', role='registrar', account_status='active',
        )
        self.url = f'/api/students/{self.student.id}/account/'

    def auth_admin(self):
        self.client.force_authenticate(self.admin)

    # ── status ────────────────────────────────────────────────────────────
    def test_status_no_account(self):
        self.auth_admin()
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data['has_account'])

    # ── create ────────────────────────────────────────────────────────────
    def test_create_requires_admin_password(self):
        self.auth_admin()
        resp = self.client.post(self.url, {'email': 'stud@example.com', 'password': 'studpass123'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_create_rejects_wrong_admin_password(self):
        self.auth_admin()
        resp = self.client.post(self.url, {'email': 'stud@example.com', 'password': 'studpass123', 'admin_password': 'WRONG'}, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertFalse(User.objects.filter(email='stud@example.com').exists())

    def test_create_success_links_account(self):
        self.auth_admin()
        resp = self.client.post(self.url, {'email': 'stud@example.com', 'password': 'studpass123', 'admin_password': 'adminpass123'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(resp.data['has_account'])
        user = User.objects.get(email='stud@example.com')
        self.assertEqual(str(user.related_profile_id), str(self.student.id))
        self.assertEqual(user.role, 'student')
        self.assertEqual(user.student_id, self.student.currentRollNumber)
        self.assertTrue(user.check_password('studpass123'))

    def test_only_one_account_per_student(self):
        self.auth_admin()
        self.client.post(self.url, {'email': 'a@example.com', 'password': 'studpass123', 'admin_password': 'adminpass123'}, format='json')
        resp = self.client.post(self.url, {'email': 'b@example.com', 'password': 'studpass123', 'admin_password': 'adminpass123'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_create_rejects_duplicate_email(self):
        User.objects.create_user(username='taken@example.com', email='taken@example.com', password='x', role='teacher')
        self.auth_admin()
        resp = self.client.post(self.url, {'email': 'taken@example.com', 'password': 'studpass123', 'admin_password': 'adminpass123'}, format='json')
        self.assertEqual(resp.status_code, 400)

    # ── manage ────────────────────────────────────────────────────────────
    def test_change_email_and_status(self):
        self.auth_admin()
        self.client.post(self.url, {'email': 'old@example.com', 'password': 'studpass123', 'admin_password': 'adminpass123'}, format='json')

        resp = self.client.patch(self.url, {'email': 'new@example.com', 'admin_password': 'adminpass123'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        user = User.objects.get(related_profile_id=self.student.id)
        self.assertEqual(user.email, 'new@example.com')
        self.assertEqual(user.username, 'new@example.com')

        resp = self.client.patch(self.url, {'is_active': False, 'admin_password': 'adminpass123'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data['is_active'])

    def test_change_email_rejects_wrong_password(self):
        self.auth_admin()
        self.client.post(self.url, {'email': 'old2@example.com', 'password': 'studpass123', 'admin_password': 'adminpass123'}, format='json')
        resp = self.client.patch(self.url, {'email': 'x@example.com', 'admin_password': 'WRONG'}, format='json')
        self.assertEqual(resp.status_code, 403)

    # ── authorization ─────────────────────────────────────────────────────
    def test_non_admin_forbidden(self):
        student_user = User.objects.create_user(
            username='kid@example.com', email='kid@example.com', password='x',
            role='student', related_profile_id=self.student.id,
        )
        self.client.force_authenticate(student_user)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 403)
