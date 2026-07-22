"""
The shareable /student/<roll> profile must be readable WITHOUT a login, while
never leaking the private half of a student record.

Identifiers (SIPI-830577, CST-2019-001) are guessable, so anyone can enumerate
this endpoint. These tests pin down exactly which fields an anonymous visitor
receives — if someone later adds a sensitive field to the model or swaps the
serializer back to StudentDetailSerializer, this fails loudly.
"""
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from apps.departments.models import Department
from apps.students.models import Student

User = get_user_model()

# Fields that must NEVER reach an unauthenticated caller.
PRIVATE_FIELDS = (
    'nidNumber', 'fatherNID', 'motherNID', 'dateOfBirth', 'birthCertificateNo',
    'guardianMobile', 'permanentAddress', 'emergencyContact', 'fatherName',
    'motherName', 'religion', 'bloodGroup', 'maritalStatus',
)


class PublicStudentProfileTests(APITestCase):
    def setUp(self):
        self.dept = Department.objects.create(name='Computer Science & Technology', code='CST')
        self.student = Student.objects.create(
            fullNameEnglish='Md Mahadi Hasan',
            fullNameBangla='মোঃ মাহাদী হাসান',
            fatherName='Abdul Karim',
            motherName='Fatema Begum',
            fatherNID='1234567890',
            motherNID='0987654321',
            nidNumber='1990123456789',
            birthCertificateNo='19901234567890123',
            dateOfBirth='1998-05-21',
            gender='Male',
            religion='Islam',
            bloodGroup='B+',
            mobileStudent='01712345678',
            guardianMobile='01812345678',
            email='mahadi@example.com',
            emergencyContact='01912345678',
            presentAddress={
                'village': 'Secret Village', 'fullAddress': 'House 12, Road 3',
                'postOffice': 'Sirajganj', 'upazila': 'Sadar',
                'district': 'Sirajganj', 'division': 'Rajshahi',
            },
            permanentAddress={'district': 'Sirajganj', 'fullAddress': 'Village Road'},
            currentRollNumber='CST-2019-001',
            currentRegistrationNumber='2019CST001',
            semester=8,
            department=self.dept,
            session='2022-23',
            shift='Morning',
            status='graduated',
            finalCgpa='3.75',
            semesterResults=[{'semester': 1, 'gpa': 3.5}],
        )
        self.url = f'/api/students/by-identifier/{self.student.currentRollNumber}/'

    # ---------------- anonymous access ----------------

    def test_anonymous_can_read_the_public_profile(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['fullNameEnglish'], 'Md Mahadi Hasan')
        self.assertEqual(response.data['currentRollNumber'], 'CST-2019-001')

    def test_anonymous_sees_academic_details(self):
        data = self.client.get(self.url).data
        self.assertEqual(data['session'], '2022-23')
        self.assertEqual(data['semester'], 8)
        self.assertEqual(data['status'], 'graduated')
        self.assertEqual(str(data['finalCgpa']), '3.75')
        self.assertEqual(data['semesterResults'], [{'semester': 1, 'gpa': 3.5}])
        self.assertEqual(data['departmentName'], 'Computer Science & Technology')

    def test_anonymous_sees_published_contact_details(self):
        """Institute decision: email + mobile are published on the profile."""
        data = self.client.get(self.url).data
        self.assertEqual(data['email'], 'mahadi@example.com')
        self.assertEqual(data['mobileStudent'], '01712345678')

    def test_anonymous_never_sees_private_fields(self):
        data = self.client.get(self.url).data
        for field in PRIVATE_FIELDS:
            self.assertNotIn(
                field, data,
                f'{field!r} leaked to an anonymous caller on the public profile',
            )

    def test_public_address_is_coarse_only(self):
        """District/division only — never the street address or village."""
        address = self.client.get(self.url).data['presentAddress']
        self.assertEqual(address, {'district': 'Sirajganj', 'division': 'Rajshahi'})
        self.assertNotIn('fullAddress', address)
        self.assertNotIn('village', address)

    def test_lookup_by_application_id_works_anonymously(self):
        User.objects.create_user(
            username='mahadi@example.com', email='mahadi@example.com',
            password='pass12345', role='student', account_status='active',
            student_id='SIPI-830577', related_profile_id=self.student.id,
        )
        response = self.client.get('/api/students/by-identifier/SIPI-830577/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['currentRollNumber'], 'CST-2019-001')

    def test_lookup_by_uuid_works_anonymously(self):
        response = self.client.get(f'/api/students/by-identifier/{self.student.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('nidNumber', response.data)

    def test_unknown_identifier_is_404_not_403(self):
        response = self.client.get('/api/students/by-identifier/NOPE-123/')
        self.assertEqual(response.status_code, 404)

    # ---------------- authorised access still gets everything -------------

    def test_registrar_still_receives_the_full_record(self):
        admin = User.objects.create_user(
            username='reg@example.com', email='reg@example.com', password='pass12345',
            role='registrar', account_status='active',
        )
        self.client.force_authenticate(admin)
        data = self.client.get(self.url).data
        self.assertEqual(data['nidNumber'], '1990123456789')
        self.assertEqual(data['fatherNID'], '1234567890')
        self.assertEqual(data['presentAddress']['fullAddress'], 'House 12, Road 3')

    def test_out_of_scope_student_gets_only_the_public_payload(self):
        """A logged-in student may not harvest another student's full record."""
        other = User.objects.create_user(
            username='other@example.com', email='other@example.com', password='pass12345',
            role='student', account_status='active',
        )
        self.client.force_authenticate(other)
        data = self.client.get(self.url).data
        self.assertEqual(data['fullNameEnglish'], 'Md Mahadi Hasan')
        for field in PRIVATE_FIELDS:
            self.assertNotIn(field, data, f'{field!r} leaked to an unrelated student')

    # ---------------- the rest of the API stays locked down ---------------

    def test_student_list_is_still_closed_to_anonymous(self):
        response = self.client.get('/api/students/')
        self.assertIn(response.status_code, (401, 403))

    def test_student_detail_route_is_still_closed_to_anonymous(self):
        response = self.client.get(f'/api/students/{self.student.id}/')
        self.assertIn(response.status_code, (401, 403))


def _make_student(dept, roll, *, gender, photo='photos/x.jpg', enabled=None):
    return Student.objects.create(
        fullNameEnglish=f'Student {roll}',
        currentRollNumber=roll,
        currentRegistrationNumber=f'REG-{roll}',
        semester=4,
        department=dept,
        gender=gender,
        profilePhoto=photo,
        publicProfileEnabled=enabled,
        status='active',
    )


class PublicProfileVisibilityTests(APITestCase):
    """The visibility toggle + the strict female photo-privacy rules."""

    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CMT')
        cls.male = _make_student(cls.dept, 'M1', gender='Male')
        cls.female = _make_student(cls.dept, 'F1', gender='Female')
        cls.female_opted_in = _make_student(cls.dept, 'F2', gender='Female', enabled=True)
        cls.male_opted_out = _make_student(cls.dept, 'M2', gender='Male', enabled=False)

    def get_public(self, roll):
        return self.client.get(f'/api/students/by-identifier/{roll}/')

    def test_male_default_is_public(self):
        res = self.get_public('M1')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['currentRollNumber'], 'M1')

    def test_female_default_is_private(self):
        res = self.get_public('F1')
        self.assertEqual(res.status_code, 403)
        self.assertTrue(res.data.get('private'))

    def test_male_can_opt_out(self):
        self.assertEqual(self.get_public('M2').status_code, 403)

    def test_female_opt_in_shows_profile_but_never_photo(self):
        res = self.get_public('F2')
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data['profilePhoto'])
        self.assertEqual(res.data['avatarVariant'], 'female')

    def test_male_public_profile_keeps_photo(self):
        res = self.get_public('M1')
        self.assertIsNotNone(res.data['profilePhoto'])
        self.assertEqual(res.data['avatarVariant'], 'default')

    def test_owner_sees_own_private_profile(self):
        user = User.objects.create_user(
            username='f1', email='f1@test.com', password='pass12345',
            role='student', related_profile_id=self.female.id,
        )
        self.client.force_authenticate(user)
        self.assertEqual(self.get_public('F1').status_code, 200)


