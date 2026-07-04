"""
Tests for the captain account request workflow and the OTP-verified
account switching / deletion endpoints.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.departments.models import Department
from apps.notifications.models import Notification
from apps.alumni.services import create_alumni_from_essentials

from .models import User, CaptainAccountRequest
from .serializers import RegisterSerializer
from .services import OTPService


def make_department(name='Computer Technology', code='CT'):
    return Department.objects.create(name=name, code=code)


def register_captain(department, shift='Morning', email='captain@example.com'):
    # Unique SSC roll per registration (derived from the email local part).
    roll = str(100000 + (abs(hash(email)) % 900000))
    serializer = RegisterSerializer(data={
        'username': email,
        'email': email,
        'password': 'pass12345',
        'confirm_password': 'pass12345',
        'first_name': 'Cap',
        'last_name': 'Tain',
        'role': 'captain',
        'mobile_number': '01700000000',
        'ssc_board_roll': roll,
        'department': str(department.id),
        'shift': shift,
    })
    serializer.is_valid(raise_exception=True)
    return serializer.save()


class CaptainRequestFlowTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = make_department()
        self.other_department = make_department('Electrical Technology', 'ET')
        self.head = User.objects.create_user(
            username='head', email='head@example.com', password='pass12345',
            role='department_head', account_status='active',
            department=self.department, shift='1st_shift',
        )
        self.other_head = User.objects.create_user(
            username='otherhead', email='otherhead@example.com', password='pass12345',
            role='department_head', account_status='active',
            department=self.other_department, shift='1st_shift',
        )

    def test_captain_signup_requires_department_and_shift(self):
        serializer = RegisterSerializer(data={
            'username': 'x@example.com', 'email': 'x@example.com',
            'password': 'pass12345', 'confirm_password': 'pass12345',
            'first_name': 'X', 'last_name': 'Y', 'role': 'captain',
            'ssc_board_roll': '111222',
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('department', serializer.errors)

    def test_captain_signup_creates_pending_request_and_notifies_head(self):
        user = register_captain(self.department, 'Morning')

        # Account starts as a regular student until the head approves.
        self.assertEqual(user.role, 'student')

        request = CaptainAccountRequest.objects.get(user=user)
        self.assertEqual(request.status, 'pending')
        self.assertEqual(request.department_id, self.department.id)
        self.assertEqual(request.shift, 'Morning')

        # Routed to the matching head (dept + shift), not to other heads.
        self.assertTrue(Notification.objects.filter(
            recipient=self.head, notification_type='signup_request').exists())
        self.assertFalse(Notification.objects.filter(
            recipient=self.other_head).exists())

    def test_shift_mismatch_falls_back_to_all_heads_of_department(self):
        # No 2nd-shift head exists for CT -> the 1st-shift head still gets it.
        user = register_captain(self.department, 'Day', email='cap2@example.com')
        request = CaptainAccountRequest.objects.get(user=user)
        self.assertIn(self.head, list(request.matching_department_heads()))

    def test_head_approves_request_upgrades_role(self):
        user = register_captain(self.department, 'Morning')
        request = CaptainAccountRequest.objects.get(user=user)

        self.client.force_authenticate(self.head)
        response = self.client.post(
            f'/api/auth/captain-requests/{request.id}/review/',
            {'action': 'approve'}, format='json',
        )
        self.assertEqual(response.status_code, 200)

        user.refresh_from_db()
        request.refresh_from_db()
        self.assertEqual(user.role, 'captain')
        self.assertEqual(request.status, 'approved')

    def test_head_rejects_request_keeps_student_role(self):
        user = register_captain(self.department, 'Morning')
        request = CaptainAccountRequest.objects.get(user=user)

        self.client.force_authenticate(self.head)
        response = self.client.post(
            f'/api/auth/captain-requests/{request.id}/review/',
            {'action': 'reject', 'reason': 'Not a class captain'}, format='json',
        )
        self.assertEqual(response.status_code, 200)

        user.refresh_from_db()
        request.refresh_from_db()
        self.assertEqual(user.role, 'student')
        self.assertEqual(request.status, 'rejected')
        self.assertEqual(request.rejection_reason, 'Not a class captain')

    def test_other_department_head_cannot_review(self):
        user = register_captain(self.department, 'Morning')
        request = CaptainAccountRequest.objects.get(user=user)

        self.client.force_authenticate(self.other_head)
        response = self.client.post(
            f'/api/auth/captain-requests/{request.id}/review/',
            {'action': 'approve'}, format='json',
        )
        self.assertEqual(response.status_code, 403)

    def test_head_listing_scoped_to_own_department_and_shift(self):
        register_captain(self.department, 'Morning')  # matches self.head
        register_captain(self.other_department, 'Morning', email='cap3@example.com')

        self.client.force_authenticate(self.head)
        response = self.client.get('/api/auth/captain-requests/?status=pending')
        self.assertEqual(response.status_code, 200)
        results = response.json()['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['department'], str(self.department.id))
        self.assertEqual(results[0]['shift'], 'Morning')


class AccountSwitchAndDeleteTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = make_department()

    def _make_student(self, admission_status='not_started', **extra):
        return User.objects.create_user(
            username='student', email='student@example.com', password='pass12345',
            role='student', account_status='active',
            admission_status=admission_status, **extra,
        )

    def _make_pending_alumni_user(self):
        user = User.objects.create_user(
            username='alum', email='alum@example.com', password='pass12345',
            role='student', account_status='active',
            is_alumni_account=True, admission_status='approved',
        )
        alumni = create_alumni_from_essentials(
            data={'fullNameEnglish': 'Alum Person', 'department': str(self.department.id)},
            registration_source='self_registration',
            review_status='pending',
        )
        user.related_profile_id = alumni.student.id
        user.save(update_fields=['related_profile_id'])
        return user, alumni

    def _otp_for(self, user):
        return OTPService.create_otp_token(user).token

    def test_student_switches_to_alumni_account(self):
        user = self._make_student()
        self.client.force_authenticate(user)
        response = self.client.post(
            '/api/auth/account/switch/', {'otp': self._otp_for(user)}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_alumni_account)
        self.assertEqual(user.admission_status, 'approved')

    def test_admitted_student_cannot_switch(self):
        user = self._make_student(admission_status='approved')
        self.client.force_authenticate(user)
        response = self.client.post(
            '/api/auth/account/switch/', {'otp': self._otp_for(user)}, format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_pending_alumni_switches_back_to_student(self):
        user, alumni = self._make_pending_alumni_user()
        student_pk = alumni.student.pk

        self.client.force_authenticate(user)
        response = self.client.post(
            '/api/auth/account/switch/', {'otp': self._otp_for(user)}, format='json',
        )
        self.assertEqual(response.status_code, 200)

        user.refresh_from_db()
        self.assertFalse(user.is_alumni_account)
        self.assertIsNone(user.related_profile_id)
        self.assertEqual(user.admission_status, 'not_started')

        # The pending alumni application and its background student are gone.
        from apps.alumni.models import Alumni
        from apps.students.models import Student
        self.assertFalse(Alumni.objects.filter(pk=student_pk).exists())
        self.assertFalse(Student.objects.filter(pk=student_pk).exists())

    def test_approved_alumni_cannot_switch(self):
        user, alumni = self._make_pending_alumni_user()
        alumni.reviewStatus = 'approved'
        alumni.save(update_fields=['reviewStatus'])

        self.client.force_authenticate(user)
        response = self.client.post(
            '/api/auth/account/switch/', {'otp': self._otp_for(user)}, format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_switch_requires_valid_otp(self):
        user = self._make_student()
        self.client.force_authenticate(user)
        response = self.client.post(
            '/api/auth/account/switch/', {'otp': '000000'}, format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_delete_account_requires_password_and_otp(self):
        user = self._make_student()
        self.client.force_authenticate(user)

        # Wrong password
        response = self.client.post(
            '/api/auth/account/delete/',
            {'password': 'wrong', 'otp': self._otp_for(user)}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertTrue(User.objects.filter(pk=user.pk).exists())

        # Correct password + fresh OTP
        response = self.client.post(
            '/api/auth/account/delete/',
            {'password': 'pass12345', 'otp': self._otp_for(user)}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(pk=user.pk).exists())

    def test_admitted_student_cannot_delete(self):
        user = self._make_student(admission_status='approved')
        self.client.force_authenticate(user)
        response = self.client.post(
            '/api/auth/account/delete/',
            {'password': 'pass12345', 'otp': self._otp_for(user)}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertTrue(User.objects.filter(pk=user.pk).exists())

    def test_pending_alumni_delete_removes_profile(self):
        user, alumni = self._make_pending_alumni_user()
        student_pk = alumni.student.pk

        self.client.force_authenticate(user)
        response = self.client.post(
            '/api/auth/account/delete/',
            {'password': 'pass12345', 'otp': self._otp_for(user)}, format='json',
        )
        self.assertEqual(response.status_code, 200)

        from apps.alumni.models import Alumni
        from apps.students.models import Student
        self.assertFalse(User.objects.filter(pk=user.pk).exists())
        self.assertFalse(Alumni.objects.filter(pk=student_pk).exists())
        self.assertFalse(Student.objects.filter(pk=student_pk).exists())
