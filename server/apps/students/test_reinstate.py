"""
Restoring a discontinued student back to an active student.

The Discontinued Students page needs a way back: flip the status to active and
clear the discontinuation metadata WITHOUT losing anything else on the record.
"""
from rest_framework.test import APITestCase

from apps.authentication.models import User
from apps.departments.models import Department
from apps.students.models import Student


class ReinstateStudentTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CST')
        cls.registrar = User.objects.create_user(
            username='reg', email='reg@x.com', password='pw',
            role='registrar', account_status='active',
        )

    def setUp(self):
        self.student = Student.objects.create(
            fullNameEnglish='Dropped Student', currentRollNumber='R9',
            currentRegistrationNumber='REG9', semester=4, shift='Morning',
            department=self.dept, session='2022-23', status='discontinued',
            discontinuedReason='Financial Issue', lastSemester=3,
            finalCgpa='3.10', semesterResults=[{'semester': 1, 'gpa': 3.2}],
        )
        self.url = f'/api/students/{self.student.id}/reinstate_studies/'
        self.client.force_authenticate(user=self.registrar)

    def test_restores_the_student_to_active(self):
        response = self.client.post(self.url, {'semester': 4}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.student.refresh_from_db()
        self.assertEqual(self.student.status, 'active')
        self.assertEqual(self.student.semester, 4)

    def test_clears_the_discontinuation_metadata(self):
        self.client.post(self.url, {'semester': 4}, format='json')
        self.student.refresh_from_db()
        self.assertEqual(self.student.discontinuedReason, '')
        self.assertIsNone(self.student.lastSemester)

    def test_keeps_the_academic_record(self):
        self.client.post(self.url, {'semester': 4}, format='json')
        self.student.refresh_from_db()
        self.assertEqual(str(self.student.finalCgpa), '3.10')
        self.assertEqual(self.student.semesterResults, [{'semester': 1, 'gpa': 3.2}])
        self.assertEqual(self.student.currentRollNumber, 'R9')

    def test_semester_defaults_to_the_last_completed_one(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.student.refresh_from_db()
        self.assertEqual(self.student.semester, 3)

    def test_records_an_activity_log_entry(self):
        from apps.activity_logs.models import ActivityLog
        self.client.post(self.url, {'semester': 5, 'remarks': 'Fees cleared'}, format='json')
        log = ActivityLog.objects.filter(entity_id=str(self.student.id)).first()
        self.assertIsNotNone(log)
        self.assertIn('discontinued to active', log.description)
        self.assertIn('Fees cleared', log.description)

    def test_rejects_a_student_who_is_not_discontinued(self):
        self.student.status = 'active'
        self.student.save(update_fields=['status'])
        response = self.client.post(self.url, {'semester': 4}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_rejects_an_out_of_range_semester(self):
        response = self.client.post(self.url, {'semester': 12}, format='json')
        self.assertEqual(response.status_code, 400)
        self.student.refresh_from_db()
        self.assertEqual(self.student.status, 'discontinued')

    def test_rejects_a_non_numeric_semester(self):
        response = self.client.post(self.url, {'semester': 'fourth'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_a_student_account_cannot_reinstate_anyone(self):
        student_user = User.objects.create_user(
            username='stu', email='stu@x.com', password='pw',
            role='student', related_profile_id=self.student.id,
            account_status='active',
        )
        self.client.force_authenticate(user=student_user)
        response = self.client.post(self.url, {'semester': 4}, format='json')
        self.assertIn(response.status_code, (401, 403))
        self.student.refresh_from_db()
        self.assertEqual(self.student.status, 'discontinued')
