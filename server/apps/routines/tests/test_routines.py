"""
Routine module tests: parser, importer, personalized generation, API.

The parser is exercised on synthetic routine text (Django-free); generation
and the API use ORM fixtures that reuse the shared Subject + Result models.
"""
from datetime import date, time

from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import User
from apps.departments.models import Department
from apps.results.models import (
    Exam,
    Institute,
    ResultImport,
    ResultSubject,
    StudentResult,
    Subject,
)
from apps.routines.generation import generate_for_student, resolve_tech_code
from apps.routines.models import (
    RoutineImport,
    RoutineSession,
    RoutineSubject,
)
from apps.routines.parsing.extraction_stub import FakeExtractor
from apps.routines.parsing import parse_routine_pdf
from apps.students.models import Student

# Synthetic routine page: metadata + two sessions (theory), Bengali digits.
ROUTINE_TEXT = """বাংলাদেশ কারিগরি শিক্ষা বোর্ড
Memo No. ৫৭.১৭.০০০০.৩০১.৩১.০০২.২৪.২৬.৩২৬
পরীক্ষা-২০২৫
(ক) ২০২২ প্রবিধানের তত্ত্বীয় বিষয়ে লিখিত পরীক্ষার সময়সূচি:
1
06-08-2026
বৃহস্পতিবার
সকাল 10:00
৫ম পর্ব (২০২২ প্রবিধান)
1 28551 এপ্লিকেশন ডেভেলপমেন্ট ৫ম পর্ব: কম্পিউটার সায়েন্স
2 28552 ওয়েব ডিজাইন ৫ম পর্ব: কম্পিউটার সায়েন্স
2
13-08-2026
বৃহস্পতিবার
বিকাল 2:00
৪র্থ পর্ব (২০২২ প্রবিধান)
1 28541 জাভা প্রোগ্রামিং ৪র্থ পর্ব: কম্পিউটার সায়েন্স
(খ) ব্যবহারিক সমাপনী পরীক্ষার সময়সূচি:
২য় পর্ব: ০১-০৪ আগস্ট ২০২৬
"""


class RoutineParserTests(APITestCase):
    def test_parses_synthetic_routine(self):
        outcome = parse_routine_pdf(b'', extractor=FakeExtractor([ROUTINE_TEXT]))
        self.assertEqual(outcome.meta.regulation_year, 2022)
        # Digits are normalized to Latin during parsing.
        self.assertEqual(outcome.meta.exam_session, 'পরীক্ষা-2025')
        self.assertEqual(len(outcome.sessions), 2)
        self.assertEqual(len(outcome.subjects), 3)

        first = outcome.sessions[0]
        self.assertEqual(first.exam_date, date(2026, 8, 6))
        self.assertEqual(first.start_time, time(10, 0))
        self.assertEqual(first.weekday, date(2026, 8, 6).weekday())
        self.assertEqual({s.subject_code for s in first.subjects}, {'28551', '28552'})

        second = outcome.sessions[1]
        self.assertEqual(second.start_time, time(14, 0))  # বিকাল 2:00 → 14:00
        self.assertEqual([s.subject_code for s in second.subjects], ['28541'])

        # Practical (খ) has no per-subject rows → no extra sessions.
        codes = [s.subject_code for s in outcome.subjects]
        self.assertEqual(len(codes), len(set(codes)))  # globally unique
        self.assertFalse([i for i in outcome.issues if i.severity == 'error'])

    def test_afternoon_time_is_word_independent(self):
        """The Bengali time word is font-mangled in real PDFs (বিকাল →
        'মবকাল'), so the slot must come from the numeric value alone: an
        hour of 1–7 is the afternoon slot (→ +12h)."""
        text = ROUTINE_TEXT.replace('বিকাল 2:00', 'মবকাল 2:00')
        outcome = parse_routine_pdf(b'', extractor=FakeExtractor([text]))
        second = outcome.sessions[1]
        self.assertEqual(second.start_time, time(14, 0))
        self.assertEqual(second.slot, 'afternoon')


class RoutineGenerationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(
            name='Computer Science & Technology', code='CST',
        )
        # Subject catalog (source of truth): CS (85) sem-5 subjects + a sem-3.
        for code, name, sem in [
            ('28551', 'Application Development Using Java', 5),
            ('28552', 'Web Design & Development-II', 5),
            ('25931', 'Mathematics-III', 3),
        ]:
            Subject.objects.create(
                code=code, name=name, semester=sem, regulationYear=2022,
                technology='Computer Science & Technology', techCode='85',
            )

        # Imported routine with matching + non-matching codes.
        cls.routine = RoutineImport.objects.create(
            fileName='r.pdf', fileSha256='a' * 64, status='completed',
            examType='final', regulationYear=2022, isActive=True,
        )

        def sess(d, t, slot='morning'):
            return RoutineSession.objects.create(
                routine=cls.routine, section='theory', examDate=d,
                weekday=d.weekday(), slot=slot, startTime=t, durationMinutes=180,
                regulationYear=2022,
            )

        s1 = sess(date(2026, 8, 6), time(10, 0))
        s2 = sess(date(2026, 8, 13), time(10, 0))
        s3 = sess(date(2026, 8, 20), time(10, 0))
        s4 = sess(date(2026, 8, 27), time(10, 0))
        RoutineSubject.objects.create(session=s1, subjectCode='28551', serial=1)
        RoutineSubject.objects.create(session=s2, subjectCode='28552', serial=1)
        RoutineSubject.objects.create(session=s3, subjectCode='25931', serial=1)  # referred
        RoutineSubject.objects.create(session=s4, subjectCode='99999', serial=1)  # unrelated

    def _student(self, semester=5):
        return Student.objects.create(
            fullNameEnglish='Routine Student', currentRollNumber='700100',
            currentRegistrationNumber='REG-700100', semester=semester,
            department=self.dept,
        )

    def test_resolve_tech_code(self):
        self.assertEqual(resolve_tech_code(self.dept), '85')

    def test_regular_subjects_only(self):
        student = self._student(semester=5)
        payload = generate_for_student(student, 'final')
        self.assertTrue(payload['available'])
        self.assertTrue(payload['technologyResolved'])
        codes = [e['subjectCode'] for e in payload['exams']]
        # Sem-5 regular subjects that appear in the routine; not 25931 or 99999.
        self.assertEqual(sorted(codes), ['28551', '28552'])
        self.assertEqual(payload['exams'][0]['subjectName'], 'Application Development Using Java')
        self.assertEqual(payload['exams'][0]['weekday'], 'Thursday')
        self.assertEqual(payload['exams'][0]['endTime'], '13:00')  # 3h duration
        self.assertFalse(any(e['isReferred'] for e in payload['exams']))

    def test_referred_subject_included_and_flagged(self):
        student = self._student(semester=5)
        # A referred 25931 (Math-III) from a prior result.
        institute = Institute.objects.create(code='57057', name='SPI')
        record = ResultImport.objects.create(
            fileName='res.pdf', fileSha256='b' * 64, status='completed',
        )
        exam = Exam.objects.create(
            semester=3, regulationYear=2022, program='DIPLOMA IN ENGINEERING',
            heldIn='x',
        )
        result = StudentResult.objects.create(
            exam=exam, institute=institute, importRecord=record,
            rollNumber='700100', resultType='referred',
        )
        ResultSubject.objects.create(result=result, subjectCode='25931', hasTheory=True)

        payload = generate_for_student(student, 'final')
        by_code = {e['subjectCode']: e for e in payload['exams']}
        self.assertIn('25931', by_code)
        self.assertTrue(by_code['25931']['isReferred'])
        self.assertFalse(by_code['28551']['isReferred'])
        self.assertEqual(payload['referredCount'], 1)
        self.assertEqual(payload['regularCount'], 2)
        # Chronological order preserved.
        dates = [e['date'] for e in payload['exams']]
        self.assertEqual(dates, sorted(dates))

    def test_no_active_routine(self):
        self.routine.isActive = False
        self.routine.save()
        payload = generate_for_student(self._student(), 'final')
        self.assertFalse(payload['available'])
        self.assertEqual(payload['reason'], 'no-routine')

    def test_shared_subject_uses_own_technology_semester(self):
        """A common subject (e.g. Accounting) that also belongs to another
        technology at a different semester must still appear for THIS
        technology's semester — the per-technology catalog row is used."""
        # 28551 is a CS sem-5 subject; also register it (same code) under
        # another technology at sem 3. The CS-5 student must still get it.
        Subject.objects.create(
            code='28551', name='Application Development Using Java', semester=3,
            regulationYear=2022, technology='Some Other Technology', techCode='99',
        )
        payload = generate_for_student(self._student(semester=5), 'final')
        codes = [e['subjectCode'] for e in payload['exams']]
        self.assertIn('28551', codes)  # not lost to the other-tech row


class PublicRoutineApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer Science & Technology', code='CST')
        Subject.objects.create(
            code='28551', name='Application Development Using Java', semester=5,
            regulationYear=2022, technology='Computer Science & Technology', techCode='85',
        )
        cls.routine = RoutineImport.objects.create(
            fileName='r.pdf', fileSha256='c' * 64, status='completed',
            examType='final', regulationYear=2022, isActive=True,
        )
        s = RoutineSession.objects.create(
            routine=cls.routine, section='theory', examDate=date(2026, 8, 6),
            weekday=date(2026, 8, 6).weekday(), slot='morning', startTime=time(10, 0),
            durationMinutes=180, regulationYear=2022,
        )
        RoutineSubject.objects.create(session=s, subjectCode='28551', serial=1)
        cls.student = Student.objects.create(
            fullNameEnglish='Enrolled', currentRollNumber='700300',
            currentRegistrationNumber='REG-700300', semester=5, department=cls.dept,
        )

    def test_public_routine_enrolled(self):
        response = self.client.get('/api/routines/public/my/?roll=700300')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data['available'])
        self.assertEqual(data['source'], 'enrolled')
        self.assertEqual([e['subjectCode'] for e in data['exams']], ['28551'])

    def test_public_routine_rejects_bad_roll(self):
        self.assertEqual(
            self.client.get('/api/routines/public/my/?roll=abc').status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_public_routine_unknown_roll(self):
        response = self.client.get('/api/routines/public/my/?roll=999999')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()['available'])

    def test_public_routine_selected_tech_semester(self):
        """The department + semester picker builds an exact routine for ANY
        roll (enrolled or not) from the per-technology Subject catalog."""
        response = self.client.get(
            '/api/routines/public/my/?roll=999999&tech=85&semester=5',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data['available'])
        self.assertEqual(data['source'], 'selected')
        self.assertEqual([e['subjectCode'] for e in data['exams']], ['28551'])

    def test_public_technologies_list(self):
        response = self.client.get('/api/routines/public/technologies/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['regulationYear'], 2022)
        self.assertEqual(data['semesters'], list(range(1, 9)))
        codes = {t['techCode'] for t in data['technologies']}
        self.assertIn('85', codes)


class RoutineApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CST')
        cls.student = Student.objects.create(
            fullNameEnglish='API Student', currentRollNumber='700200',
            currentRegistrationNumber='REG-700200', semester=5, department=cls.dept,
        )
        cls.student_user = User.objects.create_user(
            username='routinestudent', email='rs@x.com', password='pw',
            role='student', related_profile_id=cls.student.id, account_status='active',
        )
        cls.admin = User.objects.create_user(
            username='routineadmin', email='ra@x.com', password='pw',
            role='registrar', account_status='active',
        )

    def test_my_routine_requires_auth(self):
        self.assertEqual(self.client.get('/api/routines/my/').status_code,
                         status.HTTP_403_FORBIDDEN)

    def test_my_routine_for_student(self):
        self.client.force_authenticate(self.student_user)
        response = self.client.get('/api/routines/my/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['student']['roll'], '700200')

    def test_imports_denied_for_students(self):
        self.client.force_authenticate(self.student_user)
        self.assertEqual(self.client.get('/api/routines/imports/').status_code,
                         status.HTTP_403_FORBIDDEN)

    def test_imports_history_for_admin(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get('/api/routines/imports/').status_code,
                         status.HTTP_200_OK)

    def test_upload_rejects_non_pdf(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            '/api/routines/imports/',
            {'file': SimpleUploadedFile('x.txt', b'hi')}, format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
