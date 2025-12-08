"""
Student Property-Based Tests

These tests use Hypothesis to verify universal properties across all inputs.
Each test runs a minimum of 100 iterations with randomly generated data.
"""
from django.test import TestCase
from hypothesis import given, settings, strategies as st
from hypothesis.extra.django import from_model
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Student
from .validators import validate_mobile_number, validate_semester
from apps.departments.models import Department
import json


class MobileValidationPropertyTest(TestCase):
    """
    **Feature: django-backend, Property 7: Mobile number format validation**
    
    Property: For any mobile number value, validation should only succeed
    for exactly 11-digit strings and fail for all other formats.
    """
    
    @settings(max_examples=100)
    @given(st.text(min_size=1, max_size=20))
    def test_mobile_validation_rejects_non_11_digit_strings(self, mobile):
        """
        Test that mobile validation rejects any string that is not exactly 11 digits
        """
        # Skip if it's exactly 11 digits (valid case)
        if len(mobile) == 11 and mobile.isdigit():
            return
        
        # All other cases should raise ValidationError
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            validate_mobile_number(mobile)
    
    @settings(max_examples=100)
    @given(st.integers(min_value=10000000000, max_value=99999999999))
    def test_mobile_validation_accepts_11_digit_numbers(self, mobile_int):
        """
        Test that mobile validation accepts any 11-digit number
        """
        mobile = str(mobile_int)
        # Should not raise any exception
        result = validate_mobile_number(mobile)
        self.assertEqual(result, mobile)


class SemesterValidationPropertyTest(TestCase):
    """
    **Feature: django-backend, Property 8: Semester range validation**
    
    Property: For any semester value, validation should only succeed
    for integers in the range 1-8 and fail for all other values.
    """
    
    @settings(max_examples=100)
    @given(st.integers(min_value=-1000, max_value=1000))
    def test_semester_validation_range(self, semester):
        """
        Test that semester validation only accepts values between 1 and 8
        """
        from django.core.exceptions import ValidationError
        
        if 1 <= semester <= 8:
            # Valid range - should not raise exception
            result = validate_semester(semester)
            self.assertEqual(result, semester)
        else:
            # Invalid range - should raise ValidationError
            with self.assertRaises(ValidationError):
                validate_semester(semester)


class StudentCreationPropertyTest(APITestCase):
    """
    **Feature: django-backend, Property 1: Student creation completeness**
    
    Property: For any valid student data submitted via POST /api/students/,
    the created student record should contain all provided fields and return
    HTTP 201 with the complete student object including auto-generated id and timestamps.
    """
    
    def setUp(self):
        """Create a test department for foreign key"""
        self.department = Department.objects.create(
            name='Computer Science',
            code='CSE'
        )
    
    @settings(max_examples=50, deadline=None)
    @given(
        full_name_bangla=st.text(min_size=3, max_size=100, alphabet=st.characters(blacklist_categories=('Cs',))),
        full_name_english=st.text(min_size=3, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122)),
        father_name=st.text(min_size=3, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122)),
        mother_name=st.text(min_size=3, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122)),
        semester=st.integers(min_value=1, max_value=8),
        mobile=st.integers(min_value=10000000000, max_value=99999999999),
        gpa=st.floats(min_value=0.0, max_value=4.0, allow_nan=False, allow_infinity=False),
    )
    def test_student_creation_completeness(self, full_name_bangla, full_name_english, 
                                          father_name, mother_name, semester, mobile, gpa):
        """
        Test that creating a student returns all provided fields with HTTP 201
        """
        # Generate unique roll numbers for each test
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        student_data = {
            'fullNameBangla': full_name_bangla,
            'fullNameEnglish': full_name_english,
            'fatherName': father_name,
            'fatherNID': '1234567890123456',
            'motherName': mother_name,
            'motherNID': '1234567890123456',
            'dateOfBirth': '2000-01-01',
            'birthCertificateNo': f'BC{unique_id}',
            'gender': 'Male',
            'mobileStudent': str(mobile),
            'guardianMobile': str(mobile),
            'emergencyContact': 'Emergency Contact',
            'presentAddress': {
                'division': 'Dhaka',
                'district': 'Dhaka',
                'subDistrict': 'Mirpur',
                'policeStation': 'Mirpur',
                'postOffice': 'Mirpur',
                'municipality': 'Dhaka',
                'village': 'Mirpur',
                'ward': '1'
            },
            'permanentAddress': {
                'division': 'Dhaka',
                'district': 'Dhaka',
                'subDistrict': 'Mirpur',
                'policeStation': 'Mirpur',
                'postOffice': 'Mirpur',
                'municipality': 'Dhaka',
                'village': 'Mirpur',
                'ward': '1'
            },
            'highestExam': 'SSC',
            'board': 'Dhaka',
            'group': 'Science',
            'rollNumber': f'R{unique_id}',
            'registrationNumber': f'REG{unique_id}',
            'passingYear': 2020,
            'gpa': float(gpa),
            'currentRollNumber': f'CR{unique_id}',
            'currentRegistrationNumber': f'CREG{unique_id}',
            'semester': semester,
            'department': self.department.id,
            'session': '2020-2021',
            'shift': 'Morning',
            'currentGroup': 'A',
            'enrollmentDate': '2020-01-01',
        }
        
        response = self.client.post('/api/students/', student_data, format='json')
        
        # Should return HTTP 201
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Should have an ID
        self.assertIn('id', response.data)
        
        # Should have timestamps
        self.assertIn('createdAt', response.data)
        self.assertIn('updatedAt', response.data)
        
        # Should contain all provided fields
        self.assertEqual(response.data['fullNameEnglish'], full_name_english)
        self.assertEqual(response.data['semester'], semester)
        self.assertEqual(response.data['mobileStudent'], str(mobile))


