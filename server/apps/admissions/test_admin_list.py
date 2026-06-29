"""
The admin Admissions list must NOT include unsubmitted drafts.

A draft Admission row is created automatically the first time a student opens
the admission form (auto-save). Those empty drafts used to surface in the admin
list as "fake" applications showing only a UUID with no information.
"""
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.admissions.models import Admission

User = get_user_model()


class AdmissionListExcludesDraftsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='reg@example.com', email='reg@example.com',
            password='pass12345', role='registrar', account_status='active',
        )
        self.student_a = User.objects.create_user(
            username='a@example.com', email='a@example.com', password='pass12345',
            role='student', account_status='active',
        )
        self.student_b = User.objects.create_user(
            username='b@example.com', email='b@example.com', password='pass12345',
            role='student', account_status='active',
        )

        # An auto-created draft (the "fake" admission) — no real info.
        self.draft = Admission.objects.create(user=self.student_a, is_draft=True)

        # A genuine submitted application.
        self.submitted = Admission.objects.create(
            user=self.student_b, is_draft=False, status='pending',
            application_id='SIPI-202501', full_name_english='Real Applicant',
        )

    def test_list_excludes_drafts(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/admissions/')
        self.assertEqual(resp.status_code, 200)

        results = resp.data.get('results', resp.data)
        ids = {str(item['id']) for item in results}

        # Exactly one real admission is visible — the submitted one (shown by its
        # application_id), never the draft (which would only show a raw UUID).
        self.assertEqual(len(results), 1)
        self.assertIn('SIPI-202501', ids)
        self.assertNotIn(str(self.draft.id), ids)
        self.assertEqual(results[0].get('full_name_english'), 'Real Applicant')
