"""
Authentication Models
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
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
    
    # Student ID (generated from SSC Board Roll)
    student_id = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        help_text='Student ID in format SIPI-{ssc_roll}'
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
    
    def get_login_error_message(self):
        """Get specific error message for login failures"""
        if self.role == 'teacher' and self.account_status == 'pending':
            return 'Your teacher account is pending approval. Please wait for admin approval.'
        elif self.account_status == 'suspended':
            return 'Your account has been suspended. Please contact administration.'
        else:
            return 'You are not authorized to login at this time.'


class SignupRequest(models.Model):
    """
    Model to track admin signup requests awaiting approval
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    # Request identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Requester information
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    mobile_number = models.CharField(max_length=11, blank=True)
    
    # Requested role (admin roles only)
    requested_role = models.CharField(
        max_length=20,
        choices=[
            ('registrar', 'Registrar'),
            ('institute_head', 'Institute Head'),
        ]
    )
    
    # Password (hashed)
    password_hash = models.CharField(max_length=128)
    
    # Request status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Approval/rejection details
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_signup_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Created user reference (for approved requests)
    created_user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='signup_request'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'auth_signup_request'
        ordering = ['-created_at']
        verbose_name = 'Signup Request'
        verbose_name_plural = 'Signup Requests'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['username']),
            models.Index(fields=['email']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.username} - {self.get_status_display()}"


class OTPToken(models.Model):
    """
    Model to store OTP tokens for password reset functionality
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='otp_tokens'
    )
    token = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    
    class Meta:
        db_table = 'auth_otp_token'
        ordering = ['-created_at']
        verbose_name = 'OTP Token'
        verbose_name_plural = 'OTP Tokens'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['is_used']),
        ]
    
    def __str__(self):
        return f"OTP for {self.user.email} - {self.token}"
    
    def is_valid(self):
        """Check if OTP is still valid"""
        return (
            not self.is_used and
            self.attempts < self.max_attempts and
            timezone.now() < self.expires_at
        )
    
    def is_expired(self):
        """Check if OTP has expired"""
        return timezone.now() >= self.expires_at
    
    def increment_attempts(self):
        """Increment the number of verification attempts"""
        self.attempts += 1
        self.save(update_fields=['attempts'])
    
    def mark_as_used(self):
        """Mark the OTP as used"""
        self.is_used = True
        self.save(update_fields=['is_used'])


class PasswordResetAttempt(models.Model):
    """
    Model to track password reset attempts for rate limiting
    """
    email = models.EmailField()
    ip_address = models.GenericIPAddressField()
    created_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        db_table = 'auth_password_reset_attempt'
        ordering = ['-created_at']
        verbose_name = 'Password Reset Attempt'
        verbose_name_plural = 'Password Reset Attempts'
        indexes = [
            models.Index(fields=['email', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Reset attempt for {self.email} from {self.ip_address}"
    
    @classmethod
    def get_recent_attempts(cls, email, hours=1):
        """Get recent attempts for an email within specified hours"""
        since = timezone.now() - timedelta(hours=hours)
        return cls.objects.filter(
            email=email,
            created_at__gte=since
        ).count()
    
    @classmethod
    def is_rate_limited(cls, email, max_attempts=3, hours=1):
        """Check if email is rate limited"""
        return cls.get_recent_attempts(email, hours) >= max_attempts