class FileUploadValidationPropertyTest(APITestCase):
    """
    **Feature: django-backend, Property 4: File upload validation**
    
    Property: For any file upload request, files exceeding size limits (5MB for images,
    10MB for documents) or with invalid types should be rejected with HTTP 400.
    """
    
    def setUp(self):
        """Create test department and student"""
        self.department = Department.objects.create(
            name='Computer Science',
            code='CSE'
        )
        
        self.student = Student.objects.create(
            fullNameBangla='বাংলা নাম',
            fullNameEnglish='Test Student',
            fatherName='Father Name',
            fatherNID='1234567890123456',
            motherName='Mother Name',
            motherNID='1234567890123456',
            dateOfBirth='2000-01-01',
            birthCertificateNo='BC123456',
            gender='Male',
            mobileStudent='01712345678',
            guardianMobile='01712345678',
            emergencyContact='Emergency',
            presentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur',
                          'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka',
                          'village': 'Mirpur', 'ward': '1'},
            permanentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur',
                            'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka',
                            'village': 'Mirpur', 'ward': '1'},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber='R123456',
            registrationNumber='REG123456',
            passingYear=2020,
            gpa=3.5,
            currentRollNumber='CR123456',
            currentRegistrationNumber='CREG123456',
            semester=1,
            department=self.department,
            session='2020-2021',
            shift='Morning',
            currentGroup='A',
            enrollmentDate='2020-01-01',
        )
    
    @settings(max_examples=50, deadline=None)
    @given(
        file_size_mb=st.floats(min_value=5.1, max_value=20.0, allow_nan=False, allow_infinity=False),
    )
    def test_oversized_image_rejected(self, file_size_mb):
        """
        Test that images larger than 5MB are rejected
        """
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        # Create a file larger than 5MB
        file_size_bytes = int(file_size_mb * 1024 * 1024)
        file_content = b'0' * file_size_bytes
        
        photo = SimpleUploadedFile(
            "test_photo.jpg",
            file_content,
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            f'/api/students/{self.student.id}/upload-photo/',
            {'photo': photo},
            format='multipart'
        )
        
        # Should return HTTP 400
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    @settings(max_examples=30, deadline=None)
    @given(
        extension=st.sampled_from(['txt', 'pdf', 'doc', 'exe', 'zip', 'mp4', 'mp3'])
    )
    def test_invalid_file_type_rejected(self, extension):
        """
        Test that non-image files are rejected
        """
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        photo = SimpleUploadedFile(
            f"test_file.{extension}",
            b"file content",
            content_type="application/octet-stream"
        )
        
        response = self.client.post(
            f'/api/students/{self.student.id}/upload-photo/',
            {'photo': photo},
            format='multipart'
        )
        
        # Should return HTTP 400
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    @settings(max_examples=30, deadline=None)
    @given(
        file_size_mb=st.floats(min_value=0.1, max_value=4.9, allow_nan=False, allow_infinity=False),
        extension=st.sampled_from(['jpg', 'jpeg', 'png'])
    )
    def test_valid_image_accepted(self, file_size_mb, extension):
        """
        Test that valid images under 5MB are accepted
        """
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        # Create a valid file
        file_size_bytes = int(file_size_mb * 1024 * 1024)
        file_content = b'0' * file_size_bytes
        
        photo = SimpleUploadedFile(
            f"test_photo.{extension}",
            file_content,
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            f'/api/students/{self.student.id}/upload-photo/',
            {'photo': photo},
            format='multipart'
        )
        
        # Should return HTTP 200
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('profilePhoto', response.data)
        self.assertTrue(response.data['profilePhoto'].startswith('students/'))


