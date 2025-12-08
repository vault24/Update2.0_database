"""
Department Tests
"""
from django.test import TestCase, tag
from rest_framework.test import APITestCase
from rest_framework import status
from hypothesis import given, strategies as st
from hypothesis.extra.django import TestCase as HypothesisTestCase
from .models import Department


class DepartmentModelTest(TestCase):
    """Unit tests for Department model"""
    
    def test_department_creation(self):
        """Test creating a department"""
        dept = Department.objects.create(
            name="Computer Science and Technology",
            code="CST"
        )
        self.assertEqual(dept.name, "Computer Science and Technology")
        self.assertEqual(dept.code, "CST")
        self.assertIsNotNone(dept.id)
        self.assertIsNotNone(dept.createdAt)
        self.assertIsNotNone(dept.updatedAt)
    
    def test_department_str(self):
        """Test department string representation"""
        dept = Department.objects.create(
            name="Civil Technology",
            code="CT"
        )
        self.assertEqual(str(dept), "Civil Technology (CT)")
    
    def test_unique_name_constraint(self):
        """Test that department names must be unique"""
        Department.objects.create(name="Test Dept", code="TD1")
        with self.assertRaises(Exception):
            Department.objects.create(name="Test Dept", code="TD2")
    
    def test_unique_code_constraint(self):
        """Test that department codes must be unique"""
        Department.objects.create(name="Test Dept 1", code="TD")
        with self.assertRaises(Exception):
            Department.objects.create(name="Test Dept 2", code="TD")


@tag('property')
class DepartmentPropertyTest(HypothesisTestCase):
    """
    Property-based tests for Department model
    Feature: django-backend, Property 1: Department creation with unique constraints
    Validates: Requirements 10.1
    """
    
    @given(
        name=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        code=st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=('Lu', 'Nd'))).filter(lambda x: x.strip())
    )
    def test_department_creation_property(self, name, code):
        """
        Property: For any valid department name and code, creating a department
        should succeed and return a department with all required fields populated
        """
        # Clean up any existing departments to avoid unique constraint violations
        Department.objects.all().delete()
        
        # Create department
        dept = Department.objects.create(name=name.strip(), code=code.strip().upper())
        
        # Verify all fields are populated
        self.assertIsNotNone(dept.id)
        self.assertEqual(dept.name, name.strip())
        self.assertEqual(dept.code, code.strip().upper())
        self.assertIsNotNone(dept.createdAt)
        self.assertIsNotNone(dept.updatedAt)
        
        # Verify it can be retrieved
        retrieved = Department.objects.get(id=dept.id)
        self.assertEqual(retrieved.name, dept.name)
        self.assertEqual(retrieved.code, dept.code)


