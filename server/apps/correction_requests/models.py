"""
Correction Request Models
"""
from django.db import models
import uuid


class CorrectionRequest(models.Model):
    """
    Model for student data correction requests
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Student Information
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='correction_requests'
    )
    
    # Correction Details
    field_name = models.CharField(max_length=100)
    current_value = models.TextField()
    requested_value = models.TextField()
    reason = models.TextField()
    
    # Supporting Documents
    supporting_documents = models.JSONField(default=list, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Requesting User (Teacher)
    requested_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_corrections'
    )
    
    # Timestamps and Review
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_corrections'
    )
    review_notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'correction_requests'
        ordering = ['-submitted_at']
        verbose_name = 'Correction Request'
        verbose_name_plural = 'Correction Requests'
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['submitted_at']),
        ]
    
    def __str__(self):
        return f"{self.student.fullNameEnglish} - {self.field_name} ({self.status})"