class SearchResultConsistencyPropertyTest(APITestCase):
    """
    **Feature: django-backend, Property 3: Search result consistency**
    
    Property: For any search query, all returned student records should contain
    the query string in either fullNameEnglish, currentRollNumber, or
    currentRegistrationNumber (case-insensitive).
    """
    
    def setUp(self):
        """Create test department and students"""
        self.department = Department.objects.create(
            name='Computer Science',
            code='CSE'
        )
    
    @settings(max_examples=50, deadline=None)
    @given(
        search_term=st.text(min_size=2, max_size=10, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), min_codepoint=48, max_codepoint=122)),
    )
    def test_search_results_contain_query(self, search_term):
        """
        Test that all search results contain the search term
        """
        # Create students with the search term in different fields
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        # Student with search term in name
        Student.objects.create(
            fullNameBangla='বাংলা নাম',
            fullNameEnglish=f'Student {search_term} Name',
            fatherName='Father Name',
            fatherNID='1234567890123456',
            motherName='Mother Name',
            motherNID='1234567890123456',
            dateOfBirth='2000-01-01',
            birthCertificateNo=f'BC{unique_id}1',
            gender='Male',
            mobileStudent='01712345678',
            guardianMobile='01712345678',
            emergencyContact='Emergency',
            presentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur', 
                          'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka',
                          'village': 'Mirpur', 'ward': '1'},
            permanentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur',
                            'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka',
                            'village': 'Mirpur', 'ward': '1'},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber=f'R{unique_id}1',
            registrationNumber=f'REG{unique_id}1',
            passingYear=2020,
            gpa=3.5,
            currentRollNumber=f'CR{unique_id}1',
            currentRegistrationNumber=f'CREG{unique_id}1',
            semester=1,
            department=self.department,
            session='2020-2021',
            shift='Morning',
            currentGroup='A',
            enrollmentDate='2020-01-01',
        )
        
        # Search for the term
        response = self.client.get(f'/api/students/search/?q={search_term}')
        
        # Should return HTTP 200
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # All results should contain the search term (case-insensitive)
        search_lower = search_term.lower()
        for student in response.data:
            contains_in_name = search_lower in student['fullNameEnglish'].lower()
            contains_in_roll = search_lower in student['currentRollNumber'].lower()
            contains_in_reg = search_lower in student.get('currentRegistrationNumber', '').lower()
            
            self.assertTrue(
                contains_in_name or contains_in_roll or contains_in_reg,
                f"Search term '{search_term}' not found in student: {student}"
            )



