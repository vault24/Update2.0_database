"""
Tests for the "no student without approval" rule.

An alumni self-registration that an admin hasn't approved (still pending, or
rejected) is not a confirmed student and must never surface in student
listings, department pages or dashboard counts. Regular students and approved
alumni must still be visible.
"""
import uuid

from django.test import TestCase

from apps.departments.models import Department
from apps.alumni.models import Alumni
from .models import Student, exclude_unapproved_alumni


class ExcludeUnapprovedAlumniTest(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(
            name=f'CSE {uuid.uuid4().hex[:6]}', code=f'C{uuid.uuid4().hex[:5]}'
        )

    def _student(self, **overrides):
        rs = uuid.uuid4().hex[:8]
        data = dict(
            fullNameEnglish='S',
            currentRollNumber=f'CR{rs}',
            currentRegistrationNumber=f'REG{rs}',
            semester=8,
            department=self.dept,
            status='active',
        )
        data.update(overrides)
        return Student.objects.create(**data)

    def _alumni(self, student, review):
        return Alumni.objects.create(
            student=student,
            registrationSource='self_registration',
            reviewStatus=review,
        )

    def test_regular_student_is_kept(self):
        """A student with NO alumni record must survive the exclusion."""
        s = self._student()
        ids = set(exclude_unapproved_alumni(Student.objects.all()).values_list('id', flat=True))
        self.assertIn(s.id, ids)

    def test_pending_and_rejected_alumni_are_hidden(self):
        pending = self._student(status='graduated')
        self._alumni(pending, 'pending')
        rejected = self._student(status='graduated')
        self._alumni(rejected, 'rejected')

        ids = set(exclude_unapproved_alumni(Student.objects.all()).values_list('id', flat=True))
        self.assertNotIn(pending.id, ids)
        self.assertNotIn(rejected.id, ids)

    def test_approved_alumni_is_kept(self):
        approved = self._student(status='graduated')
        self._alumni(approved, 'approved')
        ids = set(exclude_unapproved_alumni(Student.objects.all()).values_list('id', flat=True))
        self.assertIn(approved.id, ids)

    def test_mixed_population(self):
        """Only the two unapproved rows drop; the other three remain."""
        keep_regular = self._student()
        keep_approved = self._student(status='graduated')
        self._alumni(keep_approved, 'approved')
        drop_pending = self._student(status='graduated')
        self._alumni(drop_pending, 'pending')
        drop_rejected = self._student(status='graduated')
        self._alumni(drop_rejected, 'rejected')

        ids = set(exclude_unapproved_alumni(Student.objects.all()).values_list('id', flat=True))
        self.assertEqual(ids, {keep_regular.id, keep_approved.id})
