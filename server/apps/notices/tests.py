from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Notice, NoticeReadStatus

User = get_user_model()


class NoticeModelTest(TestCase):
    """Test cases for Notice model"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role='institute_head'
        )
        self.student_user = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            role='student'
        )
    
    def test_notice_creation(self):
        """Test creating a notice"""
        notice = Notice.objects.create(
            title='Test Notice',
            content='This is a test notice',
            priority='high',
            created_by=self.admin_user
        )
        
        self.assertEqual(notice.title, 'Test Notice')
        self.assertEqual(notice.content, 'This is a test notice')
        self.assertEqual(notice.priority, 'high')
        self.assertTrue(notice.is_published)
        self.assertEqual(notice.created_by, self.admin_user)
    
    def test_notice_str_representation(self):
        """Test string representation of notice"""
        notice = Notice.objects.create(
            title='Test Notice',
            content='Content',
            priority='normal',
            created_by=self.admin_user
        )
        
        self.assertEqual(str(notice), 'Test Notice (Normal)')
    
    def test_notice_read_count_property(self):
        """Test read_count property"""
        notice = Notice.objects.create(
            title='Test Notice',
            content='Content',
            created_by=self.admin_user
        )
        
        # Initially no reads
        self.assertEqual(notice.read_count, 0)
        
        # Add a read status
        NoticeReadStatus.objects.create(notice=notice, student=self.student_user)
        
        # Refresh from database
        notice.refresh_from_db()
        self.assertEqual(notice.read_count, 1)
    
    def test_notice_read_percentage_property(self):
        """Test read_percentage property"""
        notice = Notice.objects.create(
            title='Test Notice',
            content='Content',
            created_by=self.admin_user
        )
        
        # With no students, percentage should be 0
        self.assertEqual(notice.read_percentage, 0)
        
        # Add a read status
        NoticeReadStatus.objects.create(notice=notice, student=self.student_user)
        
        # With 1 student who read it, should be 100%
        notice.refresh_from_db()
        self.assertEqual(notice.read_percentage, 100.0)
    
    def test_is_low_engagement_property(self):
        """Test is_low_engagement property"""
        notice = Notice.objects.create(
            title='Test Notice',
            content='Content',
            created_by=self.admin_user
        )
        
        # With 0% engagement, should be low engagement
        self.assertTrue(notice.is_low_engagement())
        
        # Add a read status
        NoticeReadStatus.objects.create(notice=notice, student=self.student_user)
        
        # With 100% engagement, should not be low engagement
        notice.refresh_from_db()
        self.assertFalse(notice.is_low_engagement())


class NoticeReadStatusModelTest(TestCase):
    """Test cases for NoticeReadStatus model"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role='institute_head'
        )
        self.student_user = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            role='student'
        )
        self.notice = Notice.objects.create(
            title='Test Notice',
            content='Content',
            created_by=self.admin_user
        )
    
    def test_read_status_creation(self):
        """Test creating a read status"""
        read_status = NoticeReadStatus.objects.create(
            notice=self.notice,
            student=self.student_user
        )
        
        self.assertEqual(read_status.notice, self.notice)
        self.assertEqual(read_status.student, self.student_user)
        self.assertIsNotNone(read_status.read_at)
        self.assertIsNotNone(read_status.created_at)
    
    def test_read_status_str_representation(self):
        """Test string representation of read status"""
        read_status = NoticeReadStatus.objects.create(
            notice=self.notice,
            student=self.student_user
        )
        
        expected = f"{self.student_user.username} read '{self.notice.title}'"
        self.assertEqual(str(read_status), expected)
    
    def test_unique_constraint(self):
        """Test that a student can only have one read status per notice"""
        # Create first read status
        NoticeReadStatus.objects.create(
            notice=self.notice,
            student=self.student_user
        )
        
        # Try to create duplicate - should raise IntegrityError
        with self.assertRaises(Exception):
            NoticeReadStatus.objects.create(
                notice=self.notice,
                student=self.student_user
            )


class NoticeAPITest(APITestCase):
    """Test cases for Notice API endpoints"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role='institute_head'
        )
        self.student_user = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            role='student'
        )
        
        self.notice = Notice.objects.create(
            title='Test Notice',
            content='This is a test notice',
            priority='normal',
            created_by=self.admin_user
        )
    
    def test_admin_can_list_notices(self):
        """Test that admin can list all notices"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('notices:admin-notice-list-create')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Test Notice')
    
    def test_student_cannot_access_admin_endpoints(self):
        """Test that students cannot access admin endpoints"""
        self.client.force_authenticate(user=self.student_user)
        url = reverse('notices:admin-notice-list-create')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)  # No results for students
    
    def test_admin_can_create_notice(self):
        """Test that admin can create a new notice"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('notices:admin-notice-list-create')
        data = {
            'title': 'New Notice',
            'content': 'This is a new notice',
            'priority': 'high',
            'is_published': True
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Notice.objects.count(), 2)
        
        new_notice = Notice.objects.get(title='New Notice')
        self.assertEqual(new_notice.created_by, self.admin_user)
    
    def test_student_can_list_published_notices(self):
        """Test that students can list published notices"""
        self.client.force_authenticate(user=self.student_user)
        url = reverse('notices:student-notice-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Test Notice')
    
    def test_student_cannot_see_unpublished_notices(self):
        """Test that students cannot see unpublished notices"""
        # Create unpublished notice
        Notice.objects.create(
            title='Unpublished Notice',
            content='This should not be visible',
            is_published=False,
            created_by=self.admin_user
        )
        
        self.client.force_authenticate(user=self.student_user)
        url = reverse('notices:student-notice-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)  # Only published notice
        self.assertEqual(response.data['results'][0]['title'], 'Test Notice')
    
    def test_student_can_mark_notice_as_read(self):
        """Test that students can mark notices as read"""
        self.client.force_authenticate(user=self.student_user)
        url = reverse('notices:mark-notice-read', kwargs={'notice_id': self.notice.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_read'])
        self.assertFalse(response.data['already_read'])
        
        # Verify read status was created
        self.assertTrue(
            NoticeReadStatus.objects.filter(
                notice=self.notice,
                student=self.student_user
            ).exists()
        )
    
    def test_student_unread_count(self):
        """Test student unread count endpoint"""
        self.client.force_authenticate(user=self.student_user)
        url = reverse('notices:student-unread-count')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 1)
        self.assertEqual(response.data['total_notices'], 1)
        self.assertEqual(response.data['read_count'], 0)
        
        # Mark notice as read
        NoticeReadStatus.objects.create(notice=self.notice, student=self.student_user)
        
        response = self.client.get(url)
        self.assertEqual(response.data['unread_count'], 0)
        self.assertEqual(response.data['read_count'], 1)
    
    def test_admin_notice_stats(self):
        """Test admin notice statistics endpoint"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('notices:notice-stats')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
        stats = response.data['results'][0]
        self.assertEqual(stats['title'], 'Test Notice')
        self.assertEqual(stats['read_count'], 0)
        self.assertEqual(stats['total_students'], 1)
        self.assertEqual(stats['read_percentage'], 0.0)
        self.assertTrue(stats['is_low_engagement'])