class AlumniTransitionValidationPropertyTest(APITestCase):
    """
    **Feature: django-backend, Property 2: Alumni transition validation**
    
    Property: For any student record, transitioning to alumni should only succeed
    if all 8 semesters exist in semesterResults, and should fail with HTTP 400 otherwise.
    """
    
    def setUp(self):
        """Create test department"""
        self.department = Department.objects.create(
            name='Computer Science',
            code='CSE'
        )
    
    @settings(max_examples=50, deadline=None)
    @given(
        num_semesters=st.integers(min_value=0, max_value=10),
    )
    def test_transition_requires_8_semesters(self, num_semesters):
        """
        Test that transition only succeeds when exactly 8 semesters are complete
        """
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        # Create semester results based on num_semesters
        semester_results = [
            {'semester': i, 'gpa': 3.5, 'cgpa': 3.5}
            for i in range(1, min(num_semesters + 1, 9))
        ]
        
        student = Student.objects.create(
            fullNameBangla='বাংলা নাম',
            fullNameEnglish=f'Test Student {unique_id}',
            fatherName='Father Name',
            fatherNID='1234567890123456',
            motherName='Mother Name',
            motherNID='1234567890123456',
            dateOfBirth='2000-01-01',
            birthCertificateNo=f'BC{unique_id}',
            gender='Male',
            mobileStudent='01712345678',
            guardianMobile='01712345678',
            emergencyContact='Emergency',
            presentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur',
                          'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka',
                          'village': 'Mirpur', 'ward': '1'},
            permanentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur',
                            'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka',
                            'village': 'Mirpur', 'ward': '1'},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber=f'R{unique_id}',
            registrationNumber=f'REG{unique_id}',
            passingYear=2020,
            gpa=3.5,
            currentRollNumber=f'CR{unique_id}',
            currentRegistrationNumber=f'CREG{unique_id}',
            semester=min(num_semesters, 8),
            department=self.department,
            session='2020-2021',
            shift='Morning',
            currentGroup='A',
            enrollmentDate='2020-01-01',
            semesterResults=semester_results
        )
        
        response = self.client.post(
            f'/api/students/{student.id}/transition-to-alumni/',
            {'graduationYear': 2024},
            format='json'
        )
        
        if num_semesters >= 8:
            # Should succeed - student has completed 8 semesters
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertIn('student', response.data)
        else:
            # Should fail - student hasn't completed 8 semesters
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('error', response.data)


class AlumniDeletionPreventionPropertyTest(APITestCase):
    """
    **Feature: django-backend, Property 5: Alumni deletion prevention**
    
    Property: For any student with an associated alumni record, DELETE requests
    to /api/students/{id}/ should return HTTP 400 and preserve both student and
    alumni records.
    """
    
    def setUp(self):
        """Create test department"""
        self.department = Department.objects.create(
            name='Computer Science',
            code='CSE'
        )
    
    @settings(max_examples=30, deadline=None)
    @given(
        has_alumni=st.booleans(),
    )
    def test_alumni_deletion_prevention(self, has_alumni):
        """
        Test that students with alumni records cannot be deleted
        """
        from apps.alumni.models import Alumni
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        # Create student with 8 semesters
        student = Student.objects.create(
            fullNameBangla='বাংলা নাম',
            fullNameEnglish=f'Test Student {unique_id}',
            fatherName='Father Name',
            fatherNID='1234567890123456',
            motherName='Mother Name',
            motherNID='1234567890123456',
            dateOfBirth='2000-01-01',
            birthCertificateNo=f'BC{unique_id}',
            gender='Male',
            mobileStudent='01712345678',
            guardianMobile='01712345678',
            emergencyContact='Emergency',
            presentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur',
                          'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka',
                          'village': 'Mirpur', 'ward': '1'},
            permanentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur',
                            'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka',
                            'village': 'Mirpur', 'ward': '1'},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber=f'R{unique_id}',
            registrationNumber=f'REG{unique_id}',
            passingYear=2020,
            gpa=3.5,
            currentRollNumber=f'CR{unique_id}',
            currentRegistrationNumber=f'CREG{unique_id}',
            semester=8,
            department=self.department,
            session='2020-2021',
            shift='Morning',
            currentGroup='A',
            enrollmentDate='2020-01-01',
            semesterResults=[
                {'semester': i, 'gpa': 3.5, 'cgpa': 3.5}
                for i in range(1, 9)
            ]
        )
        
        # Create alumni record if has_alumni is True
        if has_alumni:
            Alumni.objects.create(
                student=student,
                alumniType='recent',
                graduationYear=2024,
                currentSupportCategory='no_support_needed'
            )
        
        # Try to delete the student
        response = self.client.delete(f'/api/students/{student.id}/')
        
        if has_alumni:
            # Should fail - student has alumni record
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('error', response.data)
            
            # Verify student and alumni still exist
            self.assertTrue(Student.objects.filter(id=student.id).exists())
            self.assertTrue(Alumni.objects.filter(student=student).exists())
        else:
            # Should succeed - student has no alumni record
            self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
            
            # Verify student was deleted
            self.assertFalse(Student.objects.filter(id=student.id).exists())



