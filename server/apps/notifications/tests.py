from django.test import TestCase
from django.contrib.auth.models import User
from .models import Notification, NotificationPreference, NotificationPreferenceType, DeliveryLog


class NotificationModelTest(TestCase):
    """Test cases for Notification model"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_create_notification(self):
        """Test creating a notification"""
        notification = Notification.objects.create(
            recipient=self.user,
            notification_type='application_status',
            title='Test Notification',
            message='This is a test notification'
        )
        self.assertEqual(notification.title, 'Test Notification')
        self.assertEqual(notification.status, 'unread')
        self.assertIsNone(notification.read_at)

    def test_mark_as_read(self):
        """Test marking notification as read"""
        notification = Notification.objects.create(
            recipient=self.user,
            notification_type='application_status',
            title='Test Notification',
            message='This is a test notification'
        )
        notification.mark_as_read()
        self.assertEqual(notification.status, 'read')
        self.assertIsNotNone(notification.read_at)

    def test_archive_notification(self):
        """Test archiving a notification"""
        notification = Notification.objects.create(
            recipient=self.user,
            notification_type='application_status',
            title='Test Notification',
            message='This is a test notification'
        )
        notification.archive()
        self.assertEqual(notification.status, 'archived')
        self.assertIsNotNone(notification.archived_at)

    def test_soft_delete_notification(self):
        """Test soft deleting a notification"""
        notification = Notification.objects.create(
            recipient=self.user,
            notification_type='application_status',
            title='Test Notification',
            message='This is a test notification'
        )
        notification.delete_notification()
        self.assertEqual(notification.status, 'deleted')
        self.assertIsNotNone(notification.deleted_at)


class NotificationPreferenceTest(TestCase):
    """Test cases for NotificationPreference model"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_create_preference(self):
        """Test creating a notification preference"""
        preference = NotificationPreference.objects.create(user=self.user)
        self.assertEqual(preference.user, self.user)

    def test_create_preference_type(self):
        """Test creating a preference type"""
        preference = NotificationPreference.objects.create(user=self.user)
        pref_type = NotificationPreferenceType.objects.create(
            preference=preference,
            notification_type='application_status',
            enabled=True,
            email_enabled=False
        )
        self.assertEqual(pref_type.notification_type, 'application_status')
        self.assertTrue(pref_type.enabled)
        self.assertFalse(pref_type.email_enabled)


class DeliveryLogTest(TestCase):
    """Test cases for DeliveryLog model"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.notification = Notification.objects.create(
            recipient=self.user,
            notification_type='application_status',
            title='Test Notification',
            message='This is a test notification'
        )

    def test_create_delivery_log(self):
        """Test creating a delivery log"""
        log = DeliveryLog.objects.create(
            notification=self.notification,
            channel='in_app',
            status='pending'
        )
        self.assertEqual(log.status, 'pending')
        self.assertEqual(log.retry_count, 0)

    def test_delivery_log_retry_count(self):
        """Test delivery log retry count"""
        log = DeliveryLog.objects.create(
            notification=self.notification,
            channel='in_app',
            status='failed',
            retry_count=2
        )
        self.assertEqual(log.retry_count, 2)


class NotificationServiceTest(TestCase):
    """Test cases for NotificationService"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_create_notification_with_service(self):
        """Test creating notification through service"""
        from .services import NotificationService
        
        notification = NotificationService.create_notification(
            recipient=self.user,
            notification_type='application_status',
            title='Test',
            message='Test message'
        )
        
        self.assertIsNotNone(notification)
        self.assertEqual(notification.recipient, self.user)
        self.assertEqual(notification.status, 'unread')

    def test_should_deliver_with_enabled_preference(self):
        """Test should_deliver with enabled preference"""
        from .services import NotificationService
        
        # Create preference
        preference = NotificationPreference.objects.create(user=self.user)
        NotificationPreferenceType.objects.create(
            preference=preference,
            notification_type='application_status',
            enabled=True
        )
        
        should_deliver = NotificationService.should_deliver(
            self.user,
            'application_status'
        )
        self.assertTrue(should_deliver)

    def test_should_deliver_with_disabled_preference(self):
        """Test should_deliver with disabled preference"""
        from .services import NotificationService
        
        # Create preference
        preference = NotificationPreference.objects.create(user=self.user)
        NotificationPreferenceType.objects.create(
            preference=preference,
            notification_type='application_status',
            enabled=False
        )
        
        should_deliver = NotificationService.should_deliver(
            self.user,
            'application_status'
        )
        self.assertFalse(should_deliver)

    def test_get_unread_count(self):
        """Test getting unread notification count"""
        from .services import NotificationService
        
        # Create notifications
        Notification.objects.create(
            recipient=self.user,
            notification_type='application_status',
            title='Test 1',
            message='Message 1',
            status='unread'
        )
        Notification.objects.create(
            recipient=self.user,
            notification_type='application_status',
            title='Test 2',
            message='Message 2',
            status='read'
        )
        
        count = NotificationService.get_unread_count(self.user)
        self.assertEqual(count, 1)

    def test_initialize_user_preferences(self):
        """Test initializing user preferences"""
        from .services import NotificationService
        
        preference = NotificationService.initialize_user_preferences(self.user)
        
        self.assertIsNotNone(preference)
        self.assertEqual(preference.user, self.user)
        
        # Check that all notification types have preferences
        type_prefs = NotificationPreferenceType.objects.filter(preference=preference)
        self.assertEqual(type_prefs.count(), 6)  # 6 notification types


