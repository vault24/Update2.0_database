"""
Teacher Models
"""
from django.db import models
import uuid


class Teacher(models.Model):
    """
    Teacher model representing faculty members
    """
    # Status choices
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('on_leave', 'On Leave'),
        ('retired', 'Retired'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Personal Information
    fullNameBangla = models.CharField(max_length=255)
    fullNameEnglish = models.CharField(max_length=255)
    designation = models.CharField(max_length=100)
    
    # Department and Academic Info
    department = models.ForeignKey('departments.Department', on_delete=models.PROTECT, related_name='teachers')
    subjects = models.JSONField(default=list)  # List of subject names
    qualifications = models.JSONField(default=list)  # List of qualification objects
    specializations = models.JSONField(default=list)  # List of specialization strings
    
    # Contact Information
    email = models.EmailField(unique=True)
    mobileNumber = models.CharField(max_length=11)
    officeLocation = models.CharField(max_length=255)
    
    # Employment Information
    employmentStatus = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    joiningDate = models.DateField()
    
    # Media
    profilePhoto = models.CharField(max_length=500, blank=True)
    
    # Timestamps
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teachers'
        ordering = ['fullNameEnglish']
        verbose_name = 'Teacher'
        verbose_name_plural = 'Teachers'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['employmentStatus']),
            models.Index(fields=['department']),
        ]
    
    def __str__(self):
        return f"{self.fullNameEnglish} - {self.designation}"
