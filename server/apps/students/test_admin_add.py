"""
Tests for admin "Add Student": the StudentCreateSerializer must accept the
admission-style payload, auto-generate readable Roll/Registration numbers, and
fall back sensibly for administrative fields.
"""
from datetime import date
from django.test import TestCase
from apps.departments.models import Department
from apps.students.models import Student
from apps.students.serializers import StudentCreateSerializer


def base_payload(department):
    address = {
        'division': 'rajshahi', 'district': 'Sirajganj', 'upazila': 'Sirajganj Sadar',
        'postOffice': 'Sirajganj', 'policeStation': 'Sadar', 'municipality': '',
        'village': '', 'ward': '5', 'fullAddress': 'Test road',
    }
    return {
        'fullNameBangla': 'টেস্ট', 'fullNameEnglish': 'Test Student',
        'fatherName': 'Father', 'fatherNID': '1234567890',
        'motherName': 'Mother', 'motherNID': '0987654321',
        'dateOfBirth': '2005-01-01', 'birthCertificateNo': '19951234567890123',
        'nidNumber': '', 'gender': 'Male', 'religion': 'Islam', 'bloodGroup': 'O+',
        'nationality': 'Bangladeshi', 'maritalStatus': 'Single',
        'mobileStudent': '01711111111', 'guardianMobile': '01722222222',
        'email': 'test@example.com', 'presentAddress': address, 'permanentAddress': address,
        'board': 'Rajshahi', 'group': 'Science', 'rollNumber': '654321',
        'passingYear': 2023, 'gpa': '4.50', 'institutionName': 'Test High School',
        'department': str(department.id), 'semester': 1, 'shift': 'Morning',
        'session': '2025-26', 'currentGroup': 'A', 'status': 'active',
        # Intentionally NOT providing: currentRollNumber, currentRegistrationNumber,
        # emergencyContact, enrollmentDate, highestExam, registrationNumber.
    }


class AdminAddStudentSerializerTests(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(name='Computer Technology', code='CST')

    def test_creates_student_with_generated_identifiers(self):
        serializer = StudentCreateSerializer(data=base_payload(self.dept))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        student = serializer.save()

        self.assertEqual(student.currentRollNumber, 'CST-2025-001')
        self.assertEqual(student.currentRegistrationNumber, '2025CST001')
        # Administrative fallbacks
        self.assertEqual(student.emergencyContact, '01722222222')  # = guardian mobile
        self.assertEqual(student.highestExam, 'SSC')
        self.assertEqual(student.enrollmentDate, date.today())

    def test_second_student_gets_next_sequential_id(self):
        s1 = StudentCreateSerializer(data=base_payload(self.dept))
        self.assertTrue(s1.is_valid(), s1.errors)
        s1.save()

        s2 = StudentCreateSerializer(data=base_payload(self.dept))
        self.assertTrue(s2.is_valid(), s2.errors)
        student2 = s2.save()

        self.assertEqual(student2.currentRollNumber, 'CST-2025-002')
        self.assertEqual(student2.currentRegistrationNumber, '2025CST002')

    def test_address_without_village_is_accepted(self):
        # village is now optional (matches the student admission form).
        serializer = StudentCreateSerializer(data=base_payload(self.dept))
        self.assertTrue(serializer.is_valid(), serializer.errors)


from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class AdminAddStudentEndToEndTests(APITestCase):
    """
    Real end-to-end: an admin creates a student through the API, then the student
    appears in the students list with the auto-generated readable identifiers.
    """

    def setUp(self):
        self.dept = Department.objects.create(name='Computer Technology', code='CST')
        self.admin = User.objects.create_user(
            username='registrar@example.com', email='registrar@example.com',
            password='pass12345', role='registrar', account_status='active',
        )
        self.client.force_authenticate(self.admin)

    def test_admin_creates_student_and_it_appears_in_list(self):
        resp = self.client.post('/api/students/', base_payload(self.dept), format='json')
        self.assertEqual(resp.status_code, 201, resp.data)

        roll = resp.data['currentRollNumber']
        reg = resp.data['currentRegistrationNumber']
        self.assertEqual(roll, 'CST-2025-001')
        self.assertEqual(reg, '2025CST001')

        # The new student is listed.
        list_resp = self.client.get('/api/students/')
        self.assertEqual(list_resp.status_code, 200)
        results = list_resp.data.get('results', list_resp.data)
        rolls = [s.get('currentRollNumber') for s in results]
        self.assertIn(roll, rolls)