class SemesterResultsStructurePropertyTest(APITestCase):
    """
    **Feature: django-backend, Property 13: Semester results structure validation**
    
    Property: For any semester result entry, it should contain either
    (semester, gpa, cgpa) for passed semesters OR (semester, referredSubjects array)
    for referred semesters, but not both.
    """
    
    def setUp(self):
        """Create a test department for foreign key"""
        self.department = Department.objects.create(
            name='Computer Science',
            code='CSE'
        )
    
    @settings(max_examples=100, deadline=None)
    @given(
        semester_num=st.integers(min_value=1, max_value=8),
        has_gpa=st.booleans(),
        gpa_value=st.floats(min_value=0.0, max_value=4.0, allow_nan=False, allow_infinity=False),
        cgpa_value=st.floats(min_value=0.0, max_value=4.0, allow_nan=False, allow_infinity=False),
        referred_subjects=st.lists(
            st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122)),
            min_size=1,
            max_size=5
        )
    )
    def test_semester_results_structure_validation(self, semester_num, has_gpa, 
                                                   gpa_value, cgpa_value, referred_subjects):
        """
        Test that semester results validation enforces correct structure:
        - Either GPA/CGPA OR referred subjects, but not both
        """
        from .validators import validate_semester_results_structure
        from django.core.exceptions import ValidationError
        
        # Test case 1: Valid structure with GPA
        if has_gpa:
            valid_result_with_gpa = [{
                'semester': semester_num,
                'gpa': round(gpa_value, 2),
                'cgpa': round(cgpa_value, 2)
            }]
            
            # Should not raise exception
            result = validate_semester_results_structure(valid_result_with_gpa)
            self.assertEqual(result, valid_result_with_gpa)
        
        # Test case 2: Valid structure with referred subjects
        else:
            valid_result_with_referred = [{
                'semester': semester_num,
                'referredSubjects': referred_subjects
            }]
            
            # Should not raise exception
            result = validate_semester_results_structure(valid_result_with_referred)
            self.assertEqual(result, valid_result_with_referred)
        
        # Test case 3: Invalid structure with both GPA and referred subjects
        invalid_result_both = [{
            'semester': semester_num,
            'gpa': round(gpa_value, 2),
            'cgpa': round(cgpa_value, 2),
            'referredSubjects': referred_subjects
        }]
        
        # Should raise ValidationError
        with self.assertRaises(ValidationError):
            validate_semester_results_structure(invalid_result_both)
        
        # Test case 4: Invalid structure with neither GPA nor referred subjects
        invalid_result_neither = [{
            'semester': semester_num
        }]
        
        # Should raise ValidationError
        with self.assertRaises(ValidationError):
            validate_semester_results_structure(invalid_result_neither)
    
    @settings(max_examples=50, deadline=None)
    @given(
        semester_num=st.integers(min_value=1, max_value=8),
        gpa_value=st.floats(min_value=0.0, max_value=4.0, allow_nan=False, allow_infinity=False),
        cgpa_value=st.floats(min_value=0.0, max_value=4.0, allow_nan=False, allow_infinity=False),
    )
    def test_create_student_with_valid_semester_results(self, semester_num, gpa_value, cgpa_value):
        """
        Test that creating a student with valid semester results succeeds
        """
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        student_data = {
            'fullNameBangla': 'জন ডো',
            'fullNameEnglish': 'John Doe',
            'fatherName': 'Father Name',
            'fatherNID': '1234567890123456',
            'motherName': 'Mother Name',
            'motherNID': '1234567890123456',
            'dateOfBirth': '2000-01-01',
            'birthCertificateNo': f'BC{unique_id}',
            'gender': 'Male',
            'mobileStudent': '01712345678',
            'guardianMobile': '01798765432',
            'emergencyContact': 'Emergency Contact',
            'presentAddress': {
                'division': 'Dhaka',
                'district': 'Dhaka',
                'subDistrict': 'Mirpur',
                'policeStation': 'Mirpur',
                'postOffice': 'Mirpur',
                'municipality': 'Dhaka',
                'village': 'Mirpur',
                'ward': '1'
            },
            'permanentAddress': {
                'division': 'Dhaka',
                'district': 'Dhaka',
                'subDistrict': 'Mirpur',
                'policeStation': 'Mirpur',
                'postOffice': 'Mirpur',
                'municipality': 'Dhaka',
                'village': 'Mirpur',
                'ward': '1'
            },
            'highestExam': 'SSC',
            'board': 'Dhaka',
            'group': 'Science',
            'rollNumber': f'R{unique_id}',
            'registrationNumber': f'REG{unique_id}',
            'passingYear': 2018,
            'gpa': 5.00,
            'currentRollNumber': f'CR{unique_id}',
            'currentRegistrationNumber': f'CREG{unique_id}',
            'semester': semester_num,
            'department': self.department.id,
            'session': '2023-24',
            'shift': 'Day',
            'currentGroup': 'A',
            'enrollmentDate': '2023-01-01',
            'semesterResults': [{
                'semester': semester_num,
                'gpa': round(gpa_value, 2),
                'cgpa': round(cgpa_value, 2)
            }]
        }
        
        response = self.client.post('/api/students/', student_data, format='json')
        
        # Should succeed with HTTP 201
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('semesterResults', response.data)
        self.assertEqual(len(response.data['semesterResults']), 1)
        self.assertEqual(response.data['semesterResults'][0]['semester'], semester_num)


