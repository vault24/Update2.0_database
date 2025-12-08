"""
Alumni Property-Based Tests

These tests use Hypothesis to verify universal properties across all inputs.
"""
from django.test import TestCase
from hypothesis import given, settings, strategies as st
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Alumni
from apps.students.models import Student
from apps.departments.models import Department
from datetime import date, timedelta


class CareerPositionChronologyPropertyTest(TestCase):
    """
    **Feature: django-backend, Property 11: Career position chronology**
    
    Property: For any alumni record, when a new career position is added,
    the careerHistory array should be sorted by startDate in descending order
    (most recent first).
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
        
        self.alumni = Alumni.objects.create(
            student=self.student,
            alumniType='recent',
            graduationYear=2024,
            currentSupportCategory='no_support_needed'
        )
    
    @settings(max_examples=50, deadline=None)
    @given(
        num_positions=st.integers(min_value=2, max_value=10),
    )
    def test_career_positions_sorted_by_date_descending(self, num_positions):
        """
        Test that career positions are always sorted by startDate in descending order
        """
        # Generate random career positions with different dates
        base_date = date(2020, 1, 1)
        positions = []
        
        for i in range(num_positions):
            # Create positions with random dates
            days_offset = i * 100 + (i * 37) % 50  # Semi-random offset
            start_date = base_date + timedelta(days=days_offset)
            
            position = {
                'company': f'Company {i}',
                'position': f'Position {i}',
                'startDate': start_date.isoformat(),
                'description': f'Description {i}'
            }
            positions.append(position)
        
        # Add positions in random order
        import random
        shuffled_positions = positions.copy()
        random.shuffle(shuffled_positions)
        
        for position in shuffled_positions:
            self.alumni.add_career_position(position)
        
        # Refresh from database
        self.alumni.refresh_from_db()
        
        # Verify positions are sorted by startDate descending
        career_history = self.alumni.careerHistory
        
        for i in range(len(career_history) - 1):
            current_date = career_history[i].get('startDate', '')
            next_date = career_history[i + 1].get('startDate', '')
            
            # Current date should be >= next date (descending order)
            self.assertGreaterEqual(
                current_date,
                next_date,
                f"Career history not sorted correctly: {current_date} should be >= {next_date}"
            )
    
    @settings(max_examples=30, deadline=None)
    @given(
        company_name=st.text(min_size=3, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122)),
        position_title=st.text(min_size=3, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122)),
    )
    def test_most_recent_position_becomes_current(self, company_name, position_title):
        """
        Test that the most recent position becomes the current position
        """
        # Add an older position
        old_position = {
            'company': 'Old Company',
            'position': 'Old Position',
            'startDate': '2020-01-01',
        }
        self.alumni.add_career_position(old_position)
        
        # Add a newer position
        new_position = {
            'company': company_name,
            'position': position_title,
            'startDate': '2024-01-01',
        }
        self.alumni.add_career_position(new_position)
        
        # Refresh from database
        self.alumni.refresh_from_db()
        
        # Current position should be the newer one
        self.assertEqual(self.alumni.currentPosition.get('company'), company_name)
        self.assertEqual(self.alumni.currentPosition.get('position'), position_title)


class AlumniAPITests(APITestCase):
    """
    Unit tests for Alumni API endpoints
    """
    
    def setUp(self):
        """Set up test data"""
        # Create departments
        self.dept_cs = Department.objects.create(name='Computer Science', code='CS')
        self.dept_ee = Department.objects.create(name='Electrical Engineering', code='EE')
        
        # Create students
        self.student1 = Student.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father',
            fatherNID='1234567890123456',
            motherName='Mother',
            motherNID='1234567890123456',
            dateOfBirth='2000-01-01',
            birthCertificateNo='BC123',
            gender='Male',
            mobileStudent='01712345678',
            guardianMobile='01712345678',
            emergencyContact='Emergency',
            presentAddress={},
            permanentAddress={},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber='R1',
            registrationNumber='REG1',
            passingYear=2020,
            gpa=3.5,
            currentRollNumber='CR1',
            currentRegistrationNumber='CREG1',
            semester=8,
            department=self.dept_cs,
            session='2020-21',
            shift='Morning',
            currentGroup='A',
            enrollmentDate='2020-01-01',
            semesterResults=[{'semester': i, 'gpa': 3.5} for i in range(1, 9)]
        )
        
        self.student2 = Student.objects.create(
            fullNameBangla='জেন ডো',
            fullNameEnglish='Jane Smith',
            fatherName='Father',
            fatherNID='1234567890123457',
            motherName='Mother',
            motherNID='1234567890123457',
            dateOfBirth='2000-02-01',
            birthCertificateNo='BC124',
            gender='Female',
            mobileStudent='01712345679',
            guardianMobile='01712345679',
            emergencyContact='Emergency',
            presentAddress={},
            permanentAddress={},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber='R2',
            registrationNumber='REG2',
            passingYear=2020,
            gpa=3.8,
            currentRollNumber='CR2',
            currentRegistrationNumber='CREG2',
            semester=8,
            department=self.dept_ee,
            session='2021-22',
            shift='Day',
            currentGroup='A',
            enrollmentDate='2021-01-01',
            semesterResults=[{'semester': i, 'gpa': 3.8} for i in range(1, 9)]
        )
        
        # Create alumni
        self.alumni1 = Alumni.objects.create(
            student=self.student1,
            alumniType='recent',
            graduationYear=2024,
            currentSupportCategory='no_support_needed'
        )
        
        self.alumni2 = Alumni.objects.create(
            student=self.student2,
            alumniType='established',
            graduationYear=2023,
            currentSupportCategory='receiving_support'
        )
    
    def test_list_alumni(self):
        """Test listing alumni"""
        response = self.client.get('/api/alumni/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_filter_alumni_by_department(self):
        """Test filtering alumni by department"""
        response = self.client.get(f'/api/alumni/?student__department={self.dept_cs.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(
            response.data['results'][0]['student']['department']['code'],
            'CS'
        )
    
    def test_filter_alumni_by_graduation_year(self):
        """Test filtering alumni by graduation year"""
        response = self.client.get('/api/alumni/?graduationYear=2024')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['graduationYear'], 2024)
    
    def test_search_alumni_by_name(self):
        """Test searching alumni by name"""
        response = self.client.get('/api/alumni/search/?q=John')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertIn('John', response.data['results'][0]['student']['fullNameEnglish'])
    
    def test_search_alumni_by_department_name(self):
        """Test searching alumni by department name"""
        response = self.client.get('/api/alumni/search/?q=Computer')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_search_alumni_with_department_filter(self):
        """Test searching alumni with department filter"""
        response = self.client.get(f'/api/alumni/search/?department={self.dept_cs.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_search_alumni_with_graduation_year_filter(self):
        """Test searching alumni with graduation year filter"""
        response = self.client.get('/api/alumni/search/?graduationYear=2024')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['graduationYear'], 2024)
    
    def test_search_alumni_invalid_graduation_year(self):
        """Test searching with invalid graduation year"""
        response = self.client.get('/api/alumni/search/?graduationYear=invalid')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_alumni_stats(self):
        """Test alumni statistics endpoint"""
        response = self.client.get('/api/alumni/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['recent'], 1)
        self.assertEqual(response.data['established'], 1)
        self.assertIn('byDepartment', response.data)
        self.assertIn('byYear', response.data)
