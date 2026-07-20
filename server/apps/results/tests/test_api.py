"""
API tests: permissions (deny-by-default), public search payload, student
self-view, admin import management.
"""
from decimal import Decimal
from unittest import mock

from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import User
from apps.departments.models import Department
from apps.results.models import (
    Exam,
    Institute,
    ParserIssue,
    ResultImport,
    SemesterGPA,
    StudentResult,
)
from apps.students.models import Student


class ResultApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CST')
        cls.exam = Exam.objects.create(
            semester=8, regulationYear=2022, program='DIPLOMA IN ENGINEERING',
            heldIn='2025 held in January-March, 2026',
        )
        cls.institute = Institute.objects.create(
            code='99001', name='Testville Polytechnic Institute',
        )
        cls.import_record = ResultImport.objects.create(
            fileName='8th.pdf', fileSha256='c' * 64, status='completed',
            stats={'recordCount': 1},
        )
        cls.result = StudentResult.objects.create(
            exam=cls.exam, institute=cls.institute,
            importRecord=cls.import_record,
            rollNumber='612120', resultType='passed', cgpa=Decimal('3.25'),
        )
        SemesterGPA.objects.create(result=cls.result, semester=8, gpa=Decimal('3.75'))
        ParserIssue.objects.create(
            importRecord=cls.import_record, severity='info', stage='parse',
            code='bare-expelled-roll', message='test issue',
        )

        cls.student = Student.objects.create(
            fullNameEnglish='Portal Student',
            currentRollNumber='612120',
            currentRegistrationNumber='REG-612120',
            semester=8, department=cls.dept,
        )
        cls.admin = User.objects.create_user(
            username='resultadmin', email='ra@x.com', password='pw',
            role='registrar', account_status='active',
        )
        cls.student_user = User.objects.create_user(
            username='portalstudent', email='ps@x.com', password='pw',
            role='student', related_profile_id=cls.student.id,
            account_status='active',
        )

    # ---- public search ----

    def test_public_search_returns_history(self):
        response = self.client.get('/api/results/public/search/', {'roll': '612120'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data['found'])
        self.assertEqual(data['finalCgpa'], '3.25')
        self.assertEqual(data['institute']['code'], '99001')
        self.assertEqual(data['results'][0]['resultType'], 'passed')
        self.assertEqual(data['results'][0]['gpas'][0]['semester'], 8)

    def test_public_search_unknown_roll(self):
        response = self.client.get('/api/results/public/search/', {'roll': '111111'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()['found'])

    def test_public_search_rejects_non_numeric(self):
        response = self.client.get('/api/results/public/search/', {'roll': 'abc'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ---- student self-view ----

    def test_my_results_requires_auth(self):
        response = self.client.get('/api/results/my/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_my_results_for_student(self):
        self.client.force_authenticate(self.student_user)
        response = self.client.get('/api/results/my/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['roll'], '612120')

    # ---- admin endpoints ----

    def test_admin_endpoints_denied_for_students(self):
        self.client.force_authenticate(self.student_user)
        for url in (
            '/api/results/imports/',
            f'/api/results/imports/{self.import_record.id}/',
            f'/api/results/imports/{self.import_record.id}/issues/',
            '/api/results/admin/search/?roll=612120',
        ):
            response = self.client.get(url)
            self.assertEqual(
                response.status_code, status.HTTP_403_FORBIDDEN, url,
            )

    def test_admin_import_history_and_issues(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/results/imports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()[0]['fileName'], '8th.pdf')

        response = self.client.get(
            f'/api/results/imports/{self.import_record.id}/issues/',
        )
        self.assertEqual(response.json()[0]['code'], 'bare-expelled-roll')

    def test_admin_roll_search(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/results/admin/search/', {'roll': '612120'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['found'])

    def test_upload_rejects_non_pdf(self):
        self.client.force_authenticate(self.admin)
        from django.core.files.uploadedfile import SimpleUploadedFile
        response = self.client.post(
            '/api/results/imports/',
            {'file': SimpleUploadedFile('x.txt', b'hello')},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_duplicate_conflict(self):
        self.client.force_authenticate(self.admin)
        from django.core.files.uploadedfile import SimpleUploadedFile
        import hashlib
        payload = b'%PDF-1.4 fake'
        ResultImport.objects.create(
            fileName='dup.pdf', fileSha256=hashlib.sha256(payload).hexdigest(),
            status='completed',
        )
        response = self.client.post(
            '/api/results/imports/',
            {'file': SimpleUploadedFile('dup.pdf', payload)},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_upload_starts_background_import(self):
        self.client.force_authenticate(self.admin)
        from django.core.files.uploadedfile import SimpleUploadedFile
        with mock.patch('apps.results.views.import_result_pdf') as mocked:
            mocked.return_value = self.import_record
            response = self.client.post(
                '/api/results/imports/',
                {'file': SimpleUploadedFile('new.pdf', b'%PDF-1.4 new')},
                format='multipart',
            )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(mocked.called)

    def test_delete_import_cascades(self):
        self.client.force_authenticate(self.admin)
        response = self.client.delete(
            f'/api/results/imports/{self.import_record.id}/',
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(StudentResult.objects.count(), 0)
        self.assertEqual(ParserIssue.objects.count(), 0)
