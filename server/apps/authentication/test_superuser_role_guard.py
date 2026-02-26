from django.contrib.auth import get_user_model
from django.test import TestCase


class SuperuserRoleGuardTests(TestCase):
    def setUp(self):
        self.User = get_user_model()

    def test_create_superuser_defaults_to_admin_role(self):
        user = self.User.objects.create_superuser(
            username='admin_default_role',
            email='admin-default@example.com',
            password='AdminPass123!'
        )
        self.assertEqual(user.role, 'institute_head')
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertEqual(user.account_status, 'active')

    def test_create_superuser_rejects_student_role(self):
        with self.assertRaises(ValueError):
            self.User.objects.create_superuser(
                username='bad_superuser_role',
                email='bad-role@example.com',
                password='AdminPass123!',
                role='student'
            )

    def test_save_auto_corrects_superuser_to_admin_role(self):
        user = self.User.objects.create_user(
            username='existing_wrong_superuser',
            email='existing-wrong@example.com',
            password='AdminPass123!',
            role='student',
            account_status='suspended',
            is_superuser=True,
            is_staff=False,
        )
        user.refresh_from_db()
        self.assertEqual(user.role, 'institute_head')
        self.assertTrue(user.is_staff)
        self.assertEqual(user.account_status, 'active')

