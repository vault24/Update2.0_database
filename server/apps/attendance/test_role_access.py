"""
Role-based access-control tests for attendance.

Matrix enforced by AttendanceViewSet + scope_attendance_queryset:
    student          -> only own records
    captain          -> only their class/section (dept+semester+shift)
    teacher          -> only classes they teach / recorded
    department_head  -> only their department (middleware read-only gate)
    registrar/admin  -> everything

These exercise the view-level scoping (get_queryset, per-action checks and the
read-only permission) via DRF force_authenticate.
"""
from datetime import date
from rest_framework.test import APITestCase
from rest_framework import status

from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from apps.teachers.models import Teacher
from apps.class_routines.models import ClassRoutine
from apps.attendance.models import AttendanceRecord


def _student(dept, roll, sem=1, shift='Day'):
    return Student.objects.create(
        fullNameEnglish=f'Student {roll}',
        currentRollNumber=roll,
        currentRegistrationNumber=f'REG-{roll}',
        semester=sem,
        shift=shift,
        department=dept,
        status='active',
    )


class AttendanceRoleAccessTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cs = Department.objects.create(name='Computer', code='CS')
        cls.eee = Department.objects.create(name='Electrical', code='EEE')

        # Section CS / sem1 / Day: studentA, studentB (captain's profile)
        cls.sA = _student(cls.cs, 'CS-A', sem=1, shift='Day')
        cls.sB = _student(cls.cs, 'CS-B', sem=1, shift='Day')
        # Other section (sem2) and other department
        cls.sC = _student(cls.cs, 'CS-C', sem=2, shift='Day')
        cls.sD = _student(cls.eee, 'EEE-D', sem=1, shift='Day')

        cls.uStudentA = User.objects.create_user(
            username='studentA', email='a@x.com', password='pw',
            role='student', related_profile_id=cls.sA.id, account_status='active')
        cls.uCaptain = User.objects.create_user(
            username='captain', email='c@x.com', password='pw',
            role='captain', related_profile_id=cls.sB.id, account_status='active')

        cls.teacher = Teacher.objects.create(
            fullNameBangla='T', fullNameEnglish='Teacher One', designation='Lecturer',
            department=cls.cs, email='t@x.com', mobileNumber='01700000000',
            officeLocation='Room 1', joiningDate=date(2020, 1, 1))
        cls.uTeacher = User.objects.create_user(
            username='teacher', email='t@x.com', password='pw',
            role='teacher', related_profile_id=cls.teacher.id, account_status='active')

        cls.uRegistrar = User.objects.create_user(
            username='registrar', email='r@x.com', password='pw',
            role='registrar', account_status='active')

        cls.routine = ClassRoutine.objects.create(
            department=cls.cs, semester=1, shift='Day', session='2023-24',
            day_of_week='Sunday', start_time='09:00', end_time='10:00',
            subject_name='Prog', subject_code='CS101', room_number='101',
            teacher=cls.teacher)

        # recA/recB belong to the teacher's routine (CS sem1 Day)
        cls.recA = AttendanceRecord.objects.create(
            student=cls.sA, subject_code='CS101', subject_name='Prog', semester=1,
            date=date(2024, 1, 1), is_present=True, status='approved', class_routine=cls.routine)
        cls.recB = AttendanceRecord.objects.create(
            student=cls.sB, subject_code='CS101', subject_name='Prog', semester=1,
            date=date(2024, 1, 1), is_present=True, status='approved', class_routine=cls.routine)
        # recC (sem2) and recD (EEE) are outside the CS-sem1-Day section/routine
        cls.recC = AttendanceRecord.objects.create(
            student=cls.sC, subject_code='CS201', subject_name='DS', semester=2,
            date=date(2024, 1, 1), is_present=True, status='approved')
        cls.recD = AttendanceRecord.objects.create(
            student=cls.sD, subject_code='EEE101', subject_name='Circuits', semester=1,
            date=date(2024, 1, 1), is_present=True, status='approved')

    def _ids(self, resp):
        data = resp.data
        results = data['results'] if isinstance(data, dict) and 'results' in data else data
        return {r['id'] if isinstance(r, dict) else r for r in results}

    # ---- student -----------------------------------------------------------
    def test_student_sees_only_own(self):
        self.client.force_authenticate(self.uStudentA)
        resp = self.client.get('/api/attendance/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self._ids(resp), {str(self.recA.id)})

    def test_student_cannot_read_others_summary(self):
        self.client.force_authenticate(self.uStudentA)
        resp = self.client.get('/api/attendance/student_summary/', {'student': str(self.sB.id)})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['summary'], [])

    def test_student_is_read_only(self):
        self.client.force_authenticate(self.uStudentA)
        resp = self.client.post('/api/attendance/', {
            'student': str(self.sA.id), 'subject_code': 'CS101', 'subject_name': 'Prog',
            'semester': 1, 'date': '2024-02-02', 'is_present': True}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ---- captain -----------------------------------------------------------
    def test_captain_sees_own_section(self):
        self.client.force_authenticate(self.uCaptain)
        resp = self.client.get('/api/attendance/')
        self.assertEqual(self._ids(resp), {str(self.recA.id), str(self.recB.id)})

    def test_captain_cannot_read_other_section_summary(self):
        self.client.force_authenticate(self.uCaptain)
        resp = self.client.get('/api/attendance/student_summary/', {'student': str(self.sC.id)})
        self.assertEqual(resp.data['summary'], [])

    def test_captain_cannot_record_for_other_section(self):
        self.client.force_authenticate(self.uCaptain)
        resp = self.client.post('/api/attendance/bulk_create/', {
            'records': [{'student': str(self.sC.id), 'subject_code': 'CS201',
                         'semester': 2, 'date': '2024-02-02', 'attendance_type': 'present'}]},
            format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ---- teacher -----------------------------------------------------------
    def test_teacher_sees_only_their_routine(self):
        self.client.force_authenticate(self.uTeacher)
        resp = self.client.get('/api/attendance/')
        self.assertEqual(self._ids(resp), {str(self.recA.id), str(self.recB.id)})

    # ---- registrar (admin) -------------------------------------------------
    def test_registrar_sees_everything(self):
        self.client.force_authenticate(self.uRegistrar)
        resp = self.client.get('/api/attendance/')
        self.assertEqual(
            self._ids(resp),
            {str(self.recA.id), str(self.recB.id), str(self.recC.id), str(self.recD.id)})
