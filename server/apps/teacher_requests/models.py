"""
Teacher Request Models
"""
from django.db import models
from django.conf import settings
import uuid


class TeacherSignupRequest(models.Model):
    """
    Teacher Signup Request model for teacher account approval workflow
    """
    # Status choices
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User relationship (the pending teacher user account)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='teacher_signup_request'
    )
    
    # Personal Information
    full_name_bangla = models.CharField(max_length=255)
    full_name_english = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    mobile_number = models.CharField(max_length=11)
    
    # Professional Information
    designation = models.CharField(max_length=100)
    department = models.ForeignKey('departments.Department', on_delete=models.PROTECT)
    qualifications = models.JSONField(default=list)  # List of qualification objects
    specializations = models.JSONField(default=list)  # List of specialization strings
    office_location = models.CharField(max_length=255, blank=True)
    
    # Status and Review
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_teacher_requests'
    )
    review_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teacher_signup_requests'
        ordering = ['-submitted_at']
        verbose_name = 'Teacher Signup Request'
        verbose_name_plural = 'Teacher Signup Requests'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['email']),
            models.Index(fields=['submitted_at']),
        ]
    
    def __str__(self):
        return f"{self.full_name_english} - {self.designation} ({self.status})"


class TeacherRequest(models.Model):
    """
    Teacher Request model for student-teacher contact requests
    """
    # Status choices
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
        ('archived', 'Archived'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='teacher_requests')
    teacher = models.ForeignKey('teachers.Teacher', on_delete=models.CASCADE, related_name='contact_requests')
    
    # Request Information
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Admin Management
    adminNotes = models.TextField(blank=True)
    resolvedDate = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    requestDate = models.DateTimeField(auto_now_add=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teacher_requests'
        ordering = ['-requestDate']
        verbose_name = 'Teacher Request'
        verbose_name_plural = 'Teacher Requests'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['requestDate']),
            models.Index(fields=['teacher']),
            models.Index(fields=['student']),
        ]
    
    def __str__(self):
        return f"Request from {self.student.fullNameEnglish} to {self.teacher.fullNameEnglish}"
