"""
Tests for the dynamic-academic + admission-settings changes:

- The semester selected on the admission becomes the student's current semester
  on approval (fixes the "everyone is 1st semester" bug).
- Applicant-supplied Roll / Registration are used verbatim (no auto-generation);
  otherwise readable identifiers are generated.
- Prior-semester GPAs seed the student's semesterResults.
- The Admission Settings endpoint reads/updates enable flag + document map.
"""
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.admissions.models import Admission, AdmissionSettings
from apps.departments.models import Department
from apps.students.models import Student

User = get_user_model()


class ApproveResolvesSemesterAndRollTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='reg@example.com', email='reg@example.com',
            password='pass12345', role='registrar', account_status='active',
        )
        self.student = User.objects.create_user(
            username='s@example.com', email='s@example.com', password='pass12345',
            role='student', account_status='active', student_id='SIPI-900001',
        )
        self.dept = Department.objects.create(name='Computer', code='CST')

    def _make_admission(self, **extra):
        address = {
            'village': 'V', 'postOffice': 'PO', 'upazila': 'U',
            'district': 'D', 'division': 'Dhaka',
        }
        defaults = dict(
            user=self.student, is_draft=False, status='pending',
            application_id='SIPI-900001', full_name_english='Test Student',
            desired_department=self.dept, desired_shift='Morning', session='2025-26',
            present_address=address, permanent_address=address,
        )
        defaults.update(extra)
        return Admission.objects.create(**defaults)

    def test_selected_semester_becomes_student_semester(self):
        adm = self._make_admission(semester=3)
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f'/api/admissions/{adm.id}/approve/', {'review_notes': 'ok'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        student = Student.objects.get(id=resp.data['student_id'])
        self.assertEqual(student.semester, 3)  # NOT 1

    def test_provided_roll_and_registration_used_verbatim(self):
        adm = self._make_admission(
            semester=2,
            current_roll_number='CST-2024-042',
            current_registration_number='2024CST042',
            previous_gpas=[{'semester': 1, 'gpa': 3.85}],
        )
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f'/api/admissions/{adm.id}/approve/', {'review_notes': 'ok'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        student = Student.objects.get(id=resp.data['student_id'])
        self.assertEqual(student.currentRollNumber, 'CST-2024-042')
        self.assertEqual(student.currentRegistrationNumber, '2024CST042')
        # Prior GPA seeded into semester results.
        self.assertEqual(len(student.semesterResults), 1)
        self.assertEqual(student.semesterResults[0]['semester'], 1)

    def test_missing_roll_is_auto_generated(self):
        adm = self._make_admission(semester=1)
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f'/api/admissions/{adm.id}/approve/', {'review_notes': 'ok'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        student = Student.objects.get(id=resp.data['student_id'])
        self.assertTrue(student.currentRollNumber)
        self.assertTrue(student.currentRegistrationNumber)
        self.assertEqual(student.semester, 1)

    def test_legacy_admission_without_semester_defaults_to_one(self):
        adm = self._make_admission()  # semester left null (legacy row)
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f'/api/admissions/{adm.id}/approve/', {'review_notes': 'ok'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        student = Student.objects.get(id=resp.data['student_id'])
        self.assertEqual(student.semester, 1)


class AdmissionSettingsEndpointTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='reg2@example.com', email='reg2@example.com',
            password='pass12345', role='registrar', account_status='active',
        )
        self.student = User.objects.create_user(
            username='s2@example.com', email='s2@example.com', password='pass12345',
            role='student', account_status='active',
        )

    def test_student_can_read_settings(self):
        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/admissions/settings/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('is_admission_enabled', resp.data)
        self.assertIn('photo', resp.data['document_requirements'])

    def test_admin_can_update_settings(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.put('/api/admissions/settings/', {
            'is_admission_enabled': False,
            'document_requirements': {'photo': False, 'sscMarksheet': True},
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertFalse(resp.data['is_admission_enabled'])
        self.assertFalse(resp.data['document_requirements']['photo'])
        # Persisted singleton reflects the change.
        self.assertFalse(AdmissionSettings.get_settings().is_admission_enabled)

    def test_student_cannot_update_settings(self):
        self.client.force_authenticate(self.student)
        resp = self.client.put('/api/admissions/settings/', {'is_admission_enabled': False}, format='json')
        self.assertIn(resp.status_code, (401, 403))

    def test_disabled_admission_refuses_submission(self):
        AdmissionSettings.objects.all().delete()
        s = AdmissionSettings.get_settings()
        s.is_admission_enabled = False
        s.save()
        self.client.force_authenticate(self.student)
        resp = self.client.post('/api/admissions/', {'full_name_english': 'X'}, format='json')
        self.assertEqual(resp.status_code, 403)