class PublicProfileSettingEndpointTests(APITestCase):
    """GET/PATCH /api/students/public-profile-setting/ (own record only)."""

    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CMT')
        cls.female = _make_student(cls.dept, 'F1', gender='Female')
        cls.user = User.objects.create_user(
            username='f1', email='f1@test.com', password='pass12345',
            role='student', related_profile_id=cls.female.id,
        )

    def test_get_reports_gender_default(self):
        self.client.force_authenticate(self.user)
        res = self.client.get('/api/students/public-profile-setting/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['enabled'])
        self.assertIsNone(res.data['explicit'])
        self.assertFalse(res.data['default_enabled'])
        self.assertTrue(res.data['photo_hidden'])

    def test_patch_enables_profile(self):
        self.client.force_authenticate(self.user)
        res = self.client.patch(
            '/api/students/public-profile-setting/', {'enabled': True}, format='json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['enabled'])
        self.female.refresh_from_db()
        self.assertTrue(self.female.publicProfileEnabled)
        # ...and the public page becomes reachable anonymously.
        self.client.force_authenticate(None)
        self.assertEqual(
            self.client.get('/api/students/by-identifier/F1/').status_code, 200
        )

    def test_patch_requires_boolean(self):
        self.client.force_authenticate(self.user)
        res = self.client.patch(
            '/api/students/public-profile-setting/', {'enabled': 'yes'}, format='json'
        )
        self.assertEqual(res.status_code, 400)

    def test_anonymous_denied(self):
        res = self.client.get('/api/students/public-profile-setting/')
        self.assertIn(res.status_code, (401, 403))

    def test_teacher_denied(self):
        teacher = User.objects.create_user(
            username='t1', email='t1@test.com', password='pass12345', role='teacher',
        )
        self.client.force_authenticate(teacher)
        res = self.client.get('/api/students/public-profile-setting/')
        self.assertEqual(res.status_code, 403)
