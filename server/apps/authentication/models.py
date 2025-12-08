"""
Authentication Models
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser
    Supports multiple user roles with different access levels
    """
    
    # Role choices
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('captain', 'Captain'),
        ('teacher', 'Teacher'),
        ('registrar', 'Registrar'),
        ('institute_head', 'Institute Head'),
    ]
    
    # Account status choices
    ACCOUNT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('suspended', 'Suspended'),
    ]
    
    # Admission status choices
    ADMISSION_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    # User role and status
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='student'
    )
    
    account_status = models.CharField(
        max_length=20,
        choices=ACCOUNT_STATUS_CHOICES,
        default='active'
    )
    
    admission_status = models.CharField(
        max_length=20,
        choices=ADMISSION_STATUS_CHOICES,
        default='not_started',
        blank=True
    )
    
    # Link to related profile (Student or Teacher model)
    related_profile_id = models.UUIDField(
        null=True,
        blank=True,
        help_text='UUID of related Student or Teacher profile'
    )
    
    # Additional fields
    mobile_number = models.CharField(max_length=11, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'auth_user'
        ordering = ['-created_at']
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['account_status']),
            models.Index(fields=['admission_status']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    def is_admin(self):
        """Check if user has admin privileges"""
        return self.role in ['registrar', 'institute_head']
    
    def is_teacher(self):
        """Check if user is a teacher"""
        return self.role == 'teacher'
    
    def is_student_or_captain(self):
        """Check if user is a student or captain"""
        return self.role in ['student', 'captain']
    
    def needs_admission(self):
        """Check if user needs to complete admission"""
        return (
            self.is_student_or_captain() and
            self.admission_status in ['not_started', 'pending']
        )
    
    def can_login(self):
        """Check if user is allowed to login"""
        # Teachers with pending status cannot login
        if self.role == 'teacher' and self.account_status == 'pending':
            return False
        
        # Suspended users cannot login
        if self.account_status == 'suspended':
            return False
        
        return True
