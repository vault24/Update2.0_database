"""
The shareable /faculty/<id> page must work for a visitor who is NOT logged in.

`/api/teachers/{id}/profile/` is behind BlockStudentWrite, which denies
anonymous requests outright — so the public page rendered nothing. The public
endpoint below is deliberately open, and these tests pin down both halves:
the professional record IS published, the personal details are NOT.
"""
from datetime import date

from rest_framework.test import APITestCase

from apps.departments.models import Department
from apps.teachers.models import (
    Teacher, TeacherAward, TeacherEducation, TeacherExperience,
    TeacherPublication, TeacherResearch,
)


class PublicTeacherProfileTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CST')
        cls.teacher = Teacher.objects.create(
            fullNameEnglish='Dr. Kamrul Islam', fullNameBangla='ড. কামরুল ইসলাম',
            designation='Associate Professor', department=cls.dept,
            email='kamrul@example.com', mobileNumber='01711111111',
            officeLocation='Room 204', joiningDate=date(2015, 1, 5),
            headline='Researcher in applied machine learning',
            about='Teaching and researching for a decade.',
            skills=['Python', 'Machine Learning'],
            specializations=['AI'], subjects=['CSE-101'],
        )
        TeacherExperience.objects.create(
            teacher=cls.teacher, title='Lecturer', institution='SIPI',
            location='Sirajganj', startDate='2015', endDate='2020',
            current=False, description='Taught programming.',
        )
        TeacherEducation.objects.create(
            teacher=cls.teacher, degree='PhD', institution='BUET',
            field='Computer Science', year='2014',
        )
        TeacherPublication.objects.create(
            teacher=cls.teacher, title='On Neural Nets',
            journal='IEEE', year='2021', citations=12,
        )
        TeacherResearch.objects.create(
            teacher=cls.teacher, title='Smart Campus',
            status='ongoing', year='2024', description='IoT research.',
        )
        TeacherAward.objects.create(
            teacher=cls.teacher, title='Best Paper', issuer='IEEE', year='2021',
        )
        cls.url = f'/api/teachers/{cls.teacher.id}/public-profile/'

    def test_anonymous_can_read_the_public_faculty_profile(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['fullNameEnglish'], 'Dr. Kamrul Islam')

    def test_full_professional_record_is_published(self):
        data = self.client.get(self.url).data
        self.assertEqual(len(data['experiences']), 1)
        self.assertEqual(len(data['education']), 1)
        self.assertEqual(len(data['publications']), 1)
        self.assertEqual(len(data['research']), 1)
        self.assertEqual(len(data['awards']), 1)
        self.assertEqual(data['skills'], ['Python', 'Machine Learning'])
        self.assertEqual(data['about'], 'Teaching and researching for a decade.')
        self.assertEqual(data['headline'], 'Researcher in applied machine learning')
        self.assertEqual(data['departmentName'], 'Computer')

    def test_personal_and_employment_details_are_not_published(self):
        data = self.client.get(self.url).data
        for field in ('mobileNumber', 'employmentStatus', 'joiningDate', 'user'):
            self.assertNotIn(field, data)

    def test_authenticated_profile_endpoint_still_requires_login(self):
        """The richer /profile/ endpoint stays behind authentication."""
        response = self.client.get(f'/api/teachers/{self.teacher.id}/profile/')
        self.assertIn(response.status_code, (401, 403))

    def test_unknown_teacher_returns_404(self):
        response = self.client.get(
            '/api/teachers/00000000-0000-0000-0000-000000000000/public-profile/'
        )
        self.assertEqual(response.status_code, 404)
