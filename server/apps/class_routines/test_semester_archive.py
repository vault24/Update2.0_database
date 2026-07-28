"""
Semester Update (archive, don't delete) tests.

Covers the core contract:
  * only an admin, with a correct password, may roll the semester over;
  * nothing is deleted — rows are stamped with a SemesterArchive;
  * the teacher's live workspace (attendance records/analysis, marks) goes
    empty for the new semester;
  * the archived data is still readable through Teacher History;
  * archived rows are read-only.
"""
from datetime import date

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.attendance.models import AttendanceRecord
from apps.class_routines.models import ClassRoutine, SemesterArchive
from apps.departments.models import Department
from apps.marks.models import MarksRecord
from apps.students.models import Student
from apps.teachers.models import Teacher

User = get_user_model()


class SemesterArchiveTests(APITestCase):
    def setUp(self):
        self.dept = Department.objects.create(name='Computer', code='CST')

        self.admin = User.objects.create_user(
            username='admin@example.com', email='admin@example.com',
            password='adminpass123', role='registrar',
        )
        self.teacher = Teacher.objects.create(
            fullNameEnglish='T One', email='t1@example.com', department=self.dept,
            designation='Instructor', mobileNumber='01700000000',
            employmentStatus='permanent', joiningDate=date(2020, 1, 1),
        )
        self.teacher_user = User.objects.create_user(
            username='t1@example.com', email='t1@example.com',
            password='teacherpass123', role='teacher',
            related_profile_id=self.teacher.id,
        )
        self.student = Student.objects.create(
            fullNameEnglish='S One', department=self.dept, semester=4, shift='Morning',
            session='2024-25', currentRollNumber='CST-2024-001',
            currentRegistrationNumber='2024CST001', status='active',
        )
        self.routine = ClassRoutine.objects.create(
            department=self.dept, semester=4, shift='Morning', session='2024-25',
            day_of_week='Sunday', start_time='08:00', end_time='09:00',
            subject_name='Programming', subject_code='CST-401',
            teacher=self.teacher, room_number='101',
        )
        self.attendance = AttendanceRecord.objects.create(
            student=self.student, subject_code='CST-401', subject_name='Programming',
            semester=4, class_routine=self.routine, date=date(2026, 1, 5),
            is_present=True, status='direct',
        )
        self.marks = MarksRecord.objects.create(
            student=self.student, subject_code='CST-401', subject_name='Programming',
            semester=4, exam_type='final', marks_obtained=80, total_marks=100,
        )

    # ---------------------------------------------------------------- auth
    def test_requires_admin(self):
        self.client.force_authenticate(self.teacher_user)
        resp = self.client.post('/api/class-routines/update-semester/',
                                {'admin_password': 'teacherpass123'}, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertFalse(SemesterArchive.objects.exists())

    def test_requires_password(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/class-routines/update-semester/', {}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(SemesterArchive.objects.exists())

    def test_rejects_wrong_password(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/class-routines/update-semester/',
                                {'admin_password': 'WRONG'}, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertFalse(SemesterArchive.objects.exists())

    # ------------------------------------------------------------- archive
    def _rollover(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/class-routines/update-semester/',
                                {'admin_password': 'adminpass123'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        return resp

    def test_archives_without_deleting(self):
        resp = self._rollover()
        archive = SemesterArchive.objects.get()

        # Nothing removed.
        self.assertEqual(ClassRoutine.objects.count(), 1)
        self.assertEqual(AttendanceRecord.objects.count(), 1)
        self.assertEqual(MarksRecord.objects.count(), 1)

        # Everything stamped and the routine deactivated.
        self.routine.refresh_from_db()
        self.attendance.refresh_from_db()
        self.marks.refresh_from_db()
        self.assertEqual(self.routine.archive_id, archive.id)
        self.assertFalse(self.routine.is_active)
        self.assertEqual(self.attendance.archive_id, archive.id)
        self.assertEqual(self.marks.archive_id, archive.id)
        self.assertEqual(resp.data['archive']['routines_count'], 1)

    def test_teacher_workspace_is_empty_after_rollover(self):
        self._rollover()
        self.client.force_authenticate(self.teacher_user)

        records = self.client.get('/api/attendance/teacher_records/')
        self.assertEqual(records.status_code, 200)
        self.assertEqual(records.data.get('count', 0), 0)

        analytics = self.client.get('/api/attendance/teacher_analytics/')
        self.assertEqual(analytics.status_code, 200)
        self.assertEqual(analytics.data['overall']['totalRecords'], 0)

        analysis = self.client.get('/api/marks/teacher_result_analysis/')
        self.assertEqual(analysis.status_code, 200)
        self.assertEqual(analysis.data['subjects'], [])

    def test_history_still_exposes_archived_data(self):
        self._rollover()
        self.client.force_authenticate(self.teacher_user)

        archives = self.client.get('/api/class-routines/semester-archives/')
        self.assertEqual(archives.status_code, 200)
        self.assertEqual(len(archives.data['archives']), 1)

        history = self.client.get('/api/class-routines/teacher-history/')
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.data['subjects']), 1)
        subject = history.data['subjects'][0]
        self.assertEqual(subject['subject_code'], 'CST-401')
        self.assertEqual(subject['session'], '2024-25')
        self.assertEqual(subject['attendance']['present'], 1)
        self.assertEqual(subject['attendance']['percentage'], 100.0)
        self.assertEqual(subject['results']['passed'], 1)

    def test_archived_records_are_read_only(self):
        self._rollover()
        self.client.force_authenticate(self.teacher_user)

        # Not reachable through the teacher's (current-only) workspace.
        resp = self.client.patch(f'/api/attendance/{self.attendance.id}/',
                                 {'is_present': False}, format='json')
        self.assertIn(resp.status_code, (403, 404))
        self.attendance.refresh_from_db()
        self.assertTrue(self.attendance.is_present)

        # And an archived marks row cannot be edited by id.
        resp = self.client.post('/api/marks/bulk_upsert/', {
            'records': [{'id': str(self.marks.id), 'marks_obtained': 10, 'total_marks': 100}]
        }, format='json')
        self.marks.refresh_from_db()
        self.assertEqual(float(self.marks.marks_obtained), 80.0)

    def test_student_history_is_not_affected(self):
        """A student must still see their own past attendance and marks."""
        student_user = User.objects.create_user(
            username='s1@example.com', email='s1@example.com',
            password='studentpass123', role='student',
            related_profile_id=self.student.id,
        )
        self._rollover()
        self.client.force_authenticate(student_user)

        summary = self.client.get('/api/attendance/student_summary/',
                                  {'student': str(self.student.id)})
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(len(summary.data['summary']), 1)

        marks = self.client.get('/api/marks/student_marks/',
                                {'student': str(self.student.id)})
        self.assertEqual(marks.status_code, 200)
        self.assertEqual(len(marks.data['marks']), 1)
