"""
Tests for the Student Portal account soft-delete / purge flow.

Covers: robust portal-account detection (by email, not just related_profile_id),
scheduling a deletion (7-day window, account stays usable), auto-cancel on login,
and the permanent purge (Alumni + User + Student, no ProtectedError).
"""
import uuid
from datetime import timedelta

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model, login
from django.contrib.sessions.middleware import SessionMiddleware
from django.core.management import call_command
from django.utils import timezone

from apps.departments.models import Department
from apps.alumni.models import Alumni
from .models import Student, StudentDeletionRequest
from .account_service import find_portal_account
from .deletion_service import (
    schedule_student_deletion,
    cancel_student_deletion,
    purge_student_completely,
)

User = get_user_model()


def _make_student(dept, **overrides):
    rs = uuid.uuid4().hex[:8]
    data = dict(
        fullNameEnglish='Test Student',
        currentRollNumber=f'CR{rs}',
        currentRegistrationNumber=f'REG{rs}',
        semester=1,
        department=dept,
        status='active',
        email=f'{rs}@example.com',
    )
    data.update(overrides)
    return Student.objects.create(**data)


def _make_portal_user(student, **overrides):
    rs = uuid.uuid4().hex[:8]
    data = dict(
        username=student.email or f'{rs}@example.com',
        email=student.email or f'{rs}@example.com',
        role='student',
        account_status='active',
        related_profile_id=student.id,
        student_id=f'SIPI-{rs.upper()}',
    )
    data.update(overrides)
    user = User(**data)
    user.set_password('portalpass123')
    user.save()
    return user


class DetectionTest(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(
            name=f'CSE {uuid.uuid4().hex[:6]}', code=f'C{uuid.uuid4().hex[:5]}'
        )

    def test_detects_account_linked_by_related_profile(self):
        student = _make_student(self.dept)
        user = _make_portal_user(student)
        self.assertEqual(find_portal_account(student), user)

    def test_detects_account_by_email_when_profile_link_differs(self):
        """An Alumni/Captain login registered with the same email but linked to a
        DIFFERENT student record must still be found (the reported bug)."""
        student = _make_student(self.dept, email='shared@example.com')
        # Account is linked to some other/none profile, but shares the email.
        user = _make_portal_user(
            student, related_profile_id=uuid.uuid4(), is_alumni_account=True,
        )
        found = find_portal_account(student)
        self.assertEqual(found, user)

    def test_no_account_returns_none(self):
        student = _make_student(self.dept)
        self.assertIsNone(find_portal_account(student))


class ScheduleAndCancelTest(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(
            name=f'CSE {uuid.uuid4().hex[:6]}', code=f'C{uuid.uuid4().hex[:5]}'
        )
        self.student = _make_student(self.dept)
        self.user = _make_portal_user(self.student)

    def test_schedule_sets_seven_day_window_and_keeps_account_usable(self):
        req = schedule_student_deletion(self.student, actor=None)
        self.assertEqual(req.status, 'pending')
        expected = timezone.now() + timedelta(days=StudentDeletionRequest.RECOVERY_DAYS)
        self.assertAlmostEqual(req.purge_at.timestamp(), expected.timestamp(), delta=120)
        # Account is untouched — still active and present.
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertTrue(Student.objects.filter(id=self.student.id).exists())

    def test_admin_cancel(self):
        schedule_student_deletion(self.student, actor=None)
        req = cancel_student_deletion(student=self.student, reason='admin')
        self.assertIsNotNone(req)
        self.assertEqual(req.status, 'cancelled')
        self.assertEqual(req.cancel_reason, 'admin')

    def test_login_signal_cancels_pending_request(self):
        schedule_student_deletion(self.student, actor=None)

        # Drive a real Django login so the user_logged_in signal fires.
        rf = RequestFactory()
        request = rf.get('/')
        SessionMiddleware(lambda r: None).process_request(request)
        request.session.save()
        self.user.backend = 'django.contrib.auth.backends.ModelBackend'
        login(request, self.user)

        req = StudentDeletionRequest.objects.get(student=self.student)
        self.assertEqual(req.status, 'cancelled')
        self.assertEqual(req.cancel_reason, 'student_login')


class PurgeTest(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(
            name=f'CSE {uuid.uuid4().hex[:6]}', code=f'C{uuid.uuid4().hex[:5]}'
        )

    def test_purge_removes_alumni_user_and_student(self):
        student = _make_student(self.dept, status='graduated')
        user = _make_portal_user(student)
        Alumni.objects.create(student=student, reviewStatus='approved')

        purge_student_completely(student)

        self.assertFalse(Student.objects.filter(id=student.id).exists())
        self.assertFalse(User.objects.filter(id=user.id).exists())
        self.assertFalse(Alumni.objects.filter(student_id=student.id).exists())

    def test_command_purges_expired_only(self):
        # Expired -> should be purged.
        expired = _make_student(self.dept)
        _make_portal_user(expired)
        req_expired = schedule_student_deletion(expired, actor=None)
        StudentDeletionRequest.objects.filter(pk=req_expired.pk).update(
            purge_at=timezone.now() - timedelta(minutes=1)
        )

        # Fresh -> should be kept.
        fresh = _make_student(self.dept)
        schedule_student_deletion(fresh, actor=None)

        call_command('purge_pending_deletions')

        self.assertFalse(Student.objects.filter(id=expired.id).exists())
        self.assertTrue(Student.objects.filter(id=fresh.id).exists())
        self.assertEqual(
            StudentDeletionRequest.objects.get(student=fresh).status, 'pending'
        )