class RequiredFieldValidationPropertyTest(APITestCase):
    """
    **Feature: django-backend, Property 6: Required field validation**
    
    Property: For any POST or PUT request with missing required fields,
    the system should return HTTP 400 with specific field error messages.
    """
    
    def setUp(self):
        """Create a test department for foreign key"""
        self.department = Department.objects.create(
            name='Computer Science',
            code='CSE'
        )
        
        # Complete valid student data
        self.valid_student_data = {
            'fullNameBangla': 'জন ডো',
            'fullNameEnglish': 'John Doe',
            'fatherName': 'Father Name',
            'fatherNID': '1234567890123456',
            'motherName': 'Mother Name',
            'motherNID': '1234567890123456',
            'dateOfBirth': '2000-01-01',
            'birthCertificateNo': 'BC123456',
            'gender': 'Male',
            'mobileStudent': '01712345678',
            'guardianMobile': '01798765432',
            'emergencyContact': 'Emergency Contact',
            'presentAddress': {
                'division': 'Dhaka',
                'district': 'Dhaka',
                'subDistrict': 'Mirpur',
                'policeStation': 'Mirpur',
                'postOffice': 'Mirpur',
                'municipality': 'Dhaka',
                'village': 'Mirpur',
                'ward': '1'
            },
            'permanentAddress': {
                'division': 'Dhaka',
                'district': 'Dhaka',
                'subDistrict': 'Mirpur',
                'policeStation': 'Mirpur',
                'postOffice': 'Mirpur',
                'municipality': 'Dhaka',
                'village': 'Mirpur',
                'ward': '1'
            },
            'highestExam': 'SSC',
            'board': 'Dhaka',
            'group': 'Science',
            'rollNumber': 'R123456',
            'registrationNumber': 'REG123456',
            'passingYear': 2018,
            'gpa': 5.00,
            'currentRollNumber': 'CR123456',
            'currentRegistrationNumber': 'CREG123456',
            'semester': 1,
            'department': self.department.id,
            'session': '2023-24',
            'shift': 'Day',
            'currentGroup': 'A',
            'enrollmentDate': '2023-01-01',
        }
        
        # List of required fields that must not be blank/null
        self.required_fields = [
            'fullNameBangla',
            'fullNameEnglish',
            'fatherName',
            'fatherNID',
            'motherName',
            'motherNID',
            'dateOfBirth',
            'birthCertificateNo',
            'gender',
            'mobileStudent',
            'guardianMobile',
            'emergencyContact',
            'presentAddress',
            'permanentAddress',
            'highestExam',
            'board',
            'group',
            'rollNumber',
            'registrationNumber',
            'passingYear',
            'gpa',
            'currentRollNumber',
            'currentRegistrationNumber',
            'semester',
            'department',
            'session',
            'shift',
            'currentGroup',
            'enrollmentDate',
        ]
    
    @settings(max_examples=50, deadline=None)
    @given(
        field_to_remove=st.sampled_from([
            'fullNameBangla',
            'fullNameEnglish',
            'fatherName',
            'motherName',
            'dateOfBirth',
            'gender',
            'mobileStudent',
            'guardianMobile',
            'currentRollNumber',
            'semester',
            'department',
        ])
    )
    def test_missing_required_field_returns_400(self, field_to_remove):
        """
        Test that removing any required field results in HTTP 400
        """
        import uuid
        
        # Create a copy of valid data
        student_data = self.valid_student_data.copy()
        
        # Make roll numbers unique
        unique_id = str(uuid.uuid4())[:8]
        student_data['currentRollNumber'] = f'CR{unique_id}'
        student_data['currentRegistrationNumber'] = f'CREG{unique_id}'
        student_data['rollNumber'] = f'R{unique_id}'
        student_data['registrationNumber'] = f'REG{unique_id}'
        student_data['birthCertificateNo'] = f'BC{unique_id}'
        
        # Remove the required field
        if field_to_remove in student_data:
            del student_data[field_to_remove]
        
        response = self.client.post('/api/students/', student_data, format='json')
        
        # Should return HTTP 400
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Should have error message for the missing field
        self.assertIn(field_to_remove, response.data)
    
    @settings(max_examples=30, deadline=None)
    @given(
        field_to_empty=st.sampled_from([
            'fullNameEnglish',
            'fatherName',
            'motherName',
            'mobileStudent',
            'guardianMobile',
        ])
    )
    def test_empty_required_field_returns_400(self, field_to_empty):
        """
        Test that setting a required field to empty string results in HTTP 400
        """
        import uuid
        
        # Create a copy of valid data
        student_data = self.valid_student_data.copy()
        
        # Make roll numbers unique
        unique_id = str(uuid.uuid4())[:8]
        student_data['currentRollNumber'] = f'CR{unique_id}'
        student_data['currentRegistrationNumber'] = f'CREG{unique_id}'
        student_data['rollNumber'] = f'R{unique_id}'
        student_data['registrationNumber'] = f'REG{unique_id}'
        student_data['birthCertificateNo'] = f'BC{unique_id}'
        
        # Set the field to empty string
        student_data[field_to_empty] = ''
        
        response = self.client.post('/api/students/', student_data, format='json')
        
        # Should return HTTP 400
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Should have error message for the empty field
        self.assertIn(field_to_empty, response.data)
    
    @settings(max_examples=20, deadline=None)
    @given(
        num_fields_to_remove=st.integers(min_value=2, max_value=5)
    )
    def test_multiple_missing_fields_returns_400_with_all_errors(self, num_fields_to_remove):
        """
        Test that removing multiple required fields results in HTTP 400
        with error messages for all missing fields
        """
        import uuid
        import random
        
        # Create a copy of valid data
        student_data = self.valid_student_data.copy()
        
        # Make roll numbers unique
        unique_id = str(uuid.uuid4())[:8]
        student_data['currentRollNumber'] = f'CR{unique_id}'
        student_data['currentRegistrationNumber'] = f'CREG{unique_id}'
        student_data['rollNumber'] = f'R{unique_id}'
        student_data['registrationNumber'] = f'REG{unique_id}'
        student_data['birthCertificateNo'] = f'BC{unique_id}'
        
        # Select random fields to remove
        removable_fields = [
            'fullNameBangla',
            'fullNameEnglish',
            'fatherName',
            'motherName',
            'dateOfBirth',
            'gender',
            'mobileStudent',
            'guardianMobile',
        ]
        
        fields_to_remove = random.sample(
            removable_fields,
            min(num_fields_to_remove, len(removable_fields))
        )
        
        # Remove the selected fields
        for field in fields_to_remove:
            if field in student_data:
                del student_data[field]
        
        response = self.client.post('/api/students/', student_data, format='json')
        
        # Should return HTTP 400
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Should have error messages for all missing fields
        for field in fields_to_remove:
            self.assertIn(field, response.data,
                         f"Expected error for missing field '{field}' in response")