class DepartmentAPITest(APITestCase):
    """API tests for Department endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.dept1 = Department.objects.create(
            name="Computer Science and Technology",
            code="CST"
        )
        self.dept2 = Department.objects.create(
            name="Civil Technology",
            code="CT"
        )
    
    def test_list_departments(self):
        """Test GET /api/departments/"""
        response = self.client.get('/api/departments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_create_department(self):
        """Test POST /api/departments/"""
        data = {
            'name': 'Electronic Technology',
            'code': 'ET'
        }
        response = self.client.post('/api/departments/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Electronic Technology')
        self.assertEqual(response.data['code'], 'ET')
    
    def test_get_department_detail(self):
        """Test GET /api/departments/{id}/"""
        response = self.client.get(f'/api/departments/{self.dept1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Computer Science and Technology')
    
    def test_update_department(self):
        """Test PUT /api/departments/{id}/"""
        data = {
            'name': 'Computer Science & Technology',
            'code': 'CST'
        }
        response = self.client.put(f'/api/departments/{self.dept1.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Computer Science & Technology')
    
    def test_delete_department(self):
        """Test DELETE /api/departments/{id}/"""
        response = self.client.delete(f'/api/departments/{self.dept1.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Department.objects.filter(id=self.dept1.id).exists())
    
    def test_code_uppercase_validation(self):
        """Test that department codes are automatically uppercased"""
        data = {
            'name': 'Test Department',
            'code': 'td'
        }
        response = self.client.post('/api/departments/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'TD')



class DepartmentEnhancedFeaturesTest(APITestCase):
    """Tests for enhanced department features"""
    
    def setUp(self):
        """Set up test data"""
        from apps.students.models import Student
        from apps.teachers.models import Teacher
        
        self.department = Department.objects.create(
            name='Computer Science',
            code='CS'
        )
        
        # Create students in different semesters and shifts
        self.student1 = Student.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father Name',
            fatherNID='1234567890',
            motherName='Mother Name',
            motherNID='0987654321',
            dateOfBirth='2000-01-01',
            birthCertificateNo='BC123456',
            gender='Male',
            mobileStudent='01712345678',
            guardianMobile='01798765432',
            emergencyContact='Emergency Contact',
            presentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur', 'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka', 'village': 'Mirpur', 'ward': '1'},
            permanentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur', 'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka', 'village': 'Mirpur', 'ward': '1'},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber='12345',
            registrationNumber='67890',
            passingYear=2018,
            gpa=5.00,
            currentRollNumber='CS001',
            currentRegistrationNumber='REG001',
            semester=1,
            department=self.department,
            session='2023-24',
            shift='Morning',
            currentGroup='A',
            enrollmentDate='2023-01-01',
            status='active'
        )
        
        self.student2 = Student.objects.create(
            fullNameBangla='জেন ডো',
            fullNameEnglish='Jane Doe',
            fatherName='Father Name 2',
            fatherNID='1234567891',
            motherName='Mother Name 2',
            motherNID='0987654322',
            dateOfBirth='2000-02-01',
            birthCertificateNo='BC123457',
            gender='Female',
            mobileStudent='01712345679',
            guardianMobile='01798765433',
            emergencyContact='Emergency Contact 2',
            presentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur', 'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka', 'village': 'Mirpur', 'ward': '1'},
            permanentAddress={'division': 'Dhaka', 'district': 'Dhaka', 'subDistrict': 'Mirpur', 'policeStation': 'Mirpur', 'postOffice': 'Mirpur', 'municipality': 'Dhaka', 'village': 'Mirpur', 'ward': '1'},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber='12346',
            registrationNumber='67891',
            passingYear=2018,
            gpa=4.50,
            currentRollNumber='CS002',
            currentRegistrationNumber='REG002',
            semester=3,
            department=self.department,
            session='2023-24',
            shift='Day',
            currentGroup='A',
            enrollmentDate='2023-01-01',
            status='active'
        )
        
        # Create a teacher
        self.teacher = Teacher.objects.create(
            fullNameBangla='শিক্ষক',
            fullNameEnglish='Teacher One',
            designation='Assistant Professor',
            department=self.department,
            email='teacher@example.com',
            mobileNumber='01712345680',
            employmentStatus='permanent',
            joiningDate='2020-01-01'
        )
    
    def test_department_detail_with_students_by_semester(self):
        """Test GET /api/departments/{id}/ returns students grouped by semester"""
        response = self.client.get(f'/api/departments/{self.department.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check department info
        self.assertEqual(response.data['name'], 'Computer Science')
        self.assertEqual(response.data['studentCount'], 2)
        self.assertEqual(response.data['teacherCount'], 1)
        
        # Check students by semester
        self.assertIn('studentsBySemester', response.data)
        students_by_semester = response.data['studentsBySemester']
        
        # Check semester 1 students
        self.assertIn('1', students_by_semester)
        self.assertEqual(students_by_semester['1']['count'], 1)
        self.assertEqual(len(students_by_semester['1']['students']), 1)
        
        # Check semester 3 students
        self.assertIn('3', students_by_semester)
        self.assertEqual(students_by_semester['3']['count'], 1)
        
        # Check teachers
        self.assertIn('teachers', response.data)
        self.assertEqual(len(response.data['teachers']), 1)
    
    def test_department_students_filter_by_semester(self):
        """Test GET /api/departments/{id}/students/?semester=1"""
        response = self.client.get(f'/api/departments/{self.department.id}/students/?semester=1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['students'][0]['currentRollNumber'], 'CS001')
    
    def test_department_students_filter_by_shift(self):
        """Test GET /api/departments/{id}/students/?shift=Morning"""
        response = self.client.get(f'/api/departments/{self.department.id}/students/?shift=Morning')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['students'][0]['shift'], 'Morning')
    
    def test_department_students_filter_by_semester_and_shift(self):
        """Test GET /api/departments/{id}/students/?semester=1&shift=Morning"""
        response = self.client.get(f'/api/departments/{self.department.id}/students/?semester=1&shift=Morning')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_department_students_filter_invalid_semester(self):
        """Test invalid semester filter returns error"""
        response = self.client.get(f'/api/departments/{self.department.id}/students/?semester=9')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_department_students_filter_invalid_shift(self):
        """Test invalid shift filter returns error"""
        response = self.client.get(f'/api/departments/{self.department.id}/students/?shift=Night')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class DepartmentDeletionProtectionPropertyTest(APITestCase):
    """
    **Feature: django-backend, Property 9: Department deletion protection**
    
    Property: For any department with enrolled students, DELETE requests
    to /api/departments/{id}/ should return HTTP 400 and preserve the department
    
    **Validates: Requirements 10.4**
    """
    
    def setUp(self):
        """Set up test data"""
        self.department = Department.objects.create(
            name='Computer Science',
            code='CS'
        )
    
    @given(
        has_students=st.booleans(),
    )
    def test_department_deletion_protection(self, has_students):
        """
        Test that departments with students cannot be deleted
        """
        from apps.students.models import Student
        
        # Create a student if has_students is True
        if has_students:
            Student.objects.create(
                fullNameBangla='জন ডো',
                fullNameEnglish='John Doe',
                fatherName='Father Name',
                fatherNID='1234567890',
                motherName='Mother Name',
                motherNID='0987654321',
                dateOfBirth='2000-01-01',
                birthCertificateNo='BC123456',
                gender='Male',
                mobileStudent='01712345678',
                guardianMobile='01798765432',
                emergencyContact='Emergency Contact',
                presentAddress={
                    'division': 'Dhaka',
                    'district': 'Dhaka',
                    'subDistrict': 'Mirpur',
                    'policeStation': 'Mirpur',
                    'postOffice': 'Mirpur',
                    'municipality': 'Dhaka',
                    'village': 'Mirpur',
                    'ward': '1'
                },
                permanentAddress={
                    'division': 'Dhaka',
                    'district': 'Dhaka',
                    'subDistrict': 'Mirpur',
                    'policeStation': 'Mirpur',
                    'postOffice': 'Mirpur',
                    'municipality': 'Dhaka',
                    'village': 'Mirpur',
                    'ward': '1'
                },
                highestExam='SSC',
                board='Dhaka',
                group='Science',
                rollNumber='12345',
                registrationNumber='67890',
                passingYear=2018,
                gpa=5.00,
                currentRollNumber='CS001',
                currentRegistrationNumber='REG001',
                semester=1,
                department=self.department,
                session='2023-24',
                shift='Day',
                currentGroup='A',
                enrollmentDate='2023-01-01'
            )
        
        # Try to delete the department
        response = self.client.delete(f'/api/departments/{self.department.id}/')
        
        if has_students:
            # Should fail - department has students
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('error', response.data)
            
            # Verify department still exists
            self.assertTrue(Department.objects.filter(id=self.department.id).exists())
        else:
            # Should succeed - department has no students
            self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
            
            # Verify department was deleted
            self.assertFalse(Department.objects.filter(id=self.department.id).exists())
