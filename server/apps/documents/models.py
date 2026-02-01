"""
Document Models
"""
from django.db import models
from django.core.exceptions import ValidationError
import uuid


class Document(models.Model):
    """
    Enhanced document model with filesystem-based storage
    """
    # Category choices
    CATEGORY_CHOICES = [
        ('NID', 'National ID'),
        ('Birth Certificate', 'Birth Certificate'),
        ('Marksheet', 'Marksheet'),
        ('Certificate', 'Certificate'),
        ('Testimonial', 'Testimonial'),
        ('Photo', 'Photo'),
        ('Medical Certificate', 'Medical Certificate'),
        ('Quota Document', 'Quota Document'),
        ('Other', 'Other'),
    ]
    
    # Source type choices
    SOURCE_TYPE_CHOICES = [
        ('admission', 'Admission Upload'),
        ('manual', 'Manual Upload'),
        ('system', 'System Generated'),
    ]
    
    # Status choices
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('archived', 'Archived'),
        ('deleted', 'Deleted'),
        ('corrupted', 'Corrupted'),
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
    fileName = models.CharField(max_length=255, help_text="Original filename")
    fileType = models.CharField(max_length=50, help_text="File extension (e.g., 'pdf', 'jpg')")
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='Other'
    )
    
    # Enhanced storage fields
    filePath = models.CharField(
        max_length=500, 
        help_text="Relative path to file in storage system"
    )
    fileSize = models.BigIntegerField(help_text="File size in bytes")
    fileHash = models.CharField(
        max_length=64, 
        blank=True, 
        help_text="SHA256 hash for integrity verification"
    )
    mimeType = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="MIME type of the file"
    )
    
    # Metadata
    uploadDate = models.DateTimeField(auto_now_add=True)
    lastModified = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    
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
        help_text="Original field name from admission form"
    )
    
    # Access control
    is_public = models.BooleanField(
        default=False,
        help_text="Whether file can be accessed without authentication"
    )
    access_permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom access permissions"
    )
    
    # Additional metadata
    description = models.TextField(blank=True, help_text="Document description")
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Tags for categorization and search"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata"
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
            models.Index(fields=['status']),
            models.Index(fields=['fileHash']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(fileSize__gte=0),
                name='positive_file_size'
            ),
        ]
    
    def __str__(self):
        return f"{self.fileName} - {self.category}"
    
    def clean(self):
        """Validate model fields"""
        super().clean()
        
        if self.fileSize < 0:
            raise ValidationError("File size cannot be negative")
        
        if self.filePath and '..' in self.filePath:
            raise ValidationError("File path cannot contain '..' for security reasons")
    
    @property
    def file_url(self):
        """Get public URL for file access"""
        from utils.file_storage import file_storage
        return file_storage.get_file_url(self.filePath)
    
    @property
    def file_size_mb(self):
        """Get file size in MB"""
        return round(self.fileSize / (1024 * 1024), 2) if self.fileSize else 0
    
    @property
    def is_image(self):
        """Check if file is an image"""
        image_types = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
        return self.fileType.lower() in image_types
    
    @property
    def is_pdf(self):
        """Check if file is a PDF"""
        return self.fileType.lower() == 'pdf'
    
    def get_file_info(self):
        """Get detailed file information from storage"""
        from utils.file_storage import file_storage
        return file_storage.get_file_info(self.filePath)
    
    def verify_integrity(self):
        """Verify file integrity using hash"""
        file_info = self.get_file_info()
        if not file_info or not file_info.get('exists'):
            return False, "File not found in storage"
        
        if not self.fileHash:
            return True, "No hash available for verification"
        
        # Calculate current hash
        import hashlib
        try:
            with open(file_info['storage_path'], 'rb') as f:
                current_hash = hashlib.sha256()
                for chunk in iter(lambda: f.read(4096), b""):
                    current_hash.update(chunk)
                current_hash = current_hash.hexdigest()
            
            if current_hash == self.fileHash:
                return True, "File integrity verified"
            else:
                return False, "File hash mismatch - file may be corrupted"
        except Exception as e:
            return False, f"Error verifying integrity: {str(e)}"


class DocumentAccessLog(models.Model):
    """
    Log document access for audit purposes
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='access_logs'
    )
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    access_type = models.CharField(
        max_length=20,
        choices=[
            ('view', 'View'),
            ('download', 'Download'),
            ('upload', 'Upload'),
            ('delete', 'Delete'),
            ('modify', 'Modify'),
        ]
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'document_access_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['document']),
            models.Index(fields=['user']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['access_type']),
        ]
    
    def __str__(self):
        return f"{self.access_type} - {self.document.fileName} by {self.user}"
