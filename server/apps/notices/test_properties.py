"""
Property-based tests for the notices system using Hypothesis
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from hypothesis import given, strategies as st, settings
from hypothesis.extra.django import from_model
from .models import Notice, NoticeReadStatus

User = get_user_model()


class NoticePropertyTests(TestCase):
    """Property-based tests for Notice functionality"""
    
    def setUp(self):
        """Set up test users"""
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='institute_head'
        )
        self.student_user = User.objects.create_user(
            username='student_test',
            email='student@test.com',
            password='testpass123',
            role='student'
        )
    
    @given(
        title=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip()),
        priority=st.sampled_from(['low', 'normal', 'high'])
    )
    @settings(max_examples=100)
    def test_property_1_notice_creation_persistence(self, title, content, priority):
        """
        **Feature: notices-updates-system, Property 1: Notice Creation Persistence**
        For any valid notice with title and content, creating it should result in 
        the notice being saved to the database and marked as published
        **Validates: Requirements 1.2**
        """
        # Create notice
        notice = Notice.objects.create(
            title=title,
            content=content,
            priority=priority,
            created_by=self.admin_user
        )
        
        # Verify it was saved to database
        saved_notice = Notice.objects.get(id=notice.id)
        self.assertEqual(saved_notice.title, title)
        self.assertEqual(saved_notice.content, content)
        self.assertEqual(saved_notice.priority, priority)
        self.assertEqual(saved_notice.created_by, self.admin_user)
        
        # Verify it's marked as published by default
        self.assertTrue(saved_notice.is_published)
    
    @given(
        title=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip()),
        priority=st.sampled_from(['low', 'normal', 'high'])
    )
    @settings(max_examples=100)
    def test_property_2_automatic_timestamping(self, title, content, priority):
        """
        **Feature: notices-updates-system, Property 2: Automatic Timestamping**
        For any notice creation operation, the system should automatically assign a creation timestamp
        **Validates: Requirements 1.3**
        """
        # Create notice
        notice = Notice.objects.create(
            title=title,
            content=content,
            priority=priority,
            created_by=self.admin_user
        )
        
        # Verify timestamps are automatically set
        self.assertIsNotNone(notice.created_at)
        self.assertIsNotNone(notice.updated_at)
        
        # Verify created_at and updated_at are close in time (within 1 second)
        time_diff = abs((notice.updated_at - notice.created_at).total_seconds())
        self.assertLess(time_diff, 1.0)
    
    @given(
        title=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip()),
        is_published=st.booleans()
    )
    @settings(max_examples=100)
    def test_property_3_publication_visibility(self, title, content, is_published):
        """
        **Feature: notices-updates-system, Property 3: Publication Visibility**
        For any notice that is published, it should immediately become visible in student queries
        **Validates: Requirements 1.4**
        """
        # Create notice with specified publication status
        notice = Notice.objects.create(
            title=title,
            content=content,
            is_published=is_published,
            created_by=self.admin_user
        )
        
        # Query for published notices (as students would see)
        published_notices = Notice.objects.filter(is_published=True)
        
        if is_published:
            # If published, should be visible in student queries
            self.assertIn(notice, published_notices)
        else:
            # If not published, should not be visible in student queries
            self.assertNotIn(notice, published_notices)
    
    @given(
        title=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip()),
        priority=st.sampled_from(['low', 'normal', 'high'])
    )
    @settings(max_examples=100)
    def test_property_4_priority_storage_and_ordering(self, title, content, priority):
        """
        **Feature: notices-updates-system, Property 4: Priority Storage and Ordering**
        For any notice with a priority level, the system should store the priority 
        and order notices according to priority in displays
        **Validates: Requirements 1.5**
        """
        # Create notice with specified priority
        notice = Notice.objects.create(
            title=title,
            content=content,
            priority=priority,
            created_by=self.admin_user
        )
        
        # Verify priority is stored correctly
        saved_notice = Notice.objects.get(id=notice.id)
        self.assertEqual(saved_notice.priority, priority)
        
        # Create notices with different priorities to test ordering
        high_notice = Notice.objects.create(
            title="High Priority",
            content="High priority content",
            priority='high',
            created_by=self.admin_user
        )
        low_notice = Notice.objects.create(
            title="Low Priority", 
            content="Low priority content",
            priority='low',
            created_by=self.admin_user
        )
        
        # Test that ordering by priority works correctly
        # High priority should come before low priority
        notices_by_priority = Notice.objects.order_by('-priority', '-created_at')
        high_index = list(notices_by_priority).index(high_notice)
        low_index = list(notices_by_priority).index(low_notice)
        
        # High priority notice should appear before low priority notice
        # (lower index means earlier in the list)
        self.assertLess(high_index, low_index)
    
    @given(
        original_title=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        original_content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip()),
        new_title=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        new_content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip()),
        new_priority=st.sampled_from(['low', 'normal', 'high'])
    )
    @settings(max_examples=100)
    def test_property_5_notice_editability(self, original_title, original_content, 
                                         new_title, new_content, new_priority):
        """
        **Feature: notices-updates-system, Property 5: Notice Editability**
        For any existing notice, an admin should be able to modify its title, content, 
        and priority, and changes should be persisted
        **Validates: Requirements 2.2**
        """
        # Create original notice
        notice = Notice.objects.create(
            title=original_title,
            content=original_content,
            priority='normal',
            created_by=self.admin_user
        )
        
        original_updated_at = notice.updated_at
        
        # Modify the notice
        notice.title = new_title
        notice.content = new_content
        notice.priority = new_priority
        notice.save()
        
        # Verify changes are persisted
        updated_notice = Notice.objects.get(id=notice.id)
        self.assertEqual(updated_notice.title, new_title)
        self.assertEqual(updated_notice.content, new_content)
        self.assertEqual(updated_notice.priority, new_priority)
        
        # Verify updated_at timestamp changed
        self.assertGreater(updated_notice.updated_at, original_updated_at)
    
    @given(
        title=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip())
    )
    @settings(max_examples=100)
    def test_property_6_deletion_completeness(self, title, content):
        """
        **Feature: notices-updates-system, Property 6: Deletion Completeness**
        For any notice that is deleted, it should be removed from both admin and student views completely
        **Validates: Requirements 2.3**
        """
        # Create notice
        notice = Notice.objects.create(
            title=title,
            content=content,
            created_by=self.admin_user
        )
        
        notice_id = notice.id
        
        # Verify notice exists
        self.assertTrue(Notice.objects.filter(id=notice_id).exists())
        
        # Delete notice
        notice.delete()
        
        # Verify notice is completely removed from database
        self.assertFalse(Notice.objects.filter(id=notice_id).exists())
        
        # Verify it's not in admin view (all notices)
        admin_notices = Notice.objects.all()
        self.assertNotIn(notice, admin_notices)
        
        # Verify it's not in student view (published notices)
        student_notices = Notice.objects.filter(is_published=True)
        self.assertNotIn(notice, student_notices)
    
    @given(
        title=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip())
    )
    @settings(max_examples=100)
    def test_property_7_unpublish_visibility_rules(self, title, content):
        """
        **Feature: notices-updates-system, Property 7: Unpublish Visibility Rules**
        For any notice that is unpublished, it should be hidden from student view 
        while remaining visible in admin view
        **Validates: Requirements 2.4**
        """
        # Create published notice
        notice = Notice.objects.create(
            title=title,
            content=content,
            is_published=True,
            created_by=self.admin_user
        )
        
        # Verify it's initially visible to both admin and students
        admin_notices = Notice.objects.all()
        student_notices = Notice.objects.filter(is_published=True)
        self.assertIn(notice, admin_notices)
        self.assertIn(notice, student_notices)
        
        # Unpublish the notice
        notice.is_published = False
        notice.save()
        
        # Verify it's still visible in admin view
        admin_notices = Notice.objects.all()
        self.assertIn(notice, admin_notices)
        
        # Verify it's hidden from student view
        student_notices = Notice.objects.filter(is_published=True)
        self.assertNotIn(notice, student_notices)
    
    @given(
        title=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip()),
        new_content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip())
    )
    @settings(max_examples=100)
    def test_property_8_update_timestamping(self, title, content, new_content):
        """
        **Feature: notices-updates-system, Property 8: Update Timestamping**
        For any notice update operation, the system should record a new modification timestamp
        **Validates: Requirements 2.5**
        """
        # Create notice
        notice = Notice.objects.create(
            title=title,
            content=content,
            created_by=self.admin_user
        )
        
        original_updated_at = notice.updated_at
        
        # Wait a small amount to ensure timestamp difference
        import time
        time.sleep(0.01)
        
        # Update the notice
        notice.content = new_content
        notice.save()
        
        # Verify updated_at timestamp was updated
        updated_notice = Notice.objects.get(id=notice.id)
        self.assertGreater(updated_notice.updated_at, original_updated_at)


class NoticeReadStatusPropertyTests(TestCase):
    """Property-based tests for NoticeReadStatus functionality"""
    
    def setUp(self):
        """Set up test users"""
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='institute_head'
        )
        self.student_user = User.objects.create_user(
            username='student_test',
            email='student@test.com',
            password='testpass123',
            role='student'
        )
    
    @given(
        title=st.text(min_size=1, max_size=255).filter(lambda x: x.strip()),
        content=st.text(min_size=1, max_size=1000).filter(lambda x: x.strip())
    )
    @settings(max_examples=100)
    def test_property_25_read_status_data_integrity(self, title, content):
        """
        **Feature: notices-updates-system, Property 25: Read Status Data Integrity**
        For any student interaction with notices, the read status should be accurately 
        recorded and retrievable without data loss
        **Validates: Requirements 6.5**
        """
        # Create notice
        notice = Notice.objects.create(
            title=title,
            content=content,
            created_by=self.admin_user
        )
        
        # Initially, student should not have read the notice
        self.assertFalse(
            NoticeReadStatus.objects.filter(
                notice=notice,
                student=self.student_user
            ).exists()
        )
        
        # Mark notice as read
        read_status = NoticeReadStatus.objects.create(
            notice=notice,
            student=self.student_user
        )
        
        # Verify read status is accurately recorded
        saved_read_status = NoticeReadStatus.objects.get(id=read_status.id)
        self.assertEqual(saved_read_status.notice, notice)
        self.assertEqual(saved_read_status.student, self.student_user)
        self.assertIsNotNone(saved_read_status.read_at)
        self.assertIsNotNone(saved_read_status.created_at)
        
        # Verify read status is retrievable
        retrieved_read_status = NoticeReadStatus.objects.filter(
            notice=notice,
            student=self.student_user
        ).first()
        
        self.assertIsNotNone(retrieved_read_status)
        self.assertEqual(retrieved_read_status.id, read_status.id)
        
        # Verify referential integrity
        self.assertEqual(retrieved_read_status.notice.id, notice.id)
        self.assertEqual(retrieved_read_status.student.id, self.student_user.id)