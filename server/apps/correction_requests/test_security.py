"""
Red-team regression tests for correction requests.

The original viewset let ANY logged-in student:
  * approve/reject requests (write to any student record via setattr), and
  * file a request targeting an arbitrary student, then self-approve it,
  * list / read every student's correction requests (IDOR).

These lock the holes: review is admin-only + field-whitelisted, and students
are pinned to their own record for both reading and filing.
"""
from rest_framework.test import APITestCase

from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from apps.correction_requests.models import CorrectionRequest


def _student(dept, roll):
    return Student.objects.create(
        fullNameEnglish=f'S {roll}', currentRollNumber=roll,
        currentRegistrationNumber=f'REG-{roll}', semester=1, shift='Day',
        department=dept, status='active', finalCgpa=None)


class CorrectionRequestSecurityTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cs = Department.objects.create(name='Computer', code='CS')
        cls.victim = _student(cls.cs, 'VICTIM')
        cls.attacker_profile = _student(cls.cs, 'ATTACKER')
        cls.attacker = User.objects.create_user(
            username='attacker', email='atk@x.com', password='pw', role='student',
            related_profile_id=cls.attacker_profile.id, account_status='active')
        cls.principal = User.objects.create_superuser(
            username='principal', email='p@x.com', password='pw', role='institute_head')

    def test_student_cannot_approve(self):
        """A student self-approving a correction must be forbidden."""
        req = CorrectionRequest.objects.create(
            student=self.attacker_profile, requested_by=self.attacker,
            field_name='fullNameEnglish', requested_value='Hacked', status='pending')
        self.client.force_authenticate(self.attacker)
        r = self.client.post(f'/api/correction-requests/{req.id}/approve/', {}, format='json')
        self.assertEqual(r.status_code, 403)
        self.attacker_profile.refresh_from_db()
        self.assertEqual(self.attacker_profile.fullNameEnglish, 'S ATTACKER')

    def test_student_cannot_target_another_student(self):
        """Filing a request with someone else's student id is forced to self."""
        self.client.force_authenticate(self.attacker)
        r = self.client.post('/api/correction-requests/', {
            'student': str(self.victim.id), 'field_name': 'fullNameEnglish',
            'current_value': 'old', 'requested_value': 'Pwned', 'reason': 'x'}, format='json')
        self.assertEqual(r.status_code, 201)
        cr = CorrectionRequest.objects.get(requested_by=self.attacker)
        self.assertEqual(cr.student_id, self.attacker_profile.id)  # not the victim

    def test_student_cannot_list_others_requests(self):
        CorrectionRequest.objects.create(
            student=self.victim, requested_by=self.principal,
            field_name='fullNameEnglish', requested_value='x', status='pending')
        self.client.force_authenticate(self.attacker)
        r = self.client.get('/api/correction-requests/', {'student': str(self.victim.id)})
        self.assertEqual(r.status_code, 200)
        results = r.data['results'] if isinstance(r.data, dict) and 'results' in r.data else r.data
        self.assertEqual(results, [])

    def test_my_requests_ignores_arbitrary_student(self):
        CorrectionRequest.objects.create(
            student=self.victim, requested_by=self.principal,
            field_name='fullNameEnglish', requested_value='x', status='pending')
        self.client.force_authenticate(self.attacker)
        r = self.client.get('/api/correction-requests/my_requests/', {'student': str(self.victim.id)})
        self.assertEqual(r.data['requests'], [])

    def test_admin_cannot_correct_blacklisted_field(self):
        """Even an admin cannot rewrite academic fields (CGPA/semester/roll)."""
        req = CorrectionRequest.objects.create(
            student=self.victim, requested_by=self.principal,
            field_name='finalCgpa', requested_value='4.00', status='pending')
        self.client.force_authenticate(self.principal)
        r = self.client.post(f'/api/correction-requests/{req.id}/approve/', {}, format='json')
        self.assertEqual(r.status_code, 400)
        self.victim.refresh_from_db()
        self.assertIsNone(self.victim.finalCgpa)

    def test_admin_can_correct_whitelisted_field(self):
        req = CorrectionRequest.objects.create(
            student=self.victim, requested_by=self.principal,
            field_name='fullNameEnglish', requested_value='Correct Name', status='pending')
        self.client.force_authenticate(self.principal)
        r = self.client.post(f'/api/correction-requests/{req.id}/approve/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        self.victim.refresh_from_db()
        self.assertEqual(self.victim.fullNameEnglish, 'Correct Name')
