"""
Activity Log Models
"""
from django.db import models
import uuid


class ActivityLog(models.Model):
    """
    Model for tracking system activities and changes
    """
    ACTION_TYPE_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User Information
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='activity_logs'
    )
    
    # Action Information
    action_type = models.CharField(max_length=50, choices=ACTION_TYPE_CHOICES)
    entity_type = models.CharField(max_length=50)  # e.g., 'Student', 'Admission', 'Teacher'
    entity_id = models.CharField(max_length=255)
    description = models.TextField()
    
    # Change Tracking
    changes = models.JSONField(default=dict, blank=True)  # Before/after values for updates
    
    # Request Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'activity_logs'
        ordering = ['-timestamp']
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action_type']),
            models.Index(fields=['entity_type']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        user_name = self.user.username if self.user else 'System'
        return f"{user_name} - {self.action_type} - {self.entity_type} ({self.timestamp})"
