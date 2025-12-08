"""
System Settings Models
"""
from django.db import models
import uuid


class SystemSettings(models.Model):
    """
    Model for system-wide configuration settings
    """
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Academic Year Configuration
    current_academic_year = models.CharField(max_length=20, default='2024-2025')
    current_semester = models.IntegerField(default=1)
    
    # Notification Preferences
    enable_email_notifications = models.BooleanField(default=True)
    enable_sms_notifications = models.BooleanField(default=False)
    admin_notification_email = models.EmailField(blank=True)
    
    # Application Settings
    allow_student_registration = models.BooleanField(default=True)
    allow_teacher_registration = models.BooleanField(default=True)
    allow_admission_submission = models.BooleanField(default=True)
    
    # System Information
    institute_name = models.CharField(max_length=255, default='Institute Name')
    institute_address = models.TextField(blank=True)
    institute_phone = models.CharField(max_length=20, blank=True)
    institute_email = models.EmailField(blank=True)
    
    # Maintenance Mode
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True)
    
    # Timestamps
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_settings'
    )
    
    class Meta:
        db_table = 'system_settings'
        verbose_name = 'System Settings'
        verbose_name_plural = 'System Settings'
    
    def __str__(self):
        return f"System Settings - {self.current_academic_year}"
    
    @classmethod
    def get_settings(cls):
        """Get or create system settings (singleton pattern)"""
        settings, created = cls.objects.get_or_create(pk=cls.objects.first().pk if cls.objects.exists() else uuid.uuid4())
        return settings
