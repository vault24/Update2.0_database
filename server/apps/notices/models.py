from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinLengthValidator


class Notice(models.Model):
    """Model for storing notices and announcements"""
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
    ]
    
    title = models.CharField(
        max_length=255,
        validators=[MinLengthValidator(1)],
        help_text="Title of the notice"
    )
    content = models.TextField(
        validators=[MinLengthValidator(1)],
        help_text="Content of the notice"
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='normal',
        help_text="Priority level of the notice"
    )
    is_published = models.BooleanField(
        default=True,
        help_text="Whether the notice is published and visible to students"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the notice was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When the notice was last updated"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_notices',
        help_text="Admin user who created the notice"
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['is_published', '-created_at']),
            models.Index(fields=['priority', '-created_at']),
            models.Index(fields=['created_by']),
        ]
        verbose_name = 'Notice'
        verbose_name_plural = 'Notices'
    
    def __str__(self):
        return f"{self.title} ({self.get_priority_display()})"
    
    @property
    def read_count(self):
        """Get the number of students who have read this notice"""
        return self.read_statuses.count()
    
    @property
    def total_students(self):
        """Get the total number of students in the system"""
        from apps.authentication.models import User
        return User.objects.filter(role='student').count()
    
    @property
    def read_percentage(self):
        """Get the percentage of students who have read this notice"""
        total = self.total_students
        if total == 0:
            return 0
        return round((self.read_count / total) * 100, 1)
    
    def is_low_engagement(self, threshold=30):
        """Check if the notice has low engagement (less than threshold percentage)"""
        return self.read_percentage < threshold


class NoticeReadStatus(models.Model):
    """Model for tracking which students have read which notices"""
    
    notice = models.ForeignKey(
        Notice,
        on_delete=models.CASCADE,
        related_name='read_statuses',
        help_text="The notice that was read"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notice_read_statuses',
        help_text="The student who read the notice"
    )
    read_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the notice was marked as read"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this record was created"
    )
    
    class Meta:
        unique_together = ('notice', 'student')
        ordering = ['-read_at']
        indexes = [
            models.Index(fields=['notice', 'student']),
            models.Index(fields=['student', '-read_at']),
            models.Index(fields=['-read_at']),
        ]
        verbose_name = 'Notice Read Status'
        verbose_name_plural = 'Notice Read Statuses'
    
    def __str__(self):
        return f"{self.student.username} read '{self.notice.title}'"