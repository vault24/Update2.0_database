"""
Complaints and Feedback Models
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class ComplaintCategory(models.Model):
    """Categories for organizing complaints"""
    # Fixed UUIDs for core categories
    ACADEMIC_UUID = uuid.UUID('11111111-1111-1111-1111-111111111111')
    WEBSITE_UUID = uuid.UUID('22222222-2222-2222-2222-222222222222')
    FACILITY_UUID = uuid.UUID('33333333-3333-3333-3333-333333333333')
    CORE_CATEGORY_IDS = [ACADEMIC_UUID, WEBSITE_UUID, FACILITY_UUID]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='AlertTriangle')  # Lucide icon name
    color = models.CharField(max_length=50, default='from-red-500 to-orange-600')  # CSS gradient
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'complaint_categories'
        ordering = ['sort_order', 'name']
        verbose_name_plural = 'Complaint Categories'
    
    def __str__(self):
        return self.label
    
    def is_core_category(self):
        """Check if this is a core system category that cannot be deleted"""
        return self.id in self.CORE_CATEGORY_IDS
    
    def delete(self, *args, **kwargs):
        """Prevent deletion of core categories"""
        if self.is_core_category():
            raise ValueError(f"Cannot delete core category: {self.label}")
        return super().delete(*args, **kwargs)


class ComplaintSubcategory(models.Model):
    """Subcategories for more specific complaint classification"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(ComplaintCategory, on_delete=models.CASCADE, related_name='subcategories')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'complaint_subcategories'
        ordering = ['sort_order', 'name']
        unique_together = ['category', 'name']
        verbose_name_plural = 'Complaint Subcategories'
    
    def __str__(self):
        return f"{self.category.label} - {self.name}"


