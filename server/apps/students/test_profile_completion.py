"""
Profile completion behind the dashboard welcome card.

Every missing item must name the page that fixes it, so tapping the status can
send the student straight to Documents or Profile.
"""
from rest_framework.test import APITestCase

from apps.alumni.models import Alumni
from apps.authentication.models import User
from apps.departments.models import Department
from apps.documents.models import Document
from apps.students.models import Student
from apps.students.profile_completion import compute_student_profile_completion

URL = '/api/students/profile-completion/'


class ProfileCompletionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CST')

    def setUp(self):
        self.student = Student.objects.create(
            fullNameEnglish='Half Done', currentRollNumber='R-PC',
            currentRegistrationNumber='REG-PC', semester=3, shift='Morning',
            department=self.dept, status='active',
        )
        self.user = User.objects.create_user(
            username='pc', email='pc@x.com', password='pw', role='student',
            related_profile_id=self.student.id, account_status='active',
        )
        self.client.force_authenticate(user=self.user)

    def test_empty_profile_scores_low_and_lists_everything(self):
        data = self.client.get(URL).data
        self.assertEqual(data['percentage'], 0)
        self.assertFalse(data['complete'])
        self.assertTrue(len(data['missing']) > 0)

    def test_every_missing_item_names_a_target_page(self):
        data = self.client.get(URL).data
        for item in data['missing']:
            self.assertIn(item['target'], ('documents', 'profile'), item)
            self.assertTrue(item['label'])

    def test_documents_take_priority_over_profile_details(self):
        """A missing required document is the more blocking problem."""
        data = self.client.get(URL).data
        self.assertEqual(data['primaryTarget'], 'documents')
        self.assertGreater(data['targetCounts']['documents'], 0)

    def test_uploading_the_photo_raises_the_percentage(self):
        before = self.client.get(URL).data['percentage']
        self.student.profilePhoto = '/files/x/photo.jpg'
        self.student.save(update_fields=['profilePhoto'])
        after = self.client.get(URL).data['percentage']
        self.assertGreater(after, before)

    def test_portfolio_entries_count_towards_completion(self):
        before = self.client.get(URL).data['percentage']
        Alumni.objects.create(
            student=self.student, bio='Hello',
            careerHistory=[{'id': '1', 'positionTitle': 'Dev'}],
            skills=[{'name': 'A'}, {'name': 'B'}, {'name': 'C'}],
            courses=[{'name': 'Course'}],
            highlights=[{'title': 'Award'}],
        )
        after = self.client.get(URL).data['percentage']
        self.assertGreater(after, before)

    def test_profile_items_target_the_profile_page(self):
        labels = {
            m['label']: m['target'] for m in self.client.get(URL).data['missing']
        }
        self.assertEqual(labels.get('About / bio'), 'profile')
        self.assertEqual(labels.get('A career or study entry'), 'profile')
        self.assertEqual(labels.get('At least 3 skills'), 'profile')

    def test_profile_photo_is_fixed_on_the_documents_page(self):
        labels = {
            m['label']: m['target'] for m in self.client.get(URL).data['missing']
        }
        self.assertEqual(labels.get('Profile photo'), 'documents')

    def test_a_fully_populated_student_reports_complete(self):
        self.student.profilePhoto = '/files/x/photo.jpg'
        self.student.email = 'me@x.com'
        self.student.mobileStudent = '01700000000'
        self.student.presentAddress = {'district': 'Sirajganj'}
        self.student.save()
        Alumni.objects.create(
            student=self.student, bio='Hello',
            careerHistory=[{'id': '1', 'positionTitle': 'Dev'}],
            skills=[{'name': 'A'}, {'name': 'B'}, {'name': 'C'}],
            courses=[{'name': 'Course'}],
            highlights=[{'title': 'Award'}],
        )
        # Satisfy every required admission document.
        from apps.documents.admission_documents import build_checklist
        for entry in build_checklist(student=self.student):
            if entry['required']:
                Document.objects.create(
                    student=self.student, fileName=f"{entry['field']}.jpg",
                    fileType='jpg', category=entry['category'],
                    filePath=f"x/{entry['field']}.jpg", fileSize=10,
                    original_field_name=entry['field'], status='active',
                )

        self.student.refresh_from_db()
        data = self.client.get(URL).data
        self.assertEqual(data['percentage'], 100, data['missing'])
        self.assertTrue(data['complete'])
        self.assertEqual(data['missing'], [])
        self.assertIsNone(data['primaryTarget'])

    def test_a_teacher_account_is_refused(self):
        teacher = User.objects.create_user(
            username='t', email='t@x.com', password='pw', role='teacher',
            account_status='active',
        )
        self.client.force_authenticate(user=teacher)
        self.assertEqual(self.client.get(URL).status_code, 403)

    def test_a_student_without_a_profile_does_not_crash(self):
        result = compute_student_profile_completion(None)
        self.assertEqual(result['percentage'], 0)
        self.assertEqual(result['missing'], [])
