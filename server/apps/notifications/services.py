"""
Notification Service Layer
Handles business logic for creating and managing notifications
"""

from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    Notification, NotificationPreference, NotificationPreferenceType,
    DeliveryLog, NOTIFICATION_TYPES
)


class NotificationService:
    """Service for managing notifications"""

    @staticmethod
    def create_notification(recipient, notification_type, title, message, data=None):
        """
        Create a notification for a user
        
        Args:
            recipient: User object
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            data: Additional data (optional)
            
        Returns:
            Notification object
        """
        if data is None:
            data = {}

        # Check user preferences
        if not NotificationService.should_deliver(recipient, notification_type):
            return None

        # Create notification
        notification = Notification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data
        )

        # Create delivery log
        DeliveryLog.objects.create(
            notification=notification,
            channel='in_app',
            status='pending'
        )

        return notification

    @staticmethod
    def should_deliver(user, notification_type):
        """
        Check if a notification should be delivered to a user
        
        Args:
            user: User object
            notification_type: Type of notification
            
        Returns:
            Boolean indicating if notification should be delivered
        """
        try:
            preference = NotificationPreference.objects.get(user=user)
            pref_type = NotificationPreferenceType.objects.get(
                preference=preference,
                notification_type=notification_type
            )
            return pref_type.enabled
        except (NotificationPreference.DoesNotExist, NotificationPreferenceType.DoesNotExist):
            # If no preference exists, default to enabled
            return True

    @staticmethod
    def create_announcement(title, message, user_group, notification_type='system_announcement', data=None):
        """
        Create an announcement for a group of users
        
        Args:
            title: Announcement title
            message: Announcement message
            user_group: QuerySet of User objects
            notification_type: Type of notification (default: system_announcement)
            data: Additional data (optional)
            
        Returns:
            List of created Notification objects
        """
        if data is None:
            data = {}

        notifications = []
        for user in user_group:
            notification = NotificationService.create_notification(
                recipient=user,
                notification_type=notification_type,
                title=title,
                message=message,
                data=data
            )
            if notification:
                notifications.append(notification)

        return notifications

    @staticmethod
    def mark_as_read(notification):
        """Mark a notification as read"""
        notification.mark_as_read()
        return notification

    @staticmethod
    def archive_notification(notification):
        """Archive a notification"""
        notification.archive()
        return notification

    @staticmethod
    def delete_notification(notification):
        """Soft delete a notification"""
        notification.delete_notification()
        return notification

    @staticmethod
    def get_user_notifications(user, status=None, notification_type=None, include_deleted=False):
        """
        Get notifications for a user
        
        Args:
            user: User object
            status: Filter by status (optional)
            notification_type: Filter by type (optional)
            include_deleted: Include deleted notifications (default: False)
            
        Returns:
            QuerySet of Notification objects
        """
        queryset = Notification.objects.filter(recipient=user)

        if status:
            queryset = queryset.filter(status=status)

        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)

        if not include_deleted:
            queryset = queryset.exclude(status='deleted')

        return queryset.order_by('-created_at')

    @staticmethod
    def get_unread_count(user):
        """Get count of unread notifications for a user"""
        return Notification.objects.filter(
            recipient=user,
            status='unread'
        ).count()

    @staticmethod
    def initialize_user_preferences(user):
        """Initialize default notification preferences for a new user"""
        preference, created = NotificationPreference.objects.get_or_create(user=user)

        if created:
            for notif_type, _ in NOTIFICATION_TYPES:
                NotificationPreferenceType.objects.get_or_create(
                    preference=preference,
                    notification_type=notif_type,
                    defaults={'enabled': True, 'email_enabled': False}
                )

        return preference


class DeliveryService:
    """Service for managing notification delivery"""

    @staticmethod
    def mark_as_delivered(delivery_log):
        """Mark a delivery as successful"""
        delivery_log.status = 'delivered'
        delivery_log.save()
        return delivery_log

    @staticmethod
    def mark_as_failed(delivery_log, error_message=None):
        """Mark a delivery as failed"""
        delivery_log.status = 'failed'
        if error_message:
            delivery_log.error_message = error_message
        delivery_log.save()
        return delivery_log

    @staticmethod
    def retry_delivery(delivery_log):
        """Retry a failed delivery"""
        if delivery_log.retry_count < 3:
            delivery_log.status = 'pending'
            delivery_log.retry_count += 1
            delivery_log.error_message = None
            delivery_log.save()
            return True
        return False

    @staticmethod
    def get_pending_deliveries():
        """Get all pending deliveries"""
        return DeliveryLog.objects.filter(status='pending')

    @staticmethod
    def get_failed_deliveries():
        """Get all failed deliveries"""
        return DeliveryLog.objects.filter(status='failed')

    @staticmethod
    def get_delivery_logs_for_notification(notification):
        """Get all delivery logs for a notification"""
        return DeliveryLog.objects.filter(notification=notification)
