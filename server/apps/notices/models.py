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

    # --- Audience targeting -------------------------------------------------
    # The audience picks the BASE recipient groups; the optional target_*
    # filters below only narrow that base. Filters that do not apply to a
    # group (e.g. semester for teachers/alumni) never restrict that group.
    AUDIENCE_EVERYONE = 'everyone'
    AUDIENCE_STUDENTS_TEACHERS = 'students_teachers'
    AUDIENCE_STUDENTS = 'students'
    AUDIENCE_TEACHERS = 'teachers'
    AUDIENCE_ALUMNI = 'alumni'

    AUDIENCE_CHOICES = [
        (AUDIENCE_EVERYONE, 'Everyone (Students + Teachers + Alumni)'),
        (AUDIENCE_STUDENTS_TEACHERS, 'Active Students + Teachers'),
        (AUDIENCE_STUDENTS, 'Active Students Only'),
        (AUDIENCE_TEACHERS, 'Teachers Only'),
        (AUDIENCE_ALUMNI, 'Alumni Only'),
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

    # Base audience for the notice. Default matches the historical behavior of
    # notifying active students + teachers.
    audience = models.CharField(
        max_length=20,
        choices=AUDIENCE_CHOICES,
        default=AUDIENCE_STUDENTS_TEACHERS,
        help_text="Base recipient groups for this notice"
    )
    # Optional narrowing filters. Empty means "no restriction" for that
    # dimension. Departments are a real M2M (no data duplication); the small
    # value filters are JSON lists (e.g. [4, 5], ["Morning"], ["22-23"]).
    target_departments = models.ManyToManyField(
        'departments.Department',
        blank=True,
        related_name='targeted_notices',
        help_text="Restrict to these departments (empty = all departments)"
    )
    target_semesters = models.JSONField(
        default=list,
        blank=True,
        help_text="Restrict students to these semesters (empty = all)"
    )
    target_shifts = models.JSONField(
        default=list,
        blank=True,
        help_text="Restrict students/alumni to these shifts (empty = all)"
    )
    target_sessions = models.JSONField(
        default=list,
        blank=True,
        help_text="Restrict students/alumni to these sessions (empty = all)"
    )
    # Snapshot of how many users this notice targeted when it was last saved.
    # Used as the engagement denominator so a 30-recipient notice is not
    # measured against the whole institute.
    recipient_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Recipient count computed when the notice was last saved"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['is_published', '-created_at']),
            models.Index(fields=['priority', '-created_at']),
            models.Index(fields=['created_by']),
            models.Index(fields=['audience']),
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
        """Engagement denominator for this notice.

        Targeted notices use the recipient-count snapshot taken at save time;
        legacy notices (no snapshot) fall back to the historical global
        student count so old stats keep reading the same.
        """
        if self.recipient_count is not None:
            return self.recipient_count
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


class NoticeAttachment(models.Model):
    """A file (image or PDF) attached to a notice."""

    notice = models.ForeignKey(
        Notice,
        on_delete=models.CASCADE,
        related_name='attachments',
        help_text="The notice this file is attached to",
    )
    file = models.FileField(
        upload_to='notices/',
        help_text="The attached file (image or PDF)",
    )
    original_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Original filename as uploaded",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at']
        verbose_name = 'Notice Attachment'
        verbose_name_plural = 'Notice Attachments'

    def __str__(self):
        return f"Attachment for notice {self.notice_id}"


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