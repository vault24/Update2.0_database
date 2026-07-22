"""
Tests for notice audience targeting (apps.notices.targeting).

Covers the spec examples: base audiences, hierarchical narrowing filters
(department / semester / shift / session), non-applicable filters never
restricting a group, and the per-user visibility filter matching dispatch.
"""
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.alumni.models import Alumni
from apps.departments.models import Department
from apps.students.models import Student
from apps.teachers.models import Teacher

from . import targeting
from .models import Notice
from .serializers import clean_targeting_payload

User = get_user_model()


def make_student(dept, roll, *, semester=4, shift='Morning', session='22-23', status='active'):
    return Student.objects.create(
        fullNameEnglish=f'Student {roll}',
        currentRollNumber=roll,
        currentRegistrationNumber=f'REG-{roll}',
        semester=semester,
        department=dept,
        shift=shift,
        session=session,
        status=status,
    )


def make_user(role, profile, username):
    return User.objects.create_user(
        username=username,
        email=f'{username}@test.com',
        password='testpass123',
        role=role,
        related_profile_id=profile.id if profile else None,
    )


def make_teacher(dept, name):
    return Teacher.objects.create(
        fullNameEnglish=name,
        fullNameBangla=name,
        designation='Lecturer',
        department=dept,
        email=f'{name.lower().replace(" ", ".")}@test.com',
        mobileNumber='01700000000',
        officeLocation='Room 1',
        joiningDate=date(2020, 1, 1),
    )


class TargetingTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username='admin', email='admin@test.com',
            password='testpass123', role='institute_head',
        )
        cls.cmt = Department.objects.create(name='Computer', code='CMT')
        cls.et = Department.objects.create(name='Electrical', code='ET')

        # Students: Computer 4th Morning, Computer 4th Day, Computer 6th
        # Morning, Electrical 4th Morning, plus an inactive Computer student.
        cls.s_cmt_4_morning = make_student(cls.cmt, 'C1', semester=4, shift='Morning')
        cls.s_cmt_4_day = make_student(cls.cmt, 'C2', semester=4, shift='Day')
        cls.s_cmt_6_morning = make_student(cls.cmt, 'C3', semester=6, shift='Morning')
        cls.s_et_4_morning = make_student(cls.et, 'E1', semester=4, shift='Morning')
        cls.s_inactive = make_student(cls.cmt, 'C9', semester=4, shift='Morning', status='inactive')

        cls.u_cmt_4_morning = make_user('student', cls.s_cmt_4_morning, 'c1')
        cls.u_cmt_4_day = make_user('captain', cls.s_cmt_4_day, 'c2')
        cls.u_cmt_6_morning = make_user('student', cls.s_cmt_6_morning, 'c3')
        cls.u_et_4_morning = make_user('student', cls.s_et_4_morning, 'e1')
        cls.u_inactive = make_user('student', cls.s_inactive, 'c9')

        # Teachers: one Computer, one Electrical.
        cls.t_cmt = make_teacher(cls.cmt, 'Cmt Teacher')
        cls.t_et = make_teacher(cls.et, 'Et Teacher')
        cls.u_t_cmt = make_user('teacher', cls.t_cmt, 'tc')
        cls.u_t_et = make_user('teacher', cls.t_et, 'te')

        # Alumni: graduated Computer (Morning) + Electrical (Day) students.
        cls.s_alum_cmt = make_student(cls.cmt, 'A1', semester=8, shift='Morning', status='graduated')
        cls.s_alum_et = make_student(cls.et, 'A2', semester=8, shift='Day', status='graduated')
        Alumni.objects.create(student=cls.s_alum_cmt, graduationYear=2024)
        Alumni.objects.create(student=cls.s_alum_et, graduationYear=2024)
        cls.u_alum_cmt = make_user('student', cls.s_alum_cmt, 'a1')
        cls.u_alum_et = make_user('student', cls.s_alum_et, 'a2')

    # -- helpers -----------------------------------------------------------

    def recipients(self, audience, **filters):
        qs = targeting.get_recipient_users(audience, targeting.TargetingFilters(**filters))
        return set(qs.values_list('username', flat=True))

    def make_notice(self, audience, departments=(), semesters=(), shifts=(), sessions=()):
        notice = Notice.objects.create(
            title='T', content='C', created_by=self.admin,
            audience=audience,
            target_semesters=list(semesters),
            target_shifts=list(shifts),
            target_sessions=list(sessions),
        )
        notice.target_departments.set(departments)
        return notice

    def visible_to(self, user):
        qs = targeting.filter_notices_for_user(
            Notice.objects.filter(is_published=True), user
        )
        return set(qs.values_list('id', flat=True))

    # -- dispatch targeting (spec examples) --------------------------------

    def test_default_students_teachers_no_filters(self):
        """Example 1: every active student + teacher; no alumni, no inactive."""
        self.assertEqual(
            self.recipients('students_teachers'),
            {'c1', 'c2', 'c3', 'e1', 'tc', 'te'},
        )

    def test_students_department_filter(self):
        """Example 2: all Computer department students."""
        self.assertEqual(
            self.recipients('students', departments=[self.cmt.id]),
            {'c1', 'c2', 'c3'},
        )

    def test_students_teachers_department_and_shift(self):
        """Example 3: Computer Morning students + ALL teachers of the dept scope."""
        self.assertEqual(
            self.recipients('students_teachers', departments=[self.cmt.id], shifts=['Morning']),
            {'c1', 'c3', 'tc'},  # shift never narrows teachers
        )

    def test_students_department_and_semester_both_shifts(self):
        """Example 4: Computer 4th semester — both shifts included."""
        self.assertEqual(
            self.recipients('students', departments=[self.cmt.id], semesters=[4]),
            {'c1', 'c2'},
        )

    def test_students_full_narrowing(self):
        """Example 5: Computer + Day + 4th semester."""
        self.assertEqual(
            self.recipients('students', departments=[self.cmt.id], semesters=[4], shifts=['Day']),
            {'c2'},
        )

    def test_teachers_department_filter(self):
        """Example 6: Electrical department teachers only."""
        self.assertEqual(
            self.recipients('teachers', departments=[self.et.id]),
            {'te'},
        )

    def test_alumni_department_filter(self):
        """Example 7: Computer alumni, both shifts (semester never applies)."""
        self.assertEqual(
            self.recipients('alumni', departments=[self.cmt.id], semesters=[4]),
            {'a1'},
        )

    def test_everyone_includes_all_groups(self):
        self.assertEqual(
            self.recipients('everyone'),
            {'c1', 'c2', 'c3', 'e1', 'tc', 'te', 'a1', 'a2'},
        )

    def test_count_recipients_breakdown(self):
        counts = targeting.count_recipients(
            'everyone', targeting.TargetingFilters(departments=[self.cmt.id])
        )
        self.assertEqual(counts['students'], 3)
        self.assertEqual(counts['teachers'], 1)
        self.assertEqual(counts['alumni'], 1)
        self.assertEqual(counts['total'], 5)
        self.assertEqual(counts['total_users'], 5)

    # -- per-user visibility ----------------------------------------------

    def test_visibility_matches_dispatch(self):
        n_default = self.make_notice('students_teachers')
        n_cmt_morning = self.make_notice('students_teachers', departments=[self.cmt.id], shifts=['Morning'])
        n_teachers = self.make_notice('teachers')
        n_alumni_cmt = self.make_notice('alumni', departments=[self.cmt.id])
        n_everyone = self.make_notice('everyone')

        self.assertEqual(
            self.visible_to(self.u_cmt_4_morning),
            {n_default.id, n_cmt_morning.id, n_everyone.id},
        )
        # Day-shift student misses the Morning-filtered notice.
        self.assertEqual(
            self.visible_to(self.u_cmt_4_day),
            {n_default.id, n_everyone.id},
        )
        # Teachers see teacher audiences; shift filter never hides from them.
        self.assertEqual(
            self.visible_to(self.u_t_cmt),
            {n_default.id, n_cmt_morning.id, n_teachers.id, n_everyone.id},
        )
        # Electrical teacher is outside the Computer department filter.
        self.assertEqual(
            self.visible_to(self.u_t_et),
            {n_default.id, n_teachers.id, n_everyone.id},
        )
        # Alumni see everyone + matching alumni notices only.
        self.assertEqual(
            self.visible_to(self.u_alum_cmt),
            {n_alumni_cmt.id, n_everyone.id},
        )
        self.assertEqual(
            self.visible_to(self.u_alum_et),
            {n_everyone.id},
        )

    def test_admin_sees_nothing_via_student_filter(self):
        self.make_notice('everyone')
        self.assertEqual(self.visible_to(self.admin), set())

    # -- payload validation ------------------------------------------------

    def test_clean_targeting_defaults(self):
        cleaned = clean_targeting_payload({})
        self.assertEqual(cleaned['audience'], 'students_teachers')
        self.assertEqual(cleaned['departments'], [])
        self.assertEqual(cleaned['semesters'], [])

    def test_clean_targeting_drops_non_applicable_filters(self):
        cleaned = clean_targeting_payload({
            'audience': 'alumni',
            'semesters': [4],
            'shifts': ['Morning'],
        })
        self.assertEqual(cleaned['semesters'], [])
        self.assertEqual(cleaned['shifts'], ['Morning'])

    def test_clean_targeting_accepts_json_string(self):
        cleaned = clean_targeting_payload('{"audience": "students", "semesters": ["4", 5]}')
        self.assertEqual(cleaned['audience'], 'students')
        self.assertEqual(cleaned['semesters'], [4, 5])
