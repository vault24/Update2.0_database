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

    def test_republished_correction_supersedes(self):
        """A corrected re-publish (second exam row, later date) must SUPERSEDE
        the original for that semester — never merge or appear alongside it."""
        institute = Institute.objects.create(code='25064', name='Sirajganj Polytechnic')
        record = ResultImport.objects.create(
            fileName='4th.pdf', fileSha256='c0ffee' + 'a' * 58, status='completed',
        )
        # Original 4th-sem notice: 7 referred subjects (incl. 26843).
        original = Exam.objects.create(
            semester=4, regulationYear=2022, program='DIPLOMA IN ENGINEERING',
            heldIn='2025 held in January-March, 2026', publicationDate='2026-04-28',
        )
        old = StudentResult.objects.create(
            exam=original, institute=institute, importRecord=record,
            rollNumber='822797', resultType='failed',
        )
        for code in ('25841', '25921', '25931', '26741', '26742', '26841', '26843'):
            ResultSubject.objects.create(result=old, subjectCode=code, hasTheory=True)

        # Corrected re-publish landed as a separate exam row (later date),
        # with 26843 removed.
        corrected = Exam.objects.create(
            semester=4, regulationYear=2022, program='DIPLOMA IN ENGINEERING',
            heldIn='2025 held in January-March, 2026 ', publicationDate='2026-05-23',
        )
        new = StudentResult.objects.create(
            exam=corrected, institute=institute, importRecord=record,
            rollNumber='822797', resultType='failed',
        )
        for code in ('25841', '25921', '25931', '26741', '26742', '26841'):
            ResultSubject.objects.create(result=new, subjectCode=code, hasTheory=True)

        data = self.client.get('/api/results/public/search/', {'roll': '822797'}).json()
        # Exactly one 4th-semester result, and it is the correction.
        fourth = [r for r in data['results'] if r['exam']['semester'] == 4]
        self.assertEqual(len(fourth), 1)
        codes = {s['subjectCode'] for s in fourth[0]['subjects']}
        self.assertNotIn('26843', codes)
        self.assertEqual(len(codes), 6)
        self.assertEqual(fourth[0]['exam']['publicationDate'], '2026-05-23')

    def test_institute_rank(self):
        """Passed results carry their institute-wise semester merit rank."""
        exam = Exam.objects.create(
            semester=4, regulationYear=2022, program='DIPLOMA IN ENGINEERING',
            heldIn='2025 held in January-March, 2026', publicationDate='2026-04-28',
        )
        institute = Institute.objects.create(code='57057', name='Sirajganj Poly')
        record = ResultImport.objects.create(
            fileName='r.pdf', fileSha256='11' * 32, status='completed',
        )
        for roll, gpa in [('700001', '3.80'), ('700002', '3.50'), ('700003', '3.20')]:
            row = StudentResult.objects.create(
                exam=exam, institute=institute, importRecord=record,
                rollNumber=roll, resultType='passed',
            )
            SemesterGPA.objects.create(result=row, semester=4, gpa=Decimal(gpa))

        def rank_of(roll):
            data = self.client.get('/api/results/public/search/', {'roll': roll}).json()
            r = data['results'][0]
            return r['rank'], r['rankTotal']

        self.assertEqual(rank_of('700001'), (1, 3))
        self.assertEqual(rank_of('700002'), (2, 3))
        self.assertEqual(rank_of('700003'), (3, 3))

    def test_search_is_fast(self):
        """Indexed lookup — generous CI bound, real target is <300ms."""
        started = time.monotonic()
        response = self.client.get('/api/results/public/search/', {'roll': '608617'})
        elapsed = time.monotonic() - started
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['found'])
        self.assertLess(elapsed, 1.0, f'search took {elapsed:.3f}s')
