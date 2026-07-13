from datetime import date as _dtdate
import uuid
"""
Class Routine Tests
"""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import time
from .models import ClassRoutine
from apps.departments.models import Department
from apps.teachers.models import Teacher


class ClassRoutineModelTest(TestCase):
    """Unit tests for ClassRoutine model"""
    
    def setUp(self):
        """Set up test data"""
        self.department = Department.objects.create(name=f'Computer Science {uuid.uuid4().hex[:6]}', code=f'CS{uuid.uuid4().hex[:5]}'
        )
        
        self.teacher = Teacher.objects.create(
            fullNameBangla='শিক্ষক',
            fullNameEnglish='Teacher One',
            designation='Assistant Professor',
            department=self.department,
            email='teacher@example.com',
            mobileNumber='01712345678',
            employmentStatus='permanent',
            joiningDate='2020-01-01'
        )
    
    def test_class_routine_creation(self):
        """Test creating a class routine"""
        routine = ClassRoutine.objects.create(
            department=self.department,
            semester=1,
            shift='Morning',
            session='2023-24',
            day_of_week='Sunday',
            start_time=time(8, 0),
            end_time=time(9, 30),
            subject_name='Programming Fundamentals',
            subject_code='CSE101',
            teacher=self.teacher,
            room_number='101'
        )
        
        self.assertEqual(routine.subject_name, 'Programming Fundamentals')
        self.assertEqual(routine.semester, 1)
        self.assertTrue(routine.is_active)
    
    def test_class_routine_str(self):
        """Test string representation"""
        routine = ClassRoutine.objects.create(
            department=self.department,
            semester=1,
            shift='Morning',
            session='2023-24',
            day_of_week='Sunday',
            start_time=time(8, 0),
            end_time=time(9, 30),
            subject_name='Programming Fundamentals',
            subject_code='CSE101',
            room_number='101'
        )
        
        self.assertIn('Programming Fundamentals', str(routine))
        self.assertIn('Sunday', str(routine))


