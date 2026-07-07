"""
Regression test: the notice engagement summary must not 500.

The annotation was named `read_count`, colliding with the read-only
`Notice.read_count` @property (no setter -> AttributeError -> 500).
"""
from rest_framework.test import APITestCase

from apps.authentication.models import User
from apps.notices.models import Notice, NoticeReadStatus
from apps.students.models import Student
from apps.departments.models import Department


class NoticeEngagementSummaryTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser(
            username='principal', email='p@x.com', password='pw', role='institute_head')
        cls.dept = Department.objects.create(name='Computer', code='CS')
        # a student + a published notice with one read, to exercise the annotation
        cls.stu_profile = Student.objects.create(
            fullNameEnglish='S', currentRollNumber='R1', currentRegistrationNumber='REG1',
            semester=1, shift='Day', department=cls.dept, status='active')
        cls.student_user = User.objects.create_user(
            username='stu', email='s@x.com', password='pw', role='student',
            related_profile_id=cls.stu_profile.id, account_status='active')
        notice = Notice.objects.create(
            title='Exam', content='Body', is_published=True, created_by=cls.admin)
        NoticeReadStatus.objects.create(notice=notice, student=cls.student_user)

    def test_engagement_summary_ok(self):
        self.client.force_authenticate(self.admin)
        r = self.client.get('/api/admin/notices/engagement-summary/')
        self.assertEqual(r.status_code, 200, msg=getattr(r, 'data', None))
        self.assertEqual(r.data['total_notices'], 1)
        self.assertEqual(r.data['total_actual_reads'], 1)
