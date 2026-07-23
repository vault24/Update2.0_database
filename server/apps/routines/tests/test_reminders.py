"""
Exam-reminder tests: countdown / day-before / exam-day windows and dedupe.

`send_due_reminders(now=...)` is driven with fixed Dhaka-local datetimes so
every window is deterministic; _notify/_email are mocked to capture sends.
"""
from datetime import date, datetime, time, timedelta
from unittest import mock
from zoneinfo import ZoneInfo

from rest_framework.test import APITestCase

from apps.departments.models import Department
from apps.results.models import Subject
from apps.routines.models import ExamReminderLog, RoutineImport, RoutineSession, RoutineSubject
from apps.routines.reminders import send_due_reminders
from apps.students.models import Student

DHAKA = ZoneInfo('Asia/Dhaka')

#: A fixed "today" anchor, 09:00 Dhaka time (past the quiet hours).
ANCHOR = datetime(2026, 8, 1, 9, 0, tzinfo=DHAKA)


class ExamReminderTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(
            name='Computer Science & Technology', code='CST',
        )
        cls.student = Student.objects.create(
            fullNameEnglish='Reminder Student', currentRollNumber='700500',
            currentRegistrationNumber='REG-700500', semester=5,
            department=cls.dept, email='reminder@example.com',
        )
        Subject.objects.create(
            code='28551', name='Application Development', semester=5,
            regulationYear=2022, technology='Computer Science & Technology',
            techCode='85',
        )
        Subject.objects.create(
            code='28552', name='Web Design', semester=5,
            regulationYear=2022, technology='Computer Science & Technology',
            techCode='85',
        )
        cls.routine = RoutineImport.objects.create(
            fileName='r.pdf', fileSha256='d' * 64, status='completed',
            examType='final', regulationYear=2022, isActive=True,
        )

    @classmethod
    def _session(cls, exam_date: date, start=time(10, 0), code='28551'):
        session = RoutineSession.objects.create(
            routine=cls.routine, section='theory', examDate=exam_date,
            weekday=exam_date.weekday(), slot='morning', startTime=start,
            durationMinutes=180, regulationYear=2022,
        )
        RoutineSubject.objects.create(session=session, subjectCode=code, serial=1)
        return session

    def _run(self, now):
        with mock.patch('apps.routines.reminders._notify') as notify, \
                mock.patch('apps.routines.reminders._email') as email:
            stats = send_due_reminders(now=now)
        return stats, notify, email

    def test_countdown_within_30_days_and_dedupe(self):
        self._session(ANCHOR.date() + timedelta(days=10))
        stats, notify, email = self._run(ANCHOR)
        self.assertEqual(stats['countdown'], 1)
        self.assertEqual(notify.call_count, 1)
        self.assertEqual(email.call_count, 1)
        self.assertIn('10 days', notify.call_args[0][1])

        # Pin the auto_now_add timestamp to the simulated clock so the
        # recency window behaves as it would in real time.
        ExamReminderLog.objects.update(sentAt=ANCHOR)

        # Second run the same day: deduped.
        stats2, notify2, _ = self._run(ANCHOR + timedelta(hours=2))
        self.assertEqual(stats2['countdown'], 0)
        self.assertEqual(notify2.call_count, 0)

        # Three days later: due again.
        stats3, _, _ = self._run(ANCHOR + timedelta(days=3, minutes=5))
        self.assertEqual(stats3['countdown'], 1)

    def test_countdown_respects_quiet_hours(self):
        self._session(ANCHOR.date() + timedelta(days=10))
        early = ANCHOR.replace(hour=6)
        stats, notify, _ = self._run(early)
        self.assertEqual(stats['countdown'], 0)
        self.assertEqual(notify.call_count, 0)

    def test_countdown_not_sent_beyond_window(self):
        self._session(ANCHOR.date() + timedelta(days=45))
        stats, _, _ = self._run(ANCHOR)
        self.assertEqual(stats['countdown'], 0)

    def test_day_before_with_checklist_and_dedupe(self):
        self._session(ANCHOR.date() + timedelta(days=1))
        stats, notify, email = self._run(ANCHOR)
        self.assertEqual(stats['day_before'], 1)
        self.assertIn('Tomorrow', notify.call_args[0][1])
        # The email carries the preparation checklist.
        self.assertTrue(email.call_args.kwargs.get('bullets'))

        stats2, _, _ = self._run(ANCHOR + timedelta(hours=3))
        self.assertEqual(stats2['day_before'], 0)

    def test_exam_day_three_hour_window(self):
        self._session(ANCHOR.date(), start=time(10, 0))

        # 06:30 — more than 3.5h before: nothing.
        stats, _, _ = self._run(ANCHOR.replace(hour=6, minute=30))
        self.assertEqual(stats['exam_day'], 0)

        # 07:30 — inside the 3h window (quiet hours do not delay it).
        stats2, notify2, _ = self._run(ANCHOR.replace(hour=7, minute=30))
        self.assertEqual(stats2['exam_day'], 1)
        self.assertIn('get ready', notify2.call_args[0][1].lower())

        # 09:00 — still inside, but already sent: deduped.
        stats3, _, _ = self._run(ANCHOR)
        self.assertEqual(stats3['exam_day'], 0)
        self.assertEqual(ExamReminderLog.objects.filter(kind='exam_day').count(), 1)

        # After the start time: never sent late.
        ExamReminderLog.objects.all().delete()
        stats4, _, _ = self._run(ANCHOR.replace(hour=10, minute=30))
        self.assertEqual(stats4['exam_day'], 0)

    def test_no_routine_or_no_upcoming_sessions(self):
        stats, _, _ = self._run(ANCHOR)
        self.assertEqual(sum(stats.values()), 0)

        # Sessions exist but are all in the past.
        self._session(ANCHOR.date() - timedelta(days=5))
        stats2, _, _ = self._run(ANCHOR)
        self.assertEqual(sum(stats2.values()), 0)

    def test_dry_run_sends_and_logs_nothing(self):
        self._session(ANCHOR.date() + timedelta(days=1))
        with mock.patch('apps.routines.reminders._notify') as notify:
            stats = send_due_reminders(now=ANCHOR, dry_run=True)
        self.assertEqual(stats['day_before'], 1)
        self.assertEqual(notify.call_count, 0)
        self.assertEqual(ExamReminderLog.objects.count(), 0)

    def test_multiple_exams_same_student(self):
        # Exam tomorrow AND another in 5 days: day_before fires, countdown
        # does not (the first exam is tomorrow — already covered).
        self._session(ANCHOR.date() + timedelta(days=1), code='28551')
        self._session(ANCHOR.date() + timedelta(days=5), code='28552')
        stats, _, _ = self._run(ANCHOR)
        self.assertEqual(stats['day_before'], 1)
        self.assertEqual(stats['countdown'], 0)
