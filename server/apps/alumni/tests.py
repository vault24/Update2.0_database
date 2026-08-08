import uuid
"""
Alumni Property-Based Tests

These tests use Hypothesis to verify universal properties across all inputs.
"""
from django.test import TestCase
from hypothesis.extra.django import TestCase as HypothesisTestCase
from hypothesis import given, settings, strategies as st
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Alumni
from apps.students.models import Student
from apps.departments.models import Department
from datetime import date, timedelta


class CareerPositionChronologyPropertyTest(HypothesisTestCase):
    """
    **Feature: django-backend, Property 11: Career position ordering**

    Property: careerHistory is ordered MOST RECENTLY ADDED first.

    This replaced the original "sorted by startDate descending" property in
    Jul 2026: sorting by date alone pushed a freshly added entry below older
    ones whenever it started earlier, so a student who had just saved a role
    could not see it. `currentPosition` is still date-driven — it is derived
    from the data (see Alumni.recompute_current_position), not from this
    display order.
    """
    
    def setUp(self):
        """Create test department and student"""
        _rs = uuid.uuid4().hex[:8]
        self.department = Department.objects.create(name=f'Computer Science {uuid.uuid4().hex[:6]}', code=f'CSE{uuid.uuid4().hex[:5]}'
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
            currentRollNumber=f'CR{_rs}',
            currentRegistrationNumber=f'CREG{_rs}',
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
    def test_career_positions_ordered_newest_added_first(self, num_positions):
        """
        Whatever order positions are saved in — and whatever their start dates —
        the list always reads back in reverse insertion order.
        """
        # Hypothesis reuses setUp state across examples, so start each example
        # from an empty history.
        self.alumni.careerHistory = []
        self.alumni.currentPosition = None
        self.alumni.save(update_fields=['careerHistory', 'currentPosition'])

        # Generate positions with distinct dates, then save them shuffled so
        # insertion order and date order deliberately disagree.
        base_date = date(2020, 1, 1)
        positions = []

        for i in range(num_positions):
            days_offset = i * 100 + (i * 37) % 50  # Semi-random offset
            start_date = base_date + timedelta(days=days_offset)
            positions.append({
                'company': f'Company {i}',
                'position': f'Position {i}',
                'startDate': start_date.isoformat(),
                'description': f'Description {i}',
            })

        import random
        shuffled_positions = positions.copy()
        random.shuffle(shuffled_positions)

        for position in shuffled_positions:
            self.alumni.add_career_position(position)

        self.alumni.refresh_from_db()
        career_history = self.alumni.careerHistory

        # The list is the save order, reversed.
        self.assertEqual(
            [c['position'] for c in career_history],
            [p['position'] for p in reversed(shuffled_positions)],
            'Career history must read back newest-added first',
        )

        # And the insertion stamps must be non-increasing, which is what the
        # ordering actually keys on.
        stamps = [c.get('addedAt', '') for c in career_history]
        self.assertEqual(stamps, sorted(stamps, reverse=True))

    @settings(max_examples=25, deadline=None)
    @given(num_positions=st.integers(min_value=2, max_value=8))
    def test_current_position_is_the_latest_by_date_not_by_insertion(self, num_positions):
        """
        `currentPosition` must stay date-driven even though the list is ordered
        by insertion — adding an OLD role last must not make it current.
        """
        self.alumni.careerHistory = []
        self.alumni.currentPosition = None
        self.alumni.save(update_fields=['careerHistory', 'currentPosition'])

        base_date = date(2020, 1, 1)
        positions = [
            {
                'company': f'Company {i}',
                'position': f'Position {i}',
                'startDate': (base_date + timedelta(days=i * 200)).isoformat(),
                'description': '',
            }
            for i in range(num_positions)
        ]
        latest = max(positions, key=lambda p: p['startDate'])

        import random
        shuffled = positions.copy()
        random.shuffle(shuffled)
        for position in shuffled:
            self.alumni.add_career_position(position)

        self.alumni.refresh_from_db()
        self.assertEqual(self.alumni.currentPosition['position'], latest['position'])
    
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
        # The alumni API is deny-by-default (IsAuthenticated / CanManageAlumni);
        # authenticate as a Registrar so list/search/stats/manage endpoints are
        # reachable — reflects the intended security model.
        from django.contrib.auth import get_user_model
        _User = get_user_model()
        _asfx = uuid.uuid4().hex[:8]
        self.admin_user = _User.objects.create_user(
            username=f'alumnitest_admin_{_asfx}', email=f'alumnitest_admin_{_asfx}@example.com',
            password='testpass123', role='registrar', account_status='active',
        )
        self.client.force_authenticate(user=self.admin_user)
        # Create departments
        self.dept_cs = Department.objects.create(name=f'Computer Science {uuid.uuid4().hex[:6]}', code=f'CS{uuid.uuid4().hex[:5]}')
        self.dept_ee = Department.objects.create(name=f'Electrical Engineering {uuid.uuid4().hex[:6]}', code=f'EE{uuid.uuid4().hex[:5]}')
        
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
            self.dept_cs.code
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


class AlumniResubmitApplicationTests(APITestCase):
    """
    Reapply flow: a self-registered alumnus whose application was rejected can
    edit and resubmit it. The existing records are updated in place and the
    application resets to 'pending'; an approved application cannot be resubmitted.
    """

    def setUp(self):
        import json
        from django.contrib.auth import get_user_model
        from apps.alumni.services import create_alumni_from_essentials
        self._json = json
        _User = get_user_model()
        sfx = uuid.uuid4().hex[:8]
        self.dept = Department.objects.create(name=f'CSE {sfx}', code=f'C{sfx[:5]}')
        self.dept2 = Department.objects.create(name=f'EEE {sfx}', code=f'E{sfx[:5]}')
        self.alumni = create_alumni_from_essentials(
            data={'fullNameEnglish': 'Old Name', 'department': str(self.dept.id),
                  'graduationYear': '2015', 'bio': 'old bio'},
            registration_source='self_registration',
            review_status='rejected',
        )
        self.user = _User.objects.create_user(
            username=f'alum_{sfx}', email=f'alum_{sfx}@example.com',
            password='testpass123', role='alumni', account_status='active',
        )
        self.user.related_profile_id = self.alumni.student.id
        self.user.save()

    def _post(self, payload):
        return self.client.post(
            '/api/alumni/resubmit_my_application/',
            {'payload': self._json.dumps(payload), 'documentMeta': '[]'},
            format='multipart',
        )

    def test_resubmit_updates_and_resets_to_pending(self):
        self.client.force_authenticate(user=self.user)
        resp = self._post({
            'fullNameEnglish': 'New Name',
            'department': str(self.dept2.id),
            'graduationYear': '2018',
            'bio': 'updated bio',
            'session': '2014-15',
            'shift': 'Morning',
            'currentRollNumber': 'BTEB-2015-001',
            'currentRegistrationNumber': 'REG-2015-001',
            'mobileStudent': '01712345678',
            'presentAddress': {'division': 'Dhaka', 'district': 'Dhaka'},
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.alumni.refresh_from_db()
        self.alumni.student.refresh_from_db()
        self.assertEqual(self.alumni.reviewStatus, 'pending')
        self.assertEqual(self.alumni.student.fullNameEnglish, 'New Name')
        self.assertEqual(self.alumni.student.department_id, self.dept2.id)
        self.assertEqual(self.alumni.graduationYear, 2018)
        self.assertEqual(self.alumni.student.currentRollNumber, 'BTEB-2015-001')
        self.assertEqual(self.alumni.student.currentRegistrationNumber, 'REG-2015-001')

    def test_resubmit_requires_self_registration_fields(self):
        self.client.force_authenticate(user=self.user)
        resp = self._post({
            'fullNameEnglish': 'New Name',
            'department': str(self.dept.id),
            'presentAddress': {'division': 'Dhaka', 'district': 'Dhaka'},
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Session', resp.data['error'])

    def test_resubmit_blocked_for_approved(self):
        self.alumni.reviewStatus = 'approved'
        self.alumni.save(update_fields=['reviewStatus'])
        self.client.force_authenticate(user=self.user)
        resp = self._post({'fullNameEnglish': 'X', 'department': str(self.dept.id)})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resubmit_requires_existing_application(self):
        from django.contrib.auth import get_user_model
        _User = get_user_model()
        sfx = uuid.uuid4().hex[:8]
        stranger = _User.objects.create_user(
            username=f'nobody_{sfx}', email=f'nobody_{sfx}@example.com',
            password='testpass123', role='student', account_status='active',
        )
        self.client.force_authenticate(user=stranger)
        resp = self._post({'fullNameEnglish': 'X', 'department': str(self.dept.id)})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
