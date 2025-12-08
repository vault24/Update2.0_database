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
    
    # Status and Review
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
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
        ]
    
    def __str__(self):
        return f"{self.fullNameEnglish} - {self.applicationType} ({self.status})"
