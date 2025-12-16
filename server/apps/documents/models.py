"""
Document Models
"""
from django.db import models
import uuid


class Document(models.Model):
    """
    Student document uploads (NID, Marksheet, Certificate, etc.)
    """
    # Category choices
    CATEGORY_CHOICES = [
        ('NID', 'National ID'),
        ('Birth Certificate', 'Birth Certificate'),
        ('Marksheet', 'Marksheet'),
        ('Certificate', 'Certificate'),
        ('Testimonial', 'Testimonial'),
        ('Photo', 'Photo'),
        ('Other', 'Other'),
    ]
    
    # Source type choices
    SOURCE_TYPE_CHOICES = [
        ('admission', 'Admission Upload'),
        ('manual', 'Manual Upload'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Student relationship (optional for admission documents)
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='documents',
        null=True,
        blank=True
    )
    
    # File information
    fileName = models.CharField(max_length=255)
    fileType = models.CharField(max_length=50)  # e.g., 'pdf', 'jpg', 'png'
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='Other'
    )
    filePath = models.CharField(max_length=500)  # Relative path to client/assets/images/documents/
    fileSize = models.IntegerField()  # Size in bytes
    uploadDate = models.DateTimeField(auto_now_add=True)
    
    # Source tracking fields
    source_type = models.CharField(
        max_length=20,
        choices=SOURCE_TYPE_CHOICES,
        default='manual',
        help_text="Source of the document upload"
    )
    source_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="ID of the source record (e.g., admission ID)"
    )
    original_field_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Original field name from admission form (e.g., 'photo', 'sscMarksheet')"
    )
    
    class Meta:
        db_table = 'documents'
        ordering = ['-uploadDate']
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['category']),
            models.Index(fields=['uploadDate']),
            models.Index(fields=['source_type']),
            models.Index(fields=['source_id']),
        ]
    
    def __str__(self):
        return f"{self.fileName} - {self.category}"
