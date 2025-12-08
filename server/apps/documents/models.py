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
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Student relationship
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='documents'
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
    
    class Meta:
        db_table = 'documents'
        ordering = ['-uploadDate']
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['category']),
            models.Index(fields=['uploadDate']),
        ]
    
    def __str__(self):
        return f"{self.fileName} - {self.category}"
