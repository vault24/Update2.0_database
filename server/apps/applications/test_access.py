"""
Access-control regression tests for applications.

After the lockdown there is NO anonymous access: submission, tracking
(my-applications) and the rendered document all require login, and a
student only ever sees their own applications.
"""
from rest_framework.test import APITestCase
from rest_framework import status

from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department
from apps.applications.models import Application


def _student(dept, roll):
    return Student.objects.create(
        fullNameEnglish=f'S {roll}', currentRollNumber=roll,
        currentRegistrationNumber=f'REG-{roll}', semester=1, shift='Day',
        department=dept, status='active')


def _application(roll, student=None, status_='approved'):
    return Application.objects.create(
        fullNameBangla='x', fullNameEnglish='Name', fatherName='f', motherName='m',
        department='CS', session='2023', shift='Day', rollNumber=roll,
        registrationNumber=f'REG-{roll}', subject='s', message='m',
        applicationType='testimonial', status=status_, student=student)


class ApplicationAccessTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cs = Department.objects.create(name='Computer', code='CS')
        cls.sA = _student(cls.cs, 'A1')
        cls.sB = _student(cls.cs, 'B1')
        cls.uA = User.objects.create_user(
            username='a', email='a@x.com', password='pw', role='student',
            related_profile_id=cls.sA.id, account_status='active')
        cls.uB = User.objects.create_user(
            username='b', email='b@x.com', password='pw', role='student',
            related_profile_id=cls.sB.id, account_status='active')
        cls.appA = _application('A1', student=cls.sA)
        cls.appB = _application('B1', student=cls.sB)

    # ---- anonymous is fully denied ----------------------------------------
    def test_anonymous_cannot_track(self):
        r = self.client.get('/api/applications/my-applications/', {'rollNumber': 'A1'})
        self.assertIn(r.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_anonymous_cannot_get_document(self):
        r = self.client.get(f'/api/applications/{self.appA.id}/document/', {'rollNumber': 'A1'})
        self.assertIn(r.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_anonymous_cannot_submit(self):
        r = self.client.post('/api/applications/submit/', {'fullNameEnglish': 'x'}, format='json')
        self.assertIn(r.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    # ---- student sees only their own --------------------------------------
    def test_student_tracking_scoped_to_self(self):
        self.client.force_authenticate(self.uA)
        r = self.client.get('/api/applications/my-applications/')
        self.assertEqual(r.status_code, 200)
        ids = {a['id'] for a in r.data['applications']}
        self.assertEqual(ids, {str(self.appA.id)})

    def test_student_cannot_track_others_by_roll(self):
        # Even if A passes B's roll number, they still only get their own.
        self.client.force_authenticate(self.uA)
        r = self.client.get('/api/applications/my-applications/', {'rollNumber': 'B1'})
        ids = {a['id'] for a in r.data['applications']}
        self.assertNotIn(str(self.appB.id), ids)
        self.assertEqual(ids, {str(self.appA.id)})

    def test_student_cannot_get_others_document(self):
        self.client.force_authenticate(self.uA)
        r = self.client.get(f'/api/applications/{self.appB.id}/document/', {'rollNumber': 'B1'})
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_can_get_own_document(self):
        self.client.force_authenticate(self.uA)
        r = self.client.get(f'/api/applications/{self.appA.id}/document/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'text/html')

    def test_student_cannot_retrieve_others_application(self):
        self.client.force_authenticate(self.uA)
        r = self.client.get(f'/api/applications/{self.appB.id}/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