class Complaint(models.Model):
    """Main complaint model"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('seen', 'Seen'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
        ('rejected', 'Rejected'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Complaint details
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(ComplaintCategory, on_delete=models.PROTECT)
    subcategory = models.ForeignKey(ComplaintSubcategory, on_delete=models.PROTECT)
    
    # Reporter information
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, null=True, blank=True)
    teacher = models.ForeignKey('teachers.Teacher', on_delete=models.CASCADE, null=True, blank=True)
    is_anonymous = models.BooleanField(default=False)
    reporter_name = models.CharField(max_length=255, blank=True)  # For anonymous complaints
    reporter_email = models.EmailField(blank=True)
    
    # Status and priority
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    
    # Assignment and handling
    assigned_to = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_complaints')
    department = models.ForeignKey('departments.Department', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Attachments and evidence
    attachments = models.JSONField(default=list, blank=True)  # List of file paths
    
    # Response and resolution
    response = models.TextField(blank=True)
    resolution_notes = models.TextField(blank=True)
    responded_by = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True, blank=True, related_name='responded_complaints')
    responded_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Feedback and rating
    satisfaction_rating = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    feedback_comment = models.TextField(blank=True)
    
    # Tracking
    reference_number = models.CharField(max_length=20, unique=True, blank=True)
    view_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'complaints'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['category', 'subcategory']),
            models.Index(fields=['student']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['created_at']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.reference_number:
            # Generate reference number like CMP-2024-001
            from django.utils import timezone
            year = timezone.now().year
            count = Complaint.objects.filter(created_at__year=year).count() + 1
            self.reference_number = f"CMP-{year}-{count:03d}"
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.reference_number} - {self.title}"


class ComplaintUpdate(models.Model):
    """Track updates and status changes for complaints"""
    UPDATE_TYPES = [
        ('status_change', 'Status Change'),
        ('assignment', 'Assignment'),
        ('response', 'Response Added'),
        ('comment', 'Comment Added'),
        ('attachment', 'Attachment Added'),
        ('escalation', 'Escalated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='updates')
    
    update_type = models.CharField(max_length=20, choices=UPDATE_TYPES)
    description = models.TextField()
    
    # Who made the update
    updated_by_student = models.ForeignKey('students.Student', on_delete=models.SET_NULL, null=True, blank=True)
    updated_by_teacher = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True, blank=True)
    updated_by_admin = models.BooleanField(default=False)
    
    # Previous and new values for tracking changes
    previous_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    
    # Attachments for this update
    attachments = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'complaint_updates'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.complaint.reference_number} - {self.update_type}"


class ComplaintComment(models.Model):
    """Comments and discussions on complaints"""
    COMMENT_TYPES = [
        ('public', 'Public Comment'),
        ('internal', 'Internal Note'),
        ('private', 'Private Message'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='comments')
    
    content = models.TextField()
    comment_type = models.CharField(max_length=20, choices=COMMENT_TYPES, default='public')
    
    # Author information
    author_student = models.ForeignKey('students.Student', on_delete=models.CASCADE, null=True, blank=True)
    author_teacher = models.ForeignKey('teachers.Teacher', on_delete=models.CASCADE, null=True, blank=True)
    author_name = models.CharField(max_length=255)  # Display name
    
    # Threading
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    # Attachments
    attachments = models.JSONField(default=list, blank=True)
    
    # Visibility
    is_visible_to_reporter = models.BooleanField(default=True)
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'complaint_comments'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author_name} on {self.complaint.reference_number}"


class ComplaintEscalation(models.Model):
    """Track complaint escalations"""
    ESCALATION_REASONS = [
        ('overdue', 'Overdue Response'),
        ('unsatisfied', 'Unsatisfied with Response'),
        ('severity', 'High Severity Issue'),
        ('department_change', 'Requires Different Department'),
        ('manual', 'Manual Escalation'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='escalations')
    
    reason = models.CharField(max_length=20, choices=ESCALATION_REASONS)
    description = models.TextField()
    
    # Escalation path
    escalated_from = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True, blank=True, related_name='escalations_from')
    escalated_to = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True, blank=True, related_name='escalations_to')
    escalated_to_department = models.ForeignKey('departments.Department', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Who initiated the escalation
    escalated_by_student = models.ForeignKey('students.Student', on_delete=models.SET_NULL, null=True, blank=True)
    escalated_by_teacher = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True, blank=True)
    escalated_by_system = models.BooleanField(default=False)  # Automatic escalation
    
    # Status
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'complaint_escalations'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Escalation: {self.complaint.reference_number} - {self.reason}"


class ComplaintTemplate(models.Model):
    """Pre-defined response templates for common complaints"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    title = models.CharField(max_length=255)
    content = models.TextField()
    category = models.ForeignKey(ComplaintCategory, on_delete=models.CASCADE, related_name='templates')
    subcategory = models.ForeignKey(ComplaintSubcategory, on_delete=models.CASCADE, null=True, blank=True)
    
    # Usage tracking
    usage_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    # Author
    created_by = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'complaint_templates'
        ordering = ['-usage_count', 'title']
    
    def __str__(self):
        return self.title


class ComplaintAnalytics(models.Model):
    """Analytics and reporting data for complaints"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Time period
    date = models.DateField()
    period_type = models.CharField(max_length=20, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ], default='daily')
    
    # Metrics
    total_complaints = models.IntegerField(default=0)
    new_complaints = models.IntegerField(default=0)
    resolved_complaints = models.IntegerField(default=0)
    pending_complaints = models.IntegerField(default=0)
    
    # Response times (in hours)
    avg_response_time = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    avg_resolution_time = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    
    # Satisfaction
    avg_satisfaction_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_ratings = models.IntegerField(default=0)
    
    # Category breakdown
    category_breakdown = models.JSONField(default=dict, blank=True)
    department_breakdown = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'complaint_analytics'
        unique_together = ['date', 'period_type']
        ordering = ['-date']
    
    def __str__(self):
        return f"Analytics for {self.date} ({self.period_type})"