class DeliveryServiceTest(TestCase):
    """Test cases for DeliveryService"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.notification = Notification.objects.create(
            recipient=self.user,
            notification_type='application_status',
            title='Test',
            message='Test message'
        )
        self.delivery_log = DeliveryLog.objects.create(
            notification=self.notification,
            channel='in_app',
            status='pending'
        )

    def test_mark_as_delivered(self):
        """Test marking delivery as delivered"""
        from .services import DeliveryService
        
        log = DeliveryService.mark_as_delivered(self.delivery_log)
        
        self.assertEqual(log.status, 'delivered')

    def test_mark_as_failed(self):
        """Test marking delivery as failed"""
        from .services import DeliveryService
        
        log = DeliveryService.mark_as_failed(
            self.delivery_log,
            error_message='Test error'
        )
        
        self.assertEqual(log.status, 'failed')
        self.assertEqual(log.error_message, 'Test error')

    def test_retry_delivery(self):
        """Test retrying a failed delivery"""
        from .services import DeliveryService
        
        self.delivery_log.status = 'failed'
        self.delivery_log.retry_count = 1
        self.delivery_log.save()
        
        result = DeliveryService.retry_delivery(self.delivery_log)
        
        self.assertTrue(result)
        self.delivery_log.refresh_from_db()
        self.assertEqual(self.delivery_log.status, 'pending')
        self.assertEqual(self.delivery_log.retry_count, 2)

    def test_retry_delivery_max_attempts(self):
        """Test retry fails after max attempts"""
        from .services import DeliveryService
        
        self.delivery_log.status = 'failed'
        self.delivery_log.retry_count = 3
        self.delivery_log.save()
        
        result = DeliveryService.retry_delivery(self.delivery_log)
        
        self.assertFalse(result)

    def test_get_pending_deliveries(self):
        """Test getting pending deliveries"""
        from .services import DeliveryService
        
        pending = DeliveryService.get_pending_deliveries()
        
        self.assertEqual(pending.count(), 1)
        self.assertEqual(pending.first().status, 'pending')

    def test_get_failed_deliveries(self):
        """Test getting failed deliveries"""
        from .services import DeliveryService
        
        self.delivery_log.status = 'failed'
        self.delivery_log.save()
        
        failed = DeliveryService.get_failed_deliveries()
        
        self.assertEqual(failed.count(), 1)
        self.assertEqual(failed.first().status, 'failed')
