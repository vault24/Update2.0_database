"""
Application Models
"""
from django.db import models
import uuid


class Application(models.Model):
    """
    Student application submissions for documents and requests
    """
    # Application type choices
    APPLICATION_TYPE_CHOICES = [
        ('Testimonial', 'Testimonial'),
        ('Certificate', 'Certificate'),
        ('Transcript', 'Transcript'),
        ('Stipend', 'Stipend'),
        ('Transfer', 'Transfer Certificate'),
        ('Other', 'Other'),
    ]
    
    # Status choices
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    # Approver role choices (who currently holds / should review the application)
    APPROVER_ROLE_CHOICES = [
        ('registrar', 'Registrar'),
        ('institute_head', 'Principal'),
        ('department_head', 'Department Head'),
    ]

    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Applicant Information
    fullNameBangla = models.CharField(max_length=255)
    fullNameEnglish = models.CharField(max_length=255)
    fatherName = models.CharField(max_length=255)
    motherName = models.CharField(max_length=255)
    
    # Academic Information
    department = models.CharField(max_length=255)
    session = models.CharField(max_length=20)
    shift = models.CharField(max_length=20)
    rollNumber = models.CharField(max_length=50)
    registrationNumber = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    
    # Application Details
    applicationType = models.CharField(
        max_length=50,
        choices=APPLICATION_TYPE_CHOICES
    )
    subject = models.CharField(max_length=255)
    message = models.TextField()
    selectedDocuments = models.JSONField(default=list, blank=True)
    
    # Template the student applied for (multi-level workflow)
    template = models.ForeignKey(
        'documents.DocumentTemplate',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='applications'
    )

    # Optional link to the student account (best-effort; submissions stay roll-based)
    student = models.ForeignKey(
        'students.Student',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='applications'
    )

    # Status and Review
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # ---- Multi-level approval workflow state ----
    # The approver who currently holds the application (None once finalized).
    current_approver_role = models.CharField(
        max_length=20,
        choices=APPROVER_ROLE_CHOICES,
        blank=True,
        default='registrar'
    )
    current_approver = models.ForeignKey(
        'authentication.User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='pending_applications',
        help_text='Specific approver (set when assigned to a particular Department Head)'
    )
    current_department = models.ForeignKey(
        'departments.Department',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='pending_applications',
        help_text='Department whose head should review (when assigned to a Department Head)'
    )
    stage = models.PositiveSmallIntegerField(default=1, help_text='1 = first approver, 2 = forwarded approver')

    submittedAt = models.DateTimeField(auto_now_add=True)
    reviewedAt = models.DateTimeField(null=True, blank=True)
    reviewedBy = models.CharField(max_length=255, blank=True)
    reviewNotes = models.TextField(blank=True)

    class Meta:
        db_table = 'applications'
        ordering = ['-submittedAt']
        verbose_name = 'Application'
        verbose_name_plural = 'Applications'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['applicationType']),
            models.Index(fields=['submittedAt']),
            models.Index(fields=['current_approver_role']),
        ]

    def __str__(self):
        return f"{self.fullNameEnglish} - {self.applicationType} ({self.status})"


class ApplicationApproval(models.Model):
    """
    One step in an application's approval history. Each record captures who acted,
    in what role, and what they did. The approver's User carries the signature
    image rendered onto the final document.
    """
    ACTION_CHOICES = [
        ('approved', 'Approved'),
        ('forwarded', 'Forwarded'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    approver = models.ForeignKey(
        'authentication.User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='application_approvals'
    )
    approver_role = models.CharField(max_length=20, blank=True)
    approver_name = models.CharField(max_length=255, blank=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    notes = models.TextField(blank=True)
    # When forwarding, who it was forwarded to (for history readability).
    forwarded_to_role = models.CharField(max_length=20, blank=True)
    forwarded_to_name = models.CharField(max_length=255, blank=True)
    order = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'application_approvals'
        ordering = ['order', 'created_at']
        verbose_name = 'Application Approval'
        verbose_name_plural = 'Application Approvals'
        indexes = [
            models.Index(fields=['application', 'order']),
        ]

    def __str__(self):
        return f"{self.application_id} - {self.action} by {self.approver_name}"
