from django.db import models
from django.conf import settings
from django.utils import timezone

# Notification type choices
NOTIFICATION_TYPES = [
    ('application_status', 'Application Status'),
    ('document_approval', 'Document Approval'),
    ('student_admission', 'Student Admission'),
    ('system_announcement', 'System Announcement'),
    ('deadline_reminder', 'Deadline Reminder'),
    ('account_activity', 'Account Activity'),
]

# Notification status choices
NOTIFICATION_STATUS = [
    ('unread', 'Unread'),
    ('read', 'Read'),
    ('archived', 'Archived'),
    ('deleted', 'Deleted'),
]

# Delivery channel choices
DELIVERY_CHANNELS = [
    ('in_app', 'In-App'),
    ('email', 'Email'),
]

# Delivery status choices
DELIVERY_STATUS = [
    ('pending', 'Pending'),
    ('delivered', 'Delivered'),
    ('failed', 'Failed'),
]


class Notification(models.Model):
    """Model for storing notifications"""
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=NOTIFICATION_STATUS, default='unread')
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'status']),
            models.Index(fields=['notification_type']),
        ]

    def __str__(self):
        return f"{self.title} - {self.recipient.username}"

    def mark_as_read(self):
        """Mark notification as read"""
        if self.status == 'unread':
            self.status = 'read'
            self.read_at = timezone.now()
            self.save()

    def archive(self):
        """Archive notification"""
        self.status = 'archived'
        self.archived_at = timezone.now()
        self.save()

    def delete_notification(self):
        """Soft delete notification"""
        self.status = 'deleted'
        self.deleted_at = timezone.now()
        self.save()


class NotificationPreference(models.Model):
    """Model for storing user notification preferences"""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preference')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Notification Preferences"

    def __str__(self):
        return f"Preferences for {self.user.username}"


class NotificationPreferenceType(models.Model):
    """Model for storing individual notification type preferences"""
    preference = models.ForeignKey(NotificationPreference, on_delete=models.CASCADE, related_name='type_preferences')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('preference', 'notification_type')
        verbose_name_plural = "Notification Preference Types"

    def __str__(self):
        return f"{self.notification_type} - {self.preference.user.username}"


class DeliveryLog(models.Model):
    """Model for tracking notification delivery status"""
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='delivery_logs')
    channel = models.CharField(max_length=20, choices=DELIVERY_CHANNELS)
    status = models.CharField(max_length=20, choices=DELIVERY_STATUS, default='pending')
    retry_count = models.IntegerField(default=0)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['notification', 'channel']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.notification.title} - {self.channel} - {self.status}"
