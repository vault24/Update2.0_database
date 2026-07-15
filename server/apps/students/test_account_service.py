"""
The Student details page and the Alumni details page must create portal
accounts through ONE implementation.

They were previously two separate code paths that disagreed on the username
scheme, student_id derivation, duplicate checks and welcome email — so a fix
in one silently missed the other. These tests pin the shared behaviour and the
one legitimate difference (the alumni flow may auto-generate a password).
"""
from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.departments.models import Department
from apps.students.models import Student
from apps.students.account_service import (
    AccountError,
    create_student_portal_account,
    find_portal_account,
)
from apps.alumni.models import Alumni
from apps.alumni.services import create_portal_account_for_alumni

User = get_user_model()


def _make_student(dept, **overrides):
    data = dict(
        fullNameEnglish='Md Mahadi Hasan',
        currentRollNumber='CST-2019-001',
        currentRegistrationNumber='2019CST001',
        semester=8,
        department=dept,
        mobileStudent='01712345678',
    )
    data.update(overrides)
    return Student.objects.create(**data)


class SharedAccountServiceTests(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(name='Computer Science & Technology', code='CST')
        self.student = _make_student(self.dept)

    def test_creates_linked_account(self):
        result = create_student_portal_account(
            self.student, email='mahadi@example.com', password='secretpass1',
        )
        user = result['user']
        self.assertEqual(user.username, 'mahadi@example.com')
        self.assertEqual(user.email, 'mahadi@example.com')
        self.assertEqual(str(user.related_profile_id), str(self.student.id))
        self.assertEqual(user.role, 'student')
        self.assertEqual(user.first_name, 'Md')
        self.assertEqual(user.last_name, 'Mahadi Hasan')
        self.assertTrue(user.check_password('secretpass1'))
        self.assertIsNone(result['generated_password'])
        self.assertEqual(find_portal_account(self.student), user)

    def test_rejects_duplicate_account_for_same_student(self):
        create_student_portal_account(self.student, email='a@example.com', password='secretpass1')
        with self.assertRaises(AccountError) as ctx:
            create_student_portal_account(self.student, email='b@example.com', password='secretpass1')
        self.assertEqual(ctx.exception.message, 'Account already exists')

    def test_rejects_email_already_in_use(self):
        User.objects.create_user(username='taken@example.com', email='taken@example.com', password='x')
        with self.assertRaises(AccountError) as ctx:
            create_student_portal_account(self.student, email='taken@example.com', password='secretpass1')
        self.assertEqual(ctx.exception.message, 'Email already in use')

    def test_rejects_invalid_email_and_short_password(self):
        with self.assertRaises(AccountError):
            create_student_portal_account(self.student, email='not-an-email', password='secretpass1')
        with self.assertRaises(AccountError):
            create_student_portal_account(self.student, email='a@example.com', password='short')

    def test_password_required_unless_generation_allowed(self):
        with self.assertRaises(AccountError):
            create_student_portal_account(self.student, email='a@example.com', password='')

    def test_falls_back_to_student_email(self):
        student = _make_student(
            self.dept, currentRollNumber='CST-2019-002',
            currentRegistrationNumber='2019CST002', email='onfile@example.com',
        )
        result = create_student_portal_account(student, password='secretpass1')
        self.assertEqual(result['email'], 'onfile@example.com')

    def test_student_id_falls_back_when_roll_is_taken(self):
        """currentRollNumber is not unique on User.student_id — collisions must
        not raise IntegrityError (they used to)."""
        User.objects.create_user(
            username='other@example.com', email='other@example.com', password='x',
            student_id='CST-2019-001',
        )
        result = create_student_portal_account(
            self.student, email='mahadi@example.com', password='secretpass1',
        )
        self.assertNotEqual(result['user'].student_id, 'CST-2019-001')
        self.assertTrue(result['user'].student_id.startswith('SIPI-'))

    def test_blank_student_email_is_synced(self):
        create_student_portal_account(self.student, email='new@example.com', password='secretpass1')
        self.student.refresh_from_db()
        self.assertEqual(self.student.email, 'new@example.com')


class AlumniUsesTheSameImplementationTests(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(name='Computer Science & Technology', code='CST')
        self.student = _make_student(self.dept, email='alum@example.com')
        self.alumni = Alumni.objects.create(student=self.student, graduationYear=2023)

    def test_alumni_flow_delegates_to_the_shared_service(self):
        with patch(
            'apps.students.account_service.create_student_portal_account',
            wraps=create_student_portal_account,
        ) as shared:
            create_portal_account_for_alumni(self.alumni)
        shared.assert_called_once()
        # …and the alumni-specific policy is a parameter, not a fork.
        self.assertTrue(shared.call_args.kwargs['generate_password'])

    def test_alumni_flow_autogenerates_a_password_to_hand_over(self):
        result = create_portal_account_for_alumni(self.alumni)
        self.assertTrue(result['password'])
        self.assertEqual(result['email'], 'alum@example.com')
        self.assertTrue(result['user'].check_password(result['password']))

    def test_alumni_flow_honours_an_explicit_password(self):
        result = create_portal_account_for_alumni(self.alumni, password='chosenpass1')
        self.assertIsNone(result['password'])  # nothing was generated
        self.assertTrue(result['user'].check_password('chosenpass1'))

    def test_both_flows_produce_the_same_account_shape(self):
        alumni_result = create_portal_account_for_alumni(self.alumni)
        alumni_user = alumni_result['user']

        other_student = _make_student(
            self.dept, currentRollNumber='CST-2019-009',
            currentRegistrationNumber='2019CST009', fullNameEnglish='Md Mahadi Hasan',
        )
        student_user = create_student_portal_account(
            other_student, email='student@example.com', password='secretpass1',
        )['user']

        # Same conventions on both paths: username IS the email, role/status
        # identical, and the profile link set the same way.
        self.assertEqual(alumni_user.username, alumni_user.email)
        self.assertEqual(student_user.username, student_user.email)
        for field in ('role', 'account_status', 'admission_status', 'first_name', 'last_name'):
            self.assertEqual(
                getattr(alumni_user, field), getattr(student_user, field),
                f'{field} differs between the alumni and student account flows',
            )

    def test_alumni_duplicate_raises_valueerror_for_the_view(self):
        create_portal_account_for_alumni(self.alumni)
        with self.assertRaises(ValueError):
            create_portal_account_for_alumni(self.alumni)
