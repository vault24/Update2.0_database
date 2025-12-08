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
    
    # Personal Information
    full_name_bangla = models.CharField(max_length=255)
    full_name_english = models.CharField(max_length=255)
    father_name = models.CharField(max_length=255)
    father_nid = models.CharField(max_length=20)
    mother_name = models.CharField(max_length=255)
    mother_nid = models.CharField(max_length=20)
    date_of_birth = models.DateField()
    birth_certificate_no = models.CharField(max_length=50)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    religion = models.CharField(max_length=50, blank=True)
    blood_group = models.CharField(max_length=5, blank=True)
    
    # Contact Information
    mobile_student = models.CharField(max_length=11)
    guardian_mobile = models.CharField(max_length=11)
    email = models.EmailField()
    emergency_contact = models.CharField(max_length=255)
    present_address = models.JSONField()  # Structured address
    permanent_address = models.JSONField()  # Structured address
    
    # Educational Background
    highest_exam = models.CharField(max_length=100)
    board = models.CharField(max_length=100)
    group = models.CharField(max_length=50)
    roll_number = models.CharField(max_length=50)
    registration_number = models.CharField(max_length=50)
    passing_year = models.IntegerField()
    gpa = models.DecimalField(max_digits=4, decimal_places=2)
    institution_name = models.CharField(max_length=255, blank=True)
    
    # Admission Details
    desired_department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='admission_requests'
    )
    desired_shift = models.CharField(max_length=20, choices=SHIFT_CHOICES)
    session = models.CharField(max_length=20)
    
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
        ]
    
    def __str__(self):
        return f"{self.full_name_english} - {self.desired_department.name} ({self.status})"
