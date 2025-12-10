"""
Admission Models
"""
from django.db import models
from django.conf import settings
import uuid


class Admission(models.Model):
    """
    Student admission application model
    Stores all information submitted during the admission process
    """
    
    # Status choices
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    SHIFT_CHOICES = [
        ('Morning', 'Morning'),
        ('Day', 'Day'),
        ('Evening', 'Evening'),
    ]
    
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User relationship
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admission'
    )
    
    # Draft Support
    draft_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Stores incomplete form data for drafts"
    )
    is_draft = models.BooleanField(
        default=False,
        help_text="True if this is a draft, False if submitted"
    )
    draft_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time draft was updated"
    )
    
    # Personal Information
    full_name_bangla = models.CharField(max_length=255, blank=True)
    full_name_english = models.CharField(max_length=255, blank=True)
    father_name = models.CharField(max_length=255, blank=True)
    father_nid = models.CharField(max_length=20, blank=True)
    mother_name = models.CharField(max_length=255, blank=True)
    mother_nid = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    birth_certificate_no = models.CharField(max_length=50, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    religion = models.CharField(max_length=50, blank=True)
    blood_group = models.CharField(max_length=5, blank=True)
    
    # Contact Information
    mobile_student = models.CharField(max_length=11, blank=True)
    guardian_mobile = models.CharField(max_length=11, blank=True)
    email = models.EmailField(blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)
    present_address = models.JSONField(null=True, blank=True)  # Structured address
    permanent_address = models.JSONField(null=True, blank=True)  # Structured address
    
    # Educational Background
    highest_exam = models.CharField(max_length=100, blank=True)
    board = models.CharField(max_length=100, blank=True)
    group = models.CharField(max_length=50, blank=True)
    roll_number = models.CharField(max_length=50, blank=True)
    registration_number = models.CharField(max_length=50, blank=True)
    passing_year = models.IntegerField(null=True, blank=True)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    institution_name = models.CharField(max_length=255, blank=True)
    
    # Admission Details
    desired_department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='admission_requests',
        null=True,
        blank=True
    )
    desired_shift = models.CharField(max_length=20, choices=SHIFT_CHOICES, blank=True)
    session = models.CharField(max_length=20, blank=True)
    
    # Documents (stores file paths)
    documents = models.JSONField(default=dict, blank=True)
    # Format: {"photo": "path/to/photo.jpg", "ssc_certificate": "path/to/cert.pdf", ...}
    
    # Status and Review
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_admissions'
    )
    review_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'admissions'
        ordering = ['-submitted_at']
        verbose_name = 'Admission'
        verbose_name_plural = 'Admissions'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['desired_department']),
            models.Index(fields=['submitted_at']),
            models.Index(fields=['session']),
            models.Index(fields=['is_draft']),
            models.Index(fields=['user', 'is_draft']),
        ]
    
    def __str__(self):
        return f"{self.full_name_english} - {self.desired_department.name} ({self.status})"
