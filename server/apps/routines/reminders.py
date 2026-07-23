"""
Automatic exam reminders — notification + email, three kinds:

  countdown   from 30 days before a student's FIRST exam, every 3 days
  day_before  the day before each exam, with a preparation checklist
  exam_day    ~3 hours before an exam starts ("get ready")

Designed to be driven by an HOURLY scheduler (`manage.py send_exam_reminders`
via cron/systemd timer). Every send is recorded in ExamReminderLog, so the
command is idempotent — running it more often never double-sends:

  countdown   → at most once per 3 days per student (sent from 08:00 local)
  day_before  → once per (student, exam)            (sent from 08:00 local)
  exam_day    → once per (student, exam), inside the [start-3h, start) window

All times are Bangladesh local time (exam dates/times in the routine are
naive local values), regardless of the server timezone.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone

from apps.students.models import Student

from .generation import active_routine, generate_for_student
from .models import ExamReminderLog

logger = logging.getLogger(__name__)

DHAKA = ZoneInfo('Asia/Dhaka')

#: Reminders start this many days before the student's first exam.
COUNTDOWN_WINDOW_DAYS = 30
#: Minimum gap between two countdown reminders.
COUNTDOWN_EVERY_DAYS = 3
#: Countdown / day-before reminders are only sent from this local hour on
#: (nobody wants a "study!" email at 1 AM).
QUIET_UNTIL_HOUR = 8
#: The exam-day ping fires within this many hours before the start time.
EXAM_DAY_LEAD_HOURS = 3

DAY_BEFORE_CHECKLIST = [
    'Verify the exam time, date and seat plan from the official notice',
    'Keep your admit card, registration card and ID ready',
    'Pack pens, pencils, scale and calculator (if allowed)',
    'Revise the key topics lightly — no all-nighters',
    'Set an alarm and plan to reach the centre 30+ minutes early',
    'Go to bed early and eat a proper meal',
]

EXAM_DAY_TIPS = [
    'Take your admit card, registration card and ID',
    'Carry spare pens and the allowed instruments',
    'Leave early — plan for traffic and reach 30 minutes before',
    'Stay calm; skim your summary notes, not new topics',
]


def _bd_now():
    return timezone.now().astimezone(DHAKA)


def _portal_users(student):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return list(User.objects.filter(
        related_profile_id=student.id, role__in=['student', 'captain'],
    ))


def _notify(student, title, message, data):
    """In-app + web-push notification (best-effort)."""
    try:
        from apps.notifications.services import NotificationService

        for user in _portal_users(student):
            NotificationService.create_notification(
                recipient=user,
                notification_type='deadline_reminder',
                title=title,
                message=message,
                data=data,
            )
    except Exception:
        logger.exception('Exam reminder notification failed for %s', student.pk)


def _email(student, subject, heading, intro, details, bullets=None,
           bullets_title=None, closing=None):
    """Branded reminder email (best-effort; honours the email opt-out)."""
    try:
        from apps.notifications.dispatch import student_portal_url
        from apps.notifications.email_service import send_branded_email

        recipients = {student.email}
        for user in _portal_users(student):
            recipients.add(user.email)
        recipients = [e for e in recipients if e]
        if not recipients:
            return

        sections = None
        if bullets:
            sections = [{'title': bullets_title or 'Checklist',
                         'bullets': bullets}]

        send_branded_email(
            subject,
            recipients,
            heading=heading,
            greeting=f'Dear {student.fullNameEnglish},',
            intro=intro,
            details=details,
            sections=sections,
            cta_label='View Exam Routine',
            cta_url=student_portal_url('/dashboard/exam-routine'),
            accent_label='Exam Reminder',
            accent_color='#d97706',
            accent_soft='#fffbeb',
            closing=closing or (
                'This is a system-generated reminder — always double-check '
                'dates and times against the official BTEB notice.'
            ),
            async_send=False,
        )
    except Exception:
        logger.exception('Exam reminder email failed for %s', student.pk)


def _fmt_date(iso: str) -> str:
    return datetime.strptime(iso, '%Y-%m-%d').strftime('%d %b %Y')


def _fmt_time(hhmm: str) -> str:
    h, m = (int(x) for x in hhmm.split(':'))
    period = 'PM' if h >= 12 else 'AM'
    return f'{h % 12 or 12}:{m:02d} {period}'


def send_due_reminders(now=None, dry_run: bool = False) -> dict:
    """Send every reminder that is due right now. Returns stats.

    ``dry_run`` counts what WOULD be sent without sending or logging.
    """
    now = now.astimezone(DHAKA) if now else _bd_now()
    today: date = now.date()
    stats = {'countdown': 0, 'day_before': 0, 'exam_day': 0, 'students': 0}

    routine = active_routine('final')
    if routine is None:
        return stats

    # Cheap global gate: any exam still ahead within the countdown window?
    from .models import RoutineSession

    horizon = today + timedelta(days=COUNTDOWN_WINDOW_DAYS)
    if not RoutineSession.objects.filter(
        routine=routine, examDate__gte=today, examDate__lte=horizon,
    ).exists():
        return stats

    students = (
        Student.objects.select_related('department')
        .filter(currentRollNumber__gt='')
        .exclude(semester__isnull=True)
    )

    for student in students.iterator():
        try:
            sent = _process_student(student, routine, now, today, dry_run)
        except Exception:
            logger.exception('Exam reminders failed for student %s', student.pk)
            continue
        if sent:
            stats['students'] += 1
            for kind in sent:
                stats[kind] += 1
    return stats


def _process_student(student, routine, now, today, dry_run=False) -> list[str]:
    payload = generate_for_student(student, 'final')
    exams = [e for e in (payload.get('exams') or [])
             if e['date'] >= today.isoformat()]
    if not exams:
        return []

    sent: list[str] = []
    first = exams[0]
    days_to_first = (date.fromisoformat(first['date']) - today).days

    # -- exam_day: within 3 hours of a start time today -----------------
    for exam in exams:
        if exam['date'] != today.isoformat():
            continue
        h, m = (int(x) for x in exam['startTime'].split(':'))
        start = now.replace(hour=h, minute=m, second=0, microsecond=0)
        if not (start - timedelta(hours=EXAM_DAY_LEAD_HOURS) <= now < start):
            continue
        if ExamReminderLog.objects.filter(
            student=student, kind='exam_day',
            subjectCode=exam['subjectCode'], examDate=exam['date'],
        ).exists():
            continue
        if dry_run:
            sent.append('exam_day')
            continue
        when = _fmt_time(exam['startTime'])
        _notify(
            student,
            f'Exam today at {when} — get ready!',
            f"{exam['subjectName']} ({exam['subjectCode']}) starts at {when}. "
            'Take your admit card and pens, and leave early to reach the '
            'centre at least 30 minutes before.',
            {'kind': 'exam_reminder', 'reminder': 'exam_day',
             'subjectCode': exam['subjectCode'], 'date': exam['date']},
        )
        _email(
            student,
            f'Today: {exam["subjectName"]} exam at {when}',
            'Exam Day — Get Ready',
            f"Your {exam['subjectName']} ({exam['subjectCode']}) exam starts "
            f'today at {when}. A quick pre-departure check:',
            [
                {'label': 'Subject', 'value': f"{exam['subjectName']} ({exam['subjectCode']})"},
                {'label': 'Time', 'value': f'{when} ({exam["weekday"]})'},
            ],
            bullets=EXAM_DAY_TIPS,
            bullets_title='Before you leave',
        )
        ExamReminderLog.objects.create(
            student=student, routine=routine, kind='exam_day',
            subjectCode=exam['subjectCode'], examDate=exam['date'],
        )
        sent.append('exam_day')

    if now.hour < QUIET_UNTIL_HOUR:
        return sent

    # -- day_before: exams happening tomorrow ----------------------------
    tomorrow = (today + timedelta(days=1)).isoformat()
    for exam in exams:
        if exam['date'] != tomorrow:
            continue
        if ExamReminderLog.objects.filter(
            student=student, kind='day_before',
            subjectCode=exam['subjectCode'], examDate=exam['date'],
        ).exists():
            continue
        if dry_run:
            sent.append('day_before')
            continue
        when = _fmt_time(exam['startTime'])
        _notify(
            student,
            f"Tomorrow: {exam['subjectName']} exam",
            f"{exam['subjectName']} ({exam['subjectCode']}) is tomorrow at "
            f'{when}. Check your admit card, verify the time from the '
            'official notice, revise lightly and sleep early.',
            {'kind': 'exam_reminder', 'reminder': 'day_before',
             'subjectCode': exam['subjectCode'], 'date': exam['date']},
        )
        _email(
            student,
            f'Tomorrow: {exam["subjectName"]} exam — preparation checklist',
            'Exam Tomorrow',
            f"Your {exam['subjectName']} ({exam['subjectCode']}) exam is "
            f'tomorrow at {when}. Things to do today:',
            [
                {'label': 'Subject', 'value': f"{exam['subjectName']} ({exam['subjectCode']})"},
                {'label': 'Date', 'value': f"{_fmt_date(exam['date'])} ({exam['weekday']})"},
                {'label': 'Time', 'value': when},
            ],
            bullets=DAY_BEFORE_CHECKLIST,
            bullets_title='Things to do today',
        )
        ExamReminderLog.objects.create(
            student=student, routine=routine, kind='day_before',
            subjectCode=exam['subjectCode'], examDate=exam['date'],
        )
        sent.append('day_before')

    # -- countdown: first exam within 30 days, every 3 days --------------
    # Skip on days already covered by a more specific reminder.
    if 1 < days_to_first <= COUNTDOWN_WINDOW_DAYS:
        recent = ExamReminderLog.objects.filter(
            student=student, kind='countdown', routine=routine,
            sentAt__gte=now - timedelta(days=COUNTDOWN_EVERY_DAYS),
        ).exists()
        if not recent:
            if dry_run:
                sent.append('countdown')
                return sent
            when = _fmt_time(first['startTime'])
            _notify(
                student,
                f'{days_to_first} days until your first exam',
                f"{first['subjectName']} ({first['subjectCode']}) is on "
                f"{_fmt_date(first['date'])} at {when}. "
                f'{len(exams)} exam{"s" if len(exams) != 1 else ""} ahead — '
                'keep a steady study routine.',
                {'kind': 'exam_reminder', 'reminder': 'countdown',
                 'daysLeft': days_to_first, 'firstDate': first['date']},
            )
            _email(
                student,
                f'{days_to_first} days to go — exam preparation reminder',
                'Exams Are Approaching',
                f'Your first exam is {days_to_first} days away. Here is '
                'what is coming up:',
                [
                    {'label': 'First exam',
                     'value': f"{first['subjectName']} ({first['subjectCode']})"},
                    {'label': 'Date',
                     'value': f"{_fmt_date(first['date'])} ({first['weekday']})"},
                    {'label': 'Time', 'value': when},
                    {'label': 'Total exams', 'value': str(len(exams))},
                ],
                bullets=[
                    'Plan a revision schedule that covers every subject',
                    'Practice previous board questions',
                    'Collect your admit card in time',
                    'Check the routine for referred subjects too',
                ],
                bullets_title='Preparation tips',
            )
            ExamReminderLog.objects.create(
                student=student, routine=routine, kind='countdown',
            )
            sent.append('countdown')

    return sent
