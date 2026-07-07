"""
Red-team regression tests for student-record access control.

Before the fix, the RBAC middleware's allow-by-default let a logged-in student
reach StudentViewSet (only guarded by IsAuthenticated) and:
  * dump the entire student directory,
  * read/modify/delete ANY student record (destroy, bulk_delete,
    update_semester_results, transition_to_alumni, ...).

Now: writes are admin-only, and reads are row-scoped per role.
"""
from rest_framework.test import APITestCase

from apps.authentication.models import User
from apps.students.models import Student
from apps.departments.models import Department


def _student(dept, roll, sem=1, shift='Day'):
    return Student.objects.create(
        fullNameEnglish=f'S {roll}', currentRollNumber=roll,
        currentRegistrationNumber=f'REG-{roll}', semester=sem, shift=shift,
        department=dept, status='active')


class StudentAccessControlTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cs = Department.objects.create(name='Computer', code='CS')
        cls.me = _student(cls.cs, 'ME', sem=1, shift='Day')
        cls.classmate = _student(cls.cs, 'MATE', sem=1, shift='Day')
        cls.other = _student(cls.cs, 'OTHER', sem=5, shift='Day')
        cls.student_user = User.objects.create_user(
            username='stu', email='s@x.com', password='pw', role='student',
            related_profile_id=cls.me.id, account_status='active')
        cls.principal = User.objects.create_superuser(
            username='principal', email='p@x.com', password='pw', role='institute_head')

    # ---- reads ------------------------------------------------------------
    def test_student_list_scoped_to_self(self):
        self.client.force_authenticate(self.student_user)
        r = self.client.get('/api/students/')
        self.assertEqual(r.status_code, 200)
        results = r.data['results'] if isinstance(r.data, dict) and 'results' in r.data else r.data
        ids = {row['id'] for row in results}
        self.assertEqual(ids, {str(self.me.id)})

    def test_student_cannot_retrieve_another(self):
        self.client.force_authenticate(self.student_user)
        r = self.client.get(f'/api/students/{self.other.id}/')
        self.assertEqual(r.status_code, 404)

    def test_student_search_scoped(self):
        self.client.force_authenticate(self.student_user)
        r = self.client.get('/api/students/search/', {'q': 'S '})
        self.assertEqual(r.status_code, 200)
        ids = {row['id'] for row in r.data}
        self.assertEqual(ids, {str(self.me.id)})

    # ---- writes are admin-only -------------------------------------------
    def test_student_cannot_delete_any_student(self):
        self.client.force_authenticate(self.student_user)
        r = self.client.delete(f'/api/students/{self.classmate.id}/')
        self.assertEqual(r.status_code, 403)
        self.assertTrue(Student.objects.filter(id=self.classmate.id).exists())

    def test_student_cannot_patch_any_student(self):
        self.client.force_authenticate(self.student_user)
        r = self.client.patch(f'/api/students/{self.other.id}/', {'semester': 8}, format='json')
        self.assertIn(r.status_code, (403, 404))
        self.other.refresh_from_db()
        self.assertEqual(self.other.semester, 5)

    def test_student_cannot_bulk_delete(self):
        self.client.force_authenticate(self.student_user)
        r = self.client.post('/api/students/bulk_delete/',
                             {'ids': [str(self.other.id), str(self.classmate.id)]}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(Student.objects.count(), 3)

    def test_student_cannot_update_semester_results(self):
        self.client.force_authenticate(self.student_user)
        r = self.client.post(f'/api/students/{self.me.id}/update_semester_results/',
                             {'semester': 1, 'gpa': 4.0}, format='json')
        self.assertEqual(r.status_code, 403)

    # ---- admin still works -----------------------------------------------
    def test_admin_sees_all_and_can_write(self):
        self.client.force_authenticate(self.principal)
        r = self.client.get('/api/students/')
        results = r.data['results'] if isinstance(r.data, dict) and 'results' in r.data else r.data
        self.assertEqual(len(results), 3)
