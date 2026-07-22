"""
Subject-catalog tests: Probidhan PDF parser, admin import endpoint, and
search-payload enrichment (subject name / credit / marks beside each code).
"""
from unittest import mock

from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import User
from apps.results.models import (
    Exam,
    Institute,
    ResultImport,
    ResultSubject,
    StudentResult,
    Subject,
)
from apps.results.parsing.extraction import PageText
from apps.results.parsing.subjects import parse_subject_pdf

#: Synthetic course-structure page reproducing every observed hazard:
#: wrapped subject name, "-" placeholders, a row with a missing token
#: (no practical periods), the numbers-only totals row and the percent row.
PROBIDHAN_PAGE = """Course Structure of Diploma in Engineering Probidhan-2022 (Computer Allied)
 Name of Technology: Computer Science and Technology
Computer Science & Technology (85) 3rd Semester
Code Name Theory Practical Continuous Final Total Continuous Final Total
1 25931 Mathematics-III 3              3            4        60               90       150      25               25    50        200
2 28531 Application Development Using Python 2              3            3        40               60       100      25               25    50        150
3 25812 Physical Education & Life skills
Development -               3            1        -                  -          -           25               25    50        50
4 25851 Principles of Marketing 2              2        40               60       100      -                  -       -           100
14            21          21      280             420     700      175             175  350      1050
40.0% 60.0%
"""


class FakeExtractor:
    def __init__(self, pages):
        self._pages = pages

    def extract_pages(self, source):
        return [PageText(number=i + 1, text=t) for i, t in enumerate(self._pages)]


class SubjectParserTests(APITestCase):
    def test_parses_synthetic_page(self):
        outcome = parse_subject_pdf(b'', extractor=FakeExtractor([PROBIDHAN_PAGE]))
        self.assertEqual(outcome.technology, 'Computer Science & Technology')
        self.assertEqual(outcome.tech_code, '85')
        self.assertEqual(outcome.regulation_year, 2022)
        self.assertEqual(outcome.semesters, [3])
        self.assertEqual(len(outcome.subjects), 4)
        self.assertEqual(outcome.issues, [])

        by_code = {s.code: s for s in outcome.subjects}
        math = by_code['25931']
        self.assertEqual(math.name, 'Mathematics-III')
        self.assertEqual((math.credit, math.theory_total, math.total_marks), (4, 150, 200))

        wrapped = by_code['25812']
        self.assertEqual(wrapped.name, 'Physical Education & Life skills Development')
        self.assertEqual(wrapped.total_marks, 50)
        self.assertIsNone(wrapped.theory_total)

        # Missing practical-periods token: aligned from the end.
        marketing = by_code['25851']
        self.assertEqual(marketing.credit, 2)
        self.assertIsNone(marketing.practical_periods)
        self.assertEqual(marketing.total_marks, 100)

        # The totals row (280 420 700 …) must not leak into the last subject.
        self.assertEqual(marketing.theory_total, 100)

    def test_rejects_wrong_document(self):
        outcome = parse_subject_pdf(b'', extractor=FakeExtractor(['Random text page']))
        self.assertEqual(outcome.subjects, [])
        self.assertEqual(outcome.issues[0].code, 'no-subject-sections')

    def test_wide_layout_with_extra_columns(self):
        """The newer 7-semester technologies print a variable number of
        extra columns AFTER the Grand Total ('… 150 - - - - 3') and fuse
        tokens during extraction ('27372AI…', '…Sensing2 3 3 …'). Names
        must come out clean and marks aligned by their arithmetic."""
        page = (
            'Course Structure of Diploma in Engineering Probidhan-2022\n'
            'Land Resource Survey & Environment Technology (74) 4th Semester\n'
            '5 27441 Environmental Surveying and Monitoring 2 3 3 40 60 100'
            ' 25 25 50 150 - - - - 3\n'
            '6 27564 Topographical Map Project 6 2 - - - 50 50 100 100 - - - 2\n'
            '3 27371 Photogramtery & Remote Sensing Project - 6 2 - - - 50 50'
            ' 100 100 - - - - 2\n'
            '4 27372AI for Photogrammetry & Remote Sensing2 3 3 40 60 100'
            ' 25 25 50 150 - - - 3\n'
        )
        outcome = parse_subject_pdf(b'', extractor=FakeExtractor([page]))
        by_code = {s.code: s for s in outcome.subjects}
        self.assertEqual(len(by_code), 4)

        env = by_code['27441']
        self.assertEqual(env.name, 'Environmental Surveying and Monitoring')
        self.assertEqual((env.theory_periods, env.practical_periods, env.credit),
                         (2, 3, 3))
        self.assertEqual((env.theory_total, env.practical_total, env.total_marks),
                         (100, 50, 150))

        # Omitted theory-periods token + trailing extras.
        topo = by_code['27564']
        self.assertEqual(topo.name, 'Topographical Map Project')
        self.assertEqual(topo.credit, 2)
        self.assertEqual((topo.practical_total, topo.total_marks), (100, 100))

        # Practical-only project ("- 6 2" head).
        proj = by_code['27371']
        self.assertEqual(proj.name, 'Photogramtery & Remote Sensing Project')
        self.assertEqual(proj.credit, 2)
        self.assertEqual((proj.practical_total, proj.total_marks), (100, 100))

        # Fused code+name and name+digit.
        ai = by_code['27372']
        self.assertEqual(ai.name, 'AI for Photogrammetry & Remote Sensing')
        self.assertEqual((ai.theory_total, ai.total_marks), (100, 150))


class SubjectApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username='subjectadmin', email='sa@x.com', password='pw',
            role='registrar', account_status='active',
        )

    def test_import_endpoint(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_authenticate(self.admin)
        outcome = parse_subject_pdf(b'', extractor=FakeExtractor([PROBIDHAN_PAGE]))
        with mock.patch(
            'apps.results.parsing.subjects.parse_subject_pdf', return_value=outcome,
        ):
            response = self.client.post(
                '/api/results/subjects/import/',
                {'file': SimpleUploadedFile('85-CS.pdf', b'%PDF-1.4 stub')},
                format='multipart',
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        data = response.json()
        self.assertEqual(data['created'], 4)
        self.assertEqual(data['technology'], 'Computer Science & Technology')
        self.assertEqual(Subject.objects.count(), 4)

        # Re-import updates in place — no duplicates.
        with mock.patch(
            'apps.results.parsing.subjects.parse_subject_pdf', return_value=outcome,
        ):
            response = self.client.post(
                '/api/results/subjects/import/',
                {'file': SimpleUploadedFile('85-CS.pdf', b'%PDF-1.4 stub')},
                format='multipart',
            )
        self.assertEqual(response.json()['updated'], 4)
        self.assertEqual(Subject.objects.count(), 4)

        stats = self.client.get('/api/results/subjects/stats/').json()
        self.assertEqual(stats['totalSubjects'], 4)
        self.assertEqual(stats['technologies'][0]['techCode'], '85')

    def test_import_denied_for_students(self):
        student = User.objects.create_user(
            username='subjstudent', email='sj@x.com', password='pw',
            role='student', account_status='active',
        )
        self.client.force_authenticate(student)
        response = self.client.post('/api/results/subjects/import/', {})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SearchEnrichmentTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        Subject.objects.create(
            code='25931', name='Mathematics-III', semester=3, regulationYear=2022,
            credit=4, theoryContinuous=60, theoryFinal=90, theoryTotal=150,
            practicalContinuous=25, practicalFinal=25, practicalTotal=50,
            totalMarks=200, technology='Computer Science & Technology',
        )
        exam = Exam.objects.create(
            semester=4, regulationYear=2022, program='DIPLOMA IN ENGINEERING',
            heldIn='2025 held in January-March, 2026',
        )
        institute = Institute.objects.create(code='57057', name='Sirajganj Polytechnic')
        record = ResultImport.objects.create(
            fileName='4th.pdf', fileSha256='f' * 64, status='completed',
        )
        result = StudentResult.objects.create(
            exam=exam, institute=institute, importRecord=record,
            rollNumber='830577', resultType='referred',
        )
        ResultSubject.objects.create(result=result, subjectCode='25931', hasTheory=True)
        ResultSubject.objects.create(result=result, subjectCode='99999', hasTheory=True)

    def test_public_search_includes_subject_info(self):
        response = self.client.get('/api/results/public/search/', {'roll': '830577'})
        subjects = response.json()['results'][0]['subjects']
        by_code = {s['subjectCode']: s for s in subjects}

        info = by_code['25931']['info']
        self.assertEqual(info['name'], 'Mathematics-III')
        self.assertEqual(info['semester'], 3)
        self.assertEqual(info['credit'], 4)
        self.assertEqual(info['totalMarks'], 200)
        self.assertEqual(info['theoryFinal'], 90)

        # Unknown codes stay usable with info: null.
        self.assertIsNone(by_code['99999']['info'])
