"""
The public profile must actually SHOW what the student published.

Students fill in Career Journey / Skills / Courses & Certifications / Career
Highlights from their profile page; those rows live on the linked alumni
(career-prefill) record. The public profile used to expose only a flat list of
skill names, so everything else the student entered was invisible. These tests
pin the `portfolio` payload down — including the fields that must stay private.
"""
from rest_framework.test import APITestCase

from apps.alumni.models import Alumni
from apps.departments.models import Department
from apps.students.models import Student


class PublicProfilePortfolioTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CST')
        cls.student = Student.objects.create(
            fullNameEnglish='Nabil Hasan', currentRollNumber='CST-2020-007',
            currentRegistrationNumber='2020CST007', semester=7, shift='Morning',
            department=cls.dept, session='2020-21', status='active',
            gender='Male',
        )
        cls.alumni = Alumni.objects.create(
            student=cls.student,
            bio='Backend developer in the making.',
            linkedinUrl='https://linkedin.com/in/nabil',
            portfolioUrl='https://nabil.dev',
            careerHistory=[{
                'id': 'c1', 'type': 'job', 'position': 'Junior Developer',
                'company': 'Acme Ltd', 'location': 'Dhaka',
                'startDate': '2024-01', 'endDate': '', 'current': True,
                'description': 'Django APIs.',
                'achievements': ['Shipped the billing service'],
                'salary': '50000',  # must NOT be published
            }],
            skills=[
                {'id': 's1', 'name': 'Python', 'category': 'technical', 'proficiency': 85},
                {'id': 's2', 'name': '', 'category': 'technical', 'proficiency': 10},
            ],
            courses=[{
                'id': 'k1', 'name': 'Django Mastery', 'provider': 'Udemy',
                'status': 'completed', 'completionDate': '2024-05',
                'certificateId': 'PRIVATE-CERT-ID',
                'certificateUrl': 'https://udemy.com/cert/1',
            }],
            highlights=[{
                'id': 'h1', 'title': 'Hackathon Winner',
                'description': 'First place, national round.',
                'date': '2024-03', 'type': 'award',
            }],
        )
        cls.url = f'/api/students/by-identifier/{cls.student.currentRollNumber}/'

    def _portfolio(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('portfolio', response.data)
        return response.data['portfolio']

    def test_career_journey_is_published(self):
        careers = self._portfolio()['careers']
        self.assertEqual(len(careers), 1)
        self.assertEqual(careers[0]['position'], 'Junior Developer')
        self.assertEqual(careers[0]['company'], 'Acme Ltd')
        self.assertTrue(careers[0]['current'])
        self.assertEqual(careers[0]['achievements'], ['Shipped the billing service'])

    def test_salary_is_never_published(self):
        self.assertNotIn('salary', self._portfolio()['careers'][0])

    def test_skills_are_published_without_proficiency(self):
        skills = self._portfolio()['skills']
        # The unnamed skill row is dropped.
        self.assertEqual([s['name'] for s in skills], ['Python'])
        self.assertEqual(skills[0]['category'], 'technical')
        self.assertNotIn('proficiency', skills[0])

    def test_courses_are_published_without_the_certificate_id(self):
        courses = self._portfolio()['courses']
        self.assertEqual(len(courses), 1)
        self.assertEqual(courses[0]['name'], 'Django Mastery')
        self.assertEqual(courses[0]['provider'], 'Udemy')
        self.assertEqual(courses[0]['certificateUrl'], 'https://udemy.com/cert/1')
        self.assertNotIn('certificateId', courses[0])

    def test_highlights_are_published(self):
        highlights = self._portfolio()['highlights']
        self.assertEqual(len(highlights), 1)
        self.assertEqual(highlights[0]['title'], 'Hackathon Winner')
        self.assertEqual(highlights[0]['type'], 'award')

    def test_bio_and_links_are_published(self):
        portfolio = self._portfolio()
        self.assertEqual(portfolio['bio'], 'Backend developer in the making.')
        self.assertEqual(portfolio['linkedinUrl'], 'https://linkedin.com/in/nabil')
        self.assertEqual(portfolio['portfolioUrl'], 'https://nabil.dev')

    def test_legacy_skill_names_still_sent(self):
        """The flat `skills` list stays, so older clients keep working."""
        data = self.client.get(self.url).data
        self.assertEqual(data['skills'], ['Python'])

    def test_student_without_a_portfolio_gets_empty_sections(self):
        other = Student.objects.create(
            fullNameEnglish='No Portfolio', currentRollNumber='CST-2020-008',
            currentRegistrationNumber='2020CST008', semester=7, shift='Morning',
            department=self.dept, session='2020-21', status='active', gender='Male',
        )
        data = self.client.get(f'/api/students/by-identifier/{other.currentRollNumber}/').data
        portfolio = data['portfolio']
        self.assertEqual(portfolio['careers'], [])
        self.assertEqual(portfolio['skills'], [])
        self.assertEqual(portfolio['courses'], [])
        self.assertEqual(portfolio['highlights'], [])
        self.assertEqual(portfolio['bio'], '')
