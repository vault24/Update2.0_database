"""
Public result-portal API tests: recent exams (cached, anonymous), personal
result PDF download, and search speed sanity.
"""
import time
from decimal import Decimal

from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from apps.results.models import (
    Exam,
    Institute,
    ResultImport,
    ResultSubject,
    SemesterGPA,
    StudentResult,
)


class PublicPortalApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.exam = Exam.objects.create(
            semester=8, regulationYear=2022, program='DIPLOMA IN ENGINEERING',
            heldIn='2025 held in January-March, 2026',
            publicationDate='2026-04-28',
        )
        cls.institute = Institute.objects.create(
            code='16100', name='Rangpur Ideal Institute Of Technology, Rangpur',
        )
        cls.import_record = ResultImport.objects.create(
            fileName='8th.pdf', fileSha256='e' * 64, status='completed',
        )
        cls.result = StudentResult.objects.create(
            exam=cls.exam, institute=cls.institute,
            importRecord=cls.import_record,
            rollNumber='608617', resultType='referred',
        )
        for semester, gpa in [(1, '3.37'), (7, None), (8, '3.50')]:
            SemesterGPA.objects.create(
                result=cls.result, semester=semester,
                gpa=None if gpa is None else Decimal(gpa),
                isReferred=gpa is None,
            )
        ResultSubject.objects.create(
            result=cls.result, subjectCode='27071', hasTheory=True,
        )

    def setUp(self):
        cache.clear()  # recent-exams endpoint memoises

    def test_recent_exams_anonymous(self):
        response = self.client.get('/api/results/public/exams/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['semester'], 8)
        self.assertEqual(data[0]['resultCount'], 1)
        self.assertEqual(data[0]['publicationDate'], '2026-04-28')

    def test_recent_exams_cached(self):
        self.client.get('/api/results/public/exams/')
        # A new exam does NOT appear until the cache expires.
        Exam.objects.create(
            semester=4, regulationYear=2022, program='DIPLOMA IN ENGINEERING',
            heldIn='x',
        )
        data = self.client.get('/api/results/public/exams/').json()
        self.assertEqual(len(data), 1)

    def test_pdf_download(self):
        response = self.client.get('/api/results/public/download/?roll=608617')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.content.startswith(b'%PDF'))
        self.assertIn('BTEB-Result-608617.pdf', response['Content-Disposition'])

    def test_pdf_download_unknown_roll(self):
        response = self.client.get('/api/results/public/download/?roll=999999')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_pdf_download_rejects_bad_roll(self):
        response = self.client.get('/api/results/public/download/?roll=abc')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_search_is_fast(self):
        """Indexed lookup — generous CI bound, real target is <300ms."""
        started = time.monotonic()
        response = self.client.get('/api/results/public/search/', {'roll': '608617'})
        elapsed = time.monotonic() - started
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['found'])
        self.assertLess(elapsed, 1.0, f'search took {elapsed:.3f}s')
