"""
Role-based access-control tests for marks.

Matrix enforced by MarksViewSet + scope_marks_queryset:
    student / captain -> only own records (marks have no captain workflow)
    teacher           -> marks they recorded or for a cohort they teach
    department_head   -> only their department (middleware read-only gate)
    registrar/admin   -> everything

Exercised at the view level via DRF force_authenticate.
"""
from decimal import Decimal
from datetime import date
from rest_framework.test import APITestCase
from rest_framework import status

from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from apps.teachers.models import Teacher
from apps.class_routines.models import ClassRoutine
from apps.marks.models import MarksRecord


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


def _mark(student, code='CS101', recorded_by=None, sem=1):
    return MarksRecord.objects.create(
        student=student, subject_code=code, subject_name='Prog', semester=sem,
        exam_type='midterm', marks_obtained=Decimal('80'), total_marks=Decimal('100'),
        recorded_by=recorded_by)


class MarksRoleAccessTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cs = Department.objects.create(name='Computer', code='CS')
        cls.eee = Department.objects.create(name='Electrical', code='EEE')

        cls.sA = _student(cls.cs, 'CS-A', sem=1, shift='Day')   # teacher's cohort
        cls.sB = _student(cls.cs, 'CS-B', sem=1, shift='Day')   # teacher's cohort
        cls.sC = _student(cls.cs, 'CS-C', sem=2, shift='Day')   # other cohort
        cls.sD = _student(cls.eee, 'EEE-D', sem=1, shift='Day')  # other dept

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
        # Teacher teaches CS / sem1 / Day
        ClassRoutine.objects.create(
            department=cls.cs, semester=1, shift='Day', session='2023-24',
            day_of_week='Sunday', start_time='09:00', end_time='10:00',
            subject_name='Prog', subject_code='CS101', room_number='101',
            teacher=cls.teacher)

        cls.uRegistrar = User.objects.create_user(
            username='registrar', email='r@x.com', password='pw',
            role='registrar', account_status='active')

        cls.mA = _mark(cls.sA)   # CS sem1 Day -> in teacher cohort
        cls.mB = _mark(cls.sB)   # CS sem1 Day -> in teacher cohort
        cls.mC = _mark(cls.sC, code='CS201', sem=2)  # CS sem2 -> outside cohort
        cls.mD = _mark(cls.sD, code='EE101')          # EEE -> outside dept

    def _ids(self, resp):
        data = resp.data
        results = data['results'] if isinstance(data, dict) and 'results' in data else data
        return {r['id'] if isinstance(r, dict) else r for r in results}

    # ---- student -----------------------------------------------------------
    def test_student_sees_only_own(self):
        self.client.force_authenticate(self.uStudentA)
        resp = self.client.get('/api/marks/')
        self.assertEqual(self._ids(resp), {str(self.mA.id)})

    def test_student_cannot_read_others_marks(self):
        # student_marks pins a student to their own profile, so asking for
        # student B returns student A's own marks -- B's data is never exposed.
        self.client.force_authenticate(self.uStudentA)
        resp = self.client.get('/api/marks/student_marks/', {'student': str(self.sB.id)})
        self.assertEqual(resp.status_code, 200)
        returned = {m['id'] for m in resp.data['marks']}
        self.assertNotIn(str(self.mB.id), returned)
        self.assertEqual(returned, {str(self.mA.id)})

    def test_student_is_read_only(self):
        self.client.force_authenticate(self.uStudentA)
        resp = self.client.post('/api/marks/', {
            'student': str(self.sA.id), 'subject_code': 'CS101', 'semester': 1,
            'exam_type': 'quiz', 'marks_obtained': '10', 'total_marks': '10'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ---- captain: own only (no marks workflow) -----------------------------
    def test_captain_sees_only_own(self):
        self.client.force_authenticate(self.uCaptain)
        resp = self.client.get('/api/marks/')
        self.assertEqual(self._ids(resp), {str(self.mB.id)})

    # ---- teacher: cohort only ----------------------------------------------
    def test_teacher_sees_only_cohort(self):
        self.client.force_authenticate(self.uTeacher)
        resp = self.client.get('/api/marks/')
        self.assertEqual(self._ids(resp), {str(self.mA.id), str(self.mB.id)})

    def test_teacher_cannot_record_outside_cohort(self):
        self.client.force_authenticate(self.uTeacher)
        resp = self.client.post('/api/marks/', {
            'student': str(self.sC.id), 'subject_code': 'CS201', 'semester': 2,
            'exam_type': 'quiz', 'marks_obtained': '10', 'total_marks': '10'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_can_record_within_cohort(self):
        self.client.force_authenticate(self.uTeacher)
        resp = self.client.post('/api/marks/', {
            'student': str(self.sA.id), 'subject_code': 'CS101', 'semester': 1,
            'exam_type': 'quiz', 'marks_obtained': '9', 'total_marks': '10'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_teacher_bulk_upsert_rejects_outside_cohort(self):
        self.client.force_authenticate(self.uTeacher)
        resp = self.client.post('/api/marks/bulk_upsert/', {'records': [
            {'student': str(self.sC.id), 'subject_code': 'CS201', 'semester': 2,
             'exam_type': 'quiz', 'marks_obtained': 5, 'total_marks': 10}]}, format='json')
        # Out-of-cohort record is rejected (per-record error, nothing saved).
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['saved'], 0)

    # ---- registrar ---------------------------------------------------------
    def test_registrar_sees_everything(self):
        self.client.force_authenticate(self.uRegistrar)
        resp = self.client.get('/api/marks/')
        self.assertEqual(
            self._ids(resp),
            {str(self.mA.id), str(self.mB.id), str(self.mC.id), str(self.mD.id)})