class ClassRoutineAPITest(APITestCase):
    """API tests for Class Routine endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.department = Department.objects.create(name=f'Computer Science {uuid.uuid4().hex[:6]}', code=f'CS{uuid.uuid4().hex[:5]}'
        )
        
        self.teacher = Teacher.objects.create(
            fullNameBangla='শিক্ষক',
            fullNameEnglish='Teacher One',
            designation='Assistant Professor',
            department=self.department,
            email='teacher@example.com',
            mobileNumber='01712345678',
            employmentStatus='permanent',
            joiningDate='2020-01-01'
        )
    
    def test_create_class_routine(self):
        """Test creating a class routine"""
        data = {
            'department': str(self.department.id),
            'semester': 1,
            'shift': 'Morning',
            'session': '2023-24',
            'day_of_week': 'Sunday',
            'start_time': '08:00:00',
            'end_time': '09:30:00',
            'subject_name': 'Programming Fundamentals',
            'subject_code': 'CSE101',
            'teacher': str(self.teacher.id),
            'room_number': '101',
            'is_active': True
        }
        
        response = self.client.post('/api/class-routines/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subject_name'], 'Programming Fundamentals')
    
    def test_create_routine_invalid_time(self):
        """Test creating routine with end time before start time"""
        data = {
            'department': str(self.department.id),
            'semester': 1,
            'shift': 'Morning',
            'session': '2023-24',
            'day_of_week': 'Sunday',
            'start_time': '09:30:00',
            'end_time': '08:00:00',  # Before start time
            'subject_name': 'Programming Fundamentals',
            'subject_code': 'CSE101',
            'room_number': '101'
        }
        
        response = self.client.post('/api/class-routines/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_list_class_routines(self):
        """Test listing class routines"""
        ClassRoutine.objects.create(
            department=self.department,
            semester=1,
            shift='Morning',
            session='2023-24',
            day_of_week='Sunday',
            start_time=time(8, 0),
            end_time=time(9, 30),
            subject_name='Programming Fundamentals',
            subject_code='CSE101',
            room_number='101'
        )
        
        response = self.client.get('/api/class-routines/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_by_department(self):
        """Test filtering routines by department"""
        ClassRoutine.objects.create(
            department=self.department,
            semester=1,
            shift='Morning',
            session='2023-24',
            day_of_week='Sunday',
            start_time=time(8, 0),
            end_time=time(9, 30),
            subject_name='Programming Fundamentals',
            subject_code='CSE101',
            room_number='101'
        )
        
        response = self.client.get(f'/api/class-routines/?department={self.department.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_by_semester_and_shift(self):
        """Test filtering by semester and shift"""
        ClassRoutine.objects.create(
            department=self.department,
            semester=1,
            shift='Morning',
            session='2023-24',
            day_of_week='Sunday',
            start_time=time(8, 0),
            end_time=time(9, 30),
            subject_name='Programming Fundamentals',
            subject_code='CSE101',
            room_number='101'
        )
        
        ClassRoutine.objects.create(
            department=self.department,
            semester=2,
            shift='Day',
            session='2023-24',
            day_of_week='Monday',
            start_time=time(10, 0),
            end_time=time(11, 30),
            subject_name='Data Structures',
            subject_code='CSE102',
            room_number='102'
        )
        
        response = self.client.get('/api/class-routines/?semester=1&shift=Morning')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['semester'], 1)
    
    def test_my_routine_student(self):
        """Test getting student routine"""
        ClassRoutine.objects.create(
            department=self.department,
            semester=1,
            shift='Morning',
            session='2023-24',
            day_of_week='Sunday',
            start_time=time(8, 0),
            end_time=time(9, 30),
            subject_name='Programming Fundamentals',
            subject_code='CSE101',
            room_number='101'
        )
        
        response = self.client.get(
            f'/api/class-routines/my-routine/?department={self.department.id}&semester=1&shift=Morning'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_my_routine_teacher(self):
        """Test getting teacher routine"""
        ClassRoutine.objects.create(
            department=self.department,
            semester=1,
            shift='Morning',
            session='2023-24',
            day_of_week='Sunday',
            start_time=time(8, 0),
            end_time=time(9, 30),
            subject_name='Programming Fundamentals',
            subject_code='CSE101',
            teacher=self.teacher,
            room_number='101'
        )
        
        response = self.client.get(f'/api/class-routines/my-routine/?teacher={self.teacher.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_my_routine_missing_params(self):
        """Test my_routine without required parameters"""
        response = self.client.get('/api/class-routines/my-routine/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_update_class_routine(self):
        """Test updating a class routine"""
        routine = ClassRoutine.objects.create(
            department=self.department,
            semester=1,
            shift='Morning',
            session='2023-24',
            day_of_week='Sunday',
            start_time=time(8, 0),
            end_time=time(9, 30),
            subject_name='Programming Fundamentals',
            subject_code='CSE101',
            room_number='101'
        )
        
        data = {
            'room_number': '201',
            'start_time': '09:00:00',
            'end_time': '10:30:00'
        }
        
        response = self.client.patch(f'/api/class-routines/{routine.id}/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['room_number'], '201')
    
    def test_delete_class_routine(self):
        """Test deleting a class routine"""
        routine = ClassRoutine.objects.create(
            department=self.department,
            semester=1,
            shift='Morning',
            session='2023-24',
            day_of_week='Sunday',
            start_time=time(8, 0),
            end_time=time(9, 30),
            subject_name='Programming Fundamentals',
            subject_code='CSE101',
            room_number='101'
        )
        
        response = self.client.delete(f'/api/class-routines/{routine.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ClassRoutine.objects.filter(id=routine.id).exists())


class ClassEmailAPITest(APITestCase):
    """Tests for the teacher class-students / send-class-email endpoints."""

    @classmethod
    def setUpTestData(cls):
        from apps.authentication.models import User
        from apps.students.models import Student

        cls.department = Department.objects.create(
            name=f'Computer Science {uuid.uuid4().hex[:6]}',
            code=f'CS{uuid.uuid4().hex[:5]}',
        )
        cls.teacher = Teacher.objects.create(
            fullNameBangla='শিক্ষক', fullNameEnglish='Teacher One',
            designation='Lecturer', department=cls.department,
            email='t1@example.com', mobileNumber='01700000001',
            joiningDate='2020-01-01',
        )
        cls.other_teacher = Teacher.objects.create(
            fullNameBangla='শিক্ষক', fullNameEnglish='Teacher Two',
            designation='Lecturer', department=cls.department,
            email='t2@example.com', mobileNumber='01700000002',
            joiningDate='2020-01-01',
        )
        cls.routine = ClassRoutine.objects.create(
            department=cls.department, semester=1, shift='Day',
            session='2023-24', day_of_week='Sunday',
            start_time=time(9, 0), end_time=time(10, 0),
            subject_name='Programming', subject_code='CSE101',
            teacher=cls.teacher, room_number='101',
        )

        # Two active students in the cohort (one without email), plus one in
        # another semester who must never be included.
        def make_student(roll, sem=1, email='', status_='active'):
            return Student.objects.create(
                fullNameEnglish=f'Student {roll}', fullNameBangla='ছাত্র',
                currentRollNumber=roll, currentRegistrationNumber=f'REG-{roll}',
                department=cls.department, semester=sem, shift='Day',
                email=email, status=status_,
            )

        cls.s1 = make_student('CS001', email='s1@example.com')
        cls.s2 = make_student('CS002')  # no email
        make_student('CS003', sem=2, email='other-sem@example.com')

        cls.u_teacher = User.objects.create_user(
            username='t1', email='t1@example.com', password='pw',
            role='teacher', related_profile_id=cls.teacher.id, account_status='active')
        cls.u_other_teacher = User.objects.create_user(
            username='t2', email='t2@example.com', password='pw',
            role='teacher', related_profile_id=cls.other_teacher.id, account_status='active')
        cls.u_student = User.objects.create_user(
            username='s1', email='s1@example.com', password='pw',
            role='student', related_profile_id=cls.s1.id, account_status='active')

    def test_class_students_owner_teacher(self):
        self.client.force_authenticate(self.u_teacher)
        response = self.client.get(f'/api/class-routines/{self.routine.id}/class-students/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(response.data['with_email'], 1)
        rolls = [s['roll'] for s in response.data['students']]
        self.assertEqual(rolls, ['CS001', 'CS002'])

    def test_class_students_other_teacher_forbidden(self):
        self.client.force_authenticate(self.u_other_teacher)
        response = self.client.get(f'/api/class-routines/{self.routine.id}/class-students/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_class_students_student_forbidden(self):
        self.client.force_authenticate(self.u_student)
        response = self.client.get(f'/api/class-routines/{self.routine.id}/class-students/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_send_class_email_requires_subject_and_message(self):
        self.client.force_authenticate(self.u_teacher)
        response = self.client.post(
            f'/api/class-routines/{self.routine.id}/send-class-email/',
            {'subject': ' ', 'message': ''},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_send_class_email_success(self):
        from django.core import mail

        self.client.force_authenticate(self.u_teacher)
        response = self.client.post(
            f'/api/class-routines/{self.routine.id}/send-class-email/',
            {'subject': 'Class test on Sunday', 'message': 'Bring your notes.\nBe on time.'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['recipients'], 1)
        self.assertEqual(response.data['skipped_no_email'], 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, 'Class test on Sunday')
        self.assertIn('s1@example.com', mail.outbox[0].bcc)

    def test_send_class_email_other_teacher_forbidden(self):
        self.client.force_authenticate(self.u_other_teacher)
        response = self.client.post(
            f'/api/class-routines/{self.routine.id}/send-class-email/',
            {'subject': 'Hi', 'message': 'Hello'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
