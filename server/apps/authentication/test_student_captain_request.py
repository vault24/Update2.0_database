"""
A student can ask to become a Class Captain from their Settings page.

The request is routed to the Department Head responsible for the student's
department AND shift — the same routing used when a Captain account is created
at signup — and approval upgrades the existing account in place, so the
student's record and data survive.
"""
from rest_framework.test import APITestCase

from apps.authentication.models import CaptainAccountRequest, User
from apps.departments.models import Department
from apps.students.models import Student

URL = '/api/auth/captain-request/me/'


class StudentCaptainRequestTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cs = Department.objects.create(name='Computer', code='CST')
        cls.head_1st = User.objects.create_user(
            username='h1', email='h1@x.com', password='pw', role='department_head',
            department=cls.cs, shift='1st_shift', account_status='active',
        )
        cls.head_2nd = User.objects.create_user(
            username='h2', email='h2@x.com', password='pw', role='department_head',
            department=cls.cs, shift='2nd_shift', account_status='active',
        )

    def setUp(self):
        self.student = Student.objects.create(
            fullNameEnglish='Hopeful Captain', currentRollNumber='R5',
            currentRegistrationNumber='REG5', semester=3, shift='Morning',
            department=self.cs, session='2023-24', status='active',
            finalCgpa='3.40',
        )
        self.user = User.objects.create_user(
            username='stu', email='stu@x.com', password='pw', role='student',
            related_profile_id=self.student.id, account_status='active',
        )
        self.client.force_authenticate(user=self.user)

    # ---- eligibility -------------------------------------------------------
    def test_a_student_may_request(self):
        data = self.client.get(URL).data
        self.assertTrue(data['canRequest'])
        self.assertFalse(data['isCaptain'])
        self.assertEqual(data['departmentName'], 'Computer')
        self.assertEqual(data['shift'], 'Morning')

    def test_an_existing_captain_may_not_request(self):
        self.user.role = 'captain'
        self.user.save(update_fields=['role'])
        data = self.client.get(URL).data
        self.assertTrue(data['isCaptain'])
        self.assertFalse(data['canRequest'])

    def test_a_teacher_account_is_refused(self):
        teacher = User.objects.create_user(
            username='t', email='t@x.com', password='pw', role='teacher',
            account_status='active',
        )
        self.client.force_authenticate(user=teacher)
        self.assertEqual(self.client.get(URL).status_code, 403)

    # ---- submitting --------------------------------------------------------
    def test_submitting_creates_a_pending_request(self):
        response = self.client.post(URL, {}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        request = CaptainAccountRequest.objects.get(user=self.user)
        self.assertEqual(request.status, 'pending')
        self.assertEqual(request.department_id, self.cs.id)
        self.assertEqual(request.shift, 'Morning')

    def test_routing_uses_the_students_own_department_and_shift(self):
        """A student cannot aim their request at another department/shift."""
        other = Department.objects.create(name='Civil', code='CIV')
        self.client.post(URL, {'department': str(other.id), 'shift': 'Day'}, format='json')
        request = CaptainAccountRequest.objects.get(user=self.user)
        self.assertEqual(request.department_id, self.cs.id)
        self.assertEqual(request.shift, 'Morning')

    def test_the_matching_head_is_notified(self):
        from apps.notifications.models import Notification
        self.client.post(URL, {}, format='json')
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.head_1st, title='New Captain Account Request'
            ).exists()
        )
        self.assertFalse(
            Notification.objects.filter(recipient=self.head_2nd).exists()
        )

    def test_a_second_request_while_one_is_pending_is_refused(self):
        self.client.post(URL, {}, format='json')
        response = self.client.post(URL, {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(CaptainAccountRequest.objects.filter(user=self.user).count(), 1)

    def test_a_student_without_a_profile_cannot_request(self):
        self.user.related_profile_id = None
        self.user.save(update_fields=['related_profile_id'])
        data = self.client.get(URL).data
        self.assertFalse(data['canRequest'])
        self.assertEqual(self.client.post(URL, {}, format='json').status_code, 400)

    def test_reapplying_after_a_rejection_is_allowed(self):
        CaptainAccountRequest.objects.create(
            user=self.user, department=self.cs, shift='Morning',
            status='rejected', rejection_reason='Not this term',
        )
        data = self.client.get(URL).data
        self.assertTrue(data['canRequest'])
        self.assertEqual(data['request']['status'], 'rejected')
        self.assertEqual(self.client.post(URL, {}, format='json').status_code, 201)

    # ---- approval preserves the account ------------------------------------
    def test_approval_upgrades_the_account_in_place(self):
        self.client.post(URL, {}, format='json')
        request = CaptainAccountRequest.objects.get(user=self.user)

        self.client.force_authenticate(user=self.head_1st)
        response = self.client.post(
            f'/api/auth/captain-requests/{request.id}/review/',
            {'action': 'approve'}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)

        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'captain')
        # Same account, same student record, nothing recreated.
        self.assertEqual(str(self.user.related_profile_id), str(self.student.id))
        self.student.refresh_from_db()
        self.assertEqual(str(self.student.finalCgpa), '3.40')
        self.assertEqual(self.student.currentRollNumber, 'R5')

    def test_the_other_shifts_head_cannot_review_it(self):
        self.client.post(URL, {}, format='json')
        request = CaptainAccountRequest.objects.get(user=self.user)

        self.client.force_authenticate(user=self.head_2nd)
        response = self.client.post(
            f'/api/auth/captain-requests/{request.id}/review/',
            {'action': 'approve'}, format='json',
        )
        self.assertEqual(response.status_code, 403)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'student')
