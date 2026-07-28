"""
Forwarding an application to a Department Head needs department AND shift.

A department has one head per shift, so the department alone does not identify
a recipient — the application used to land in every head's inbox. These tests
pin the routing down: the shift is required, only the matching head can act,
and the other shift's head never sees it.
"""
from rest_framework.test import APITestCase

from apps.applications.models import Application
from apps.applications.views import normalize_head_shift
from apps.authentication.models import User
from apps.departments.models import Department


class ForwardWithShiftTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cs = Department.objects.create(name='Computer', code='CST')
        cls.registrar = User.objects.create_user(
            username='reg', email='reg@x.com', password='pw',
            role='registrar', account_status='active',
        )
        cls.head_1st = User.objects.create_user(
            username='h1', email='h1@x.com', password='pw',
            role='department_head', department=cls.cs, shift='1st_shift',
            account_status='active',
        )
        cls.head_2nd = User.objects.create_user(
            username='h2', email='h2@x.com', password='pw',
            role='department_head', department=cls.cs, shift='2nd_shift',
            account_status='active',
        )

    def setUp(self):
        self.application = Application.objects.create(
            fullNameBangla='x', fullNameEnglish='Applicant', fatherName='f',
            motherName='m', department='Computer', session='2023', shift='Morning',
            rollNumber='R1', registrationNumber='REG1', subject='s', message='m',
            applicationType='Testimonial', status='pending',
            current_approver_role='registrar', stage=1,
        )
        self.url = f'/api/applications/{self.application.id}/forward/'

    def _forward(self, **body):
        self.client.force_authenticate(user=self.registrar)
        return self.client.post(
            self.url,
            {'forward_to': 'department_head', 'department_id': str(self.cs.id), **body},
            format='json',
        )

    # ---- the shift is required and stored ---------------------------------
    def test_forwarding_without_a_shift_is_rejected(self):
        response = self._forward()
        self.assertEqual(response.status_code, 400)
        self.assertIn('shift', str(response.data).lower())
        self.application.refresh_from_db()
        self.assertEqual(self.application.stage, 1)

    def test_forwarding_stores_the_target_shift(self):
        response = self._forward(shift='1st_shift')
        self.assertEqual(response.status_code, 200, response.data)
        self.application.refresh_from_db()
        self.assertEqual(self.application.current_shift, '1st_shift')
        self.assertEqual(self.application.current_department_id, self.cs.id)
        self.assertEqual(self.application.current_approver_role, 'department_head')

    def test_the_history_entry_names_the_shift(self):
        self._forward(shift='2nd_shift')
        approval = self.application.approvals.filter(action='forwarded').first()
        self.assertIn('2nd Shift', approval.forwarded_to_name)
        self.assertIn('Computer', approval.forwarded_to_name)

    def test_student_shift_vocabulary_is_accepted(self):
        response = self._forward(shift='Morning')
        self.assertEqual(response.status_code, 200, response.data)
        self.application.refresh_from_db()
        self.assertEqual(self.application.current_shift, '1st_shift')

    def test_forwarding_to_the_principal_needs_no_shift(self):
        self.client.force_authenticate(user=self.registrar)
        response = self.client.post(
            self.url, {'forward_to': 'institute_head'}, format='json'
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.application.refresh_from_db()
        self.assertEqual(self.application.current_shift, '')

    # ---- only the matching head can act -----------------------------------
    def test_the_matching_head_can_approve(self):
        self._forward(shift='1st_shift')
        self.client.force_authenticate(user=self.head_1st)
        response = self.client.post(
            f'/api/applications/{self.application.id}/approve/', {}, format='json'
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'approved')

    def test_the_other_shifts_head_cannot_approve(self):
        self._forward(shift='1st_shift')
        self.client.force_authenticate(user=self.head_2nd)
        response = self.client.post(
            f'/api/applications/{self.application.id}/approve/', {}, format='json'
        )
        self.assertIn(response.status_code, (403, 404))
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'pending')

    def _inbox_ids(self, user):
        self.client.force_authenticate(user=user)
        data = self.client.get('/api/applications/').data
        # Paginated dict or a plain list, and an EMPTY results list is a valid
        # answer — don't collapse it into the envelope.
        rows = data['results'] if isinstance(data, dict) else data
        return {str(row['id']) for row in rows}

    def test_the_other_shifts_head_does_not_see_it_in_their_inbox(self):
        self._forward(shift='1st_shift')
        self.assertIn(str(self.application.id), self._inbox_ids(self.head_1st))
        self.assertNotIn(str(self.application.id), self._inbox_ids(self.head_2nd))

    # ---- approval clears the routing --------------------------------------
    def test_approval_clears_the_shift(self):
        self._forward(shift='1st_shift')
        self.client.force_authenticate(user=self.head_1st)
        self.client.post(f'/api/applications/{self.application.id}/approve/', {}, format='json')
        self.application.refresh_from_db()
        self.assertEqual(self.application.current_shift, '')

    # ---- shift normalisation ----------------------------------------------
    def test_shift_normalisation(self):
        for value in ('1st_shift', '1st shift', 'Morning', 'first'):
            self.assertEqual(normalize_head_shift(value), '1st_shift', value)
        for value in ('2nd_shift', '2nd shift', 'Day', 'second', 'evening'):
            self.assertEqual(normalize_head_shift(value), '2nd_shift', value)
        for value in ('', None, 'nonsense'):
            self.assertEqual(normalize_head_shift(value), '')
