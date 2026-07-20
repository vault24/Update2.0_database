"""
Importer and student-sync tests.

The importer is exercised with the synthetic ParseOutcome (parse_result_pdf
patched) so tests stay fast and PDF-free; sync tests build ORM rows directly.
"""
from decimal import Decimal
from unittest import mock

from django.test import TestCase

from apps.departments.models import Department
from apps.results.importer import AlreadyImportedError, import_result_pdf
from apps.results.models import (
    Exam,
    Institute,
    ParserIssue,
    ResultImport,
    ResultSubject,
    SemesterGPA,
    StudentResult,
)
from apps.results.sync import sync_student
from apps.students.models import Student

from .fixtures import parse_standard

_PARSE = 'apps.results.importer.parse_result_pdf'


class ImporterTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.outcome = parse_standard()

    def _import(self, payload=b'pdf-1', name='test.pdf', replace=False):
        with mock.patch(_PARSE, return_value=self.outcome):
            return import_result_pdf(
                file_bytes=payload, file_name=name, replace=replace,
            )

    def test_full_import(self):
        record = self._import()
        self.assertEqual(record.status, 'completed')
        self.assertEqual(record.stats['recordCount'], 8)
        self.assertEqual(record.stats['instituteCount'], 2)
        self.assertEqual(Exam.objects.count(), 1)
        self.assertEqual(Institute.objects.count(), 2)
        self.assertEqual(StudentResult.objects.count(), 8)
        # 5 (passed) + 5 (referred) + 8 (cgpa history) semester rows
        self.assertEqual(SemesterGPA.objects.count(), 18)
        self.assertEqual(
            ResultSubject.objects.filter(role='continuous_fail').count(), 1,
        )
        # info-level issues (bare expelled roll) are persisted for the admin
        self.assertTrue(ParserIssue.objects.filter(code='bare-expelled-roll').exists())

        exam = Exam.objects.get()
        self.assertEqual(exam.semester, 5)
        self.assertEqual(exam.regulationYear, 2022)
        self.assertEqual(str(exam.publicationDate), '2026-04-28')

    def test_same_file_rejected_then_replaced(self):
        self._import()
        with self.assertRaises(AlreadyImportedError):
            self._import()
        record = self._import(replace=True)
        self.assertEqual(record.status, 'completed')
        self.assertEqual(ResultImport.objects.count(), 1)
        self.assertEqual(StudentResult.objects.count(), 8)

    def test_republished_notice_replaces_rolls(self):
        """A different file for the same exam overwrites overlapping rolls."""
        self._import(payload=b'pdf-1')
        record = self._import(payload=b'pdf-2', name='corrected.pdf')
        self.assertEqual(record.stats['replacedExisting'], 8)
        self.assertEqual(StudentResult.objects.count(), 8)  # no duplicates
        self.assertEqual(Exam.objects.count(), 1)

    def test_failed_parse_recorded(self):
        with mock.patch(_PARSE, side_effect=RuntimeError('boom')):
            with self.assertRaises(RuntimeError):
                import_result_pdf(file_bytes=b'x', file_name='broken.pdf')
        record = ResultImport.objects.get()
        self.assertEqual(record.status, 'failed')
        self.assertIn('boom', record.errorMessage)


class SyncTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CST')
        cls.exam5 = Exam.objects.create(
            semester=5, regulationYear=2022, program='DIPLOMA IN ENGINEERING',
            heldIn='2025 held in January-March, 2026',
        )
        cls.exam8 = Exam.objects.create(
            semester=8, regulationYear=2022, program='DIPLOMA IN ENGINEERING',
            heldIn='2025 held in January-March, 2026',
        )
        cls.institute = Institute.objects.create(code='99001', name='Testville')
        cls.import5 = ResultImport.objects.create(
            fileName='5th.pdf', fileSha256='a' * 64, status='completed',
        )
        cls.import8 = ResultImport.objects.create(
            fileName='8th.pdf', fileSha256='b' * 64, status='completed',
        )

    def _student(self, roll, semester=5):
        return Student.objects.create(
            fullNameEnglish=f'Student {roll}',
            currentRollNumber=roll,
            currentRegistrationNumber=f'REG-{roll}',
            semester=semester,
            department=self.dept,
        )

    def _result(self, exam, imp, roll, rtype, cgpa=None, grades=(), subjects=()):
        result = StudentResult.objects.create(
            exam=exam, institute=self.institute, importRecord=imp,
            rollNumber=roll, resultType=rtype, cgpa=cgpa,
        )
        for semester, gpa in grades:
            SemesterGPA.objects.create(
                result=result, semester=semester,
                gpa=None if gpa == 'ref' else Decimal(gpa),
                isReferred=gpa == 'ref',
            )
        for code, theory, practical in subjects:
            ResultSubject.objects.create(
                result=result, subjectCode=code,
                hasTheory=theory, hasPractical=practical,
            )
        return result

    def test_passed_result_updates_profile(self):
        self._result(
            self.exam5, self.import5, '700001', 'passed',
            grades=[(5, '3.36'), (4, '3.27'), (3, '3.45'), (2, '3.12'), (1, '3.23')],
        )
        # Creating the student triggers the auto-sync signal (results already
        # imported for this roll), so the profile is synced immediately.
        student = self._student('700001', semester=5)
        student.refresh_from_db()
        self.assertEqual(student.semester, 6)  # auto-promoted
        by_semester = {e['semester']: e for e in student.semesterResults}
        self.assertEqual(by_semester[5]['gpa'], 3.36)
        self.assertEqual(by_semester[5]['resultType'], 'gpa')
        self.assertIsNone(student.finalCgpa)

    def test_referred_then_cleared(self):
        """5th-sem referred entry is replaced once the 8th-sem history
        publishes a numeric GPA for semester 5."""
        self._result(
            self.exam5, self.import5, '700002', 'referred',
            grades=[(5, 'ref'), (4, '3.00'), (3, '3.10'), (2, '3.20'), (1, '3.30')],
            subjects=[('28551', True, False)],
        )
        student = self._student('700002', semester=5)
        sync_student(student)
        student.refresh_from_db()
        by_semester = {e['semester']: e for e in student.semesterResults}
        self.assertEqual(by_semester[5]['referredSubjects'], ['28551(T)'])

        self._result(
            self.exam8, self.import8, '700002', 'passed', cgpa=Decimal('3.25'),
            grades=[(8, '3.50'), (7, '3.40'), (6, '3.30'), (5, '3.20'),
                    (4, '3.00'), (3, '3.10'), (2, '3.20'), (1, '3.30')],
        )
        sync_student(student)
        student.refresh_from_db()
        by_semester = {e['semester']: e for e in student.semesterResults}
        self.assertEqual(by_semester[5], {'semester': 5, 'resultType': 'gpa', 'gpa': 3.2})
        self.assertEqual(student.finalCgpa, Decimal('3.25'))
        self.assertEqual(student.semester, 8)

    def test_unmatched_roll_changes_nothing(self):
        student = self._student('999999')
        self.assertFalse(sync_student(student))

    def test_sync_is_idempotent(self):
        self._result(
            self.exam5, self.import5, '700003', 'passed',
            grades=[(5, '3.00'), (4, '3.00'), (3, '3.00'), (2, '3.00'), (1, '3.00')],
        )
        student = self._student('700003')  # auto-synced on create
        student.refresh_from_db()
        self.assertTrue(student.semesterResults)
        self.assertFalse(sync_student(student))

    def test_roll_edit_triggers_resync(self):
        """Admin fixes a wrong roll — imported results attach immediately."""
        self._result(
            self.exam8, self.import8, '700004', 'passed', cgpa=Decimal('3.40'),
            grades=[(8, '3.40')],
        )
        student = self._student('111111', semester=8)  # wrong roll, no results
        student.refresh_from_db()
        self.assertFalse(student.semesterResults)

        student.currentRollNumber = '700004'
        student.save()
        student.refresh_from_db()
        self.assertEqual(student.finalCgpa, Decimal('3.40'))
        by_semester = {e['semester']: e for e in student.semesterResults}
        self.assertEqual(by_semester[8]['gpa'], 3.4)

    def test_sync_sends_result_email(self):
        from django.core import mail

        self._result(
            self.exam5, self.import5, '700005', 'referred',
            grades=[(5, 'ref'), (4, '3.00'), (3, '3.00'), (2, '3.00'), (1, '3.00')],
            subjects=[('28551', True, False)],
        )
        # No email address yet — the auto-sync on create has no recipients.
        student = Student.objects.create(
            fullNameEnglish='Email Test Student',
            currentRollNumber='700005',
            currentRegistrationNumber='REG-700005',
            semester=5,
            department=self.dept,
        )
        student.refresh_from_db()
        # Reset the synced state without re-triggering the signal, then sync
        # explicitly with a synchronous email send.
        student.email = 'result-test@example.com'
        student.semesterResults = []
        student._result_sync_in_progress = True
        student.save()
        student._result_sync_in_progress = False
        mail.outbox.clear()
        self.assertTrue(sync_student(student, email_async=False))
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertIn('result', message.subject.lower())
        self.assertIn('result-test@example.com', message.to)
        self.assertIn('28551(T)', message.body)
