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
    
    # Draft Support
    draft_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Stores incomplete form data for drafts"
    )
    is_draft = models.BooleanField(
        default=False,
        help_text="True if this is a draft, False if submitted"
    )
    draft_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time draft was updated"
    )
    
    # Personal Information
    full_name_bangla = models.CharField(max_length=255, blank=True)
    full_name_english = models.CharField(max_length=255, blank=True)
    father_name = models.CharField(max_length=255, blank=True)
    father_nid = models.CharField(max_length=20, blank=True)
    mother_name = models.CharField(max_length=255, blank=True)
    mother_nid = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    birth_certificate_no = models.CharField(max_length=50, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    religion = models.CharField(max_length=50, blank=True)
    blood_group = models.CharField(max_length=5, blank=True)
    nationality = models.CharField(max_length=100, default='Bangladeshi', blank=True)
    
    # Contact Information
    mobile_student = models.CharField(max_length=11, blank=True)
    guardian_mobile = models.CharField(max_length=11, blank=True)
    email = models.EmailField(blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)
    present_address = models.JSONField(null=True, blank=True)  # Structured address
    permanent_address = models.JSONField(null=True, blank=True)  # Structured address
    
    # Educational Background
    highest_exam = models.CharField(max_length=100, blank=True)
    board = models.CharField(max_length=100, blank=True)
    group = models.CharField(max_length=50, blank=True)
    roll_number = models.CharField(max_length=50, blank=True)
    registration_number = models.CharField(max_length=50, blank=True)
    passing_year = models.IntegerField(null=True, blank=True)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    institution_name = models.CharField(max_length=255, blank=True)
    
    # Admission Details
    desired_department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='admission_requests',
        null=True,
        blank=True
    )
    desired_shift = models.CharField(max_length=20, choices=SHIFT_CHOICES, blank=True)
    session = models.CharField(max_length=20, blank=True)
    
    # Documents (stores file paths)
    documents = models.JSONField(default=dict, blank=True)
    # Format: {"photo": "path/to/photo.jpg", "ssc_certificate": "path/to/cert.pdf", ...}
    
    # Document processing status
    documents_processed = models.BooleanField(
        default=False,
        help_text="True if all documents have been processed and saved"
    )
    document_processing_errors = models.JSONField(
        null=True,
        blank=True,
        help_text="Stores any errors that occurred during document processing"
    )
    
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
            models.Index(fields=['is_draft']),
            models.Index(fields=['user', 'is_draft']),
            models.Index(fields=['documents_processed']),
        ]
    
    def __str__(self):
        return f"{self.full_name_english} - {self.desired_department.name} ({self.status})"
    
    def process_documents(self, document_files):
        """
        Process and save admission documents using the enhanced file storage system
        
        Args:
            document_files: Dictionary of field_name -> File objects
            
        Returns:
            bool: True if all documents processed successfully
        """
        from apps.documents.models import Document
        from utils.file_storage import file_storage
        from django.core.exceptions import ValidationError
        
        errors = []
        processed_documents = []
        
        try:
            for field_name, file_obj in document_files.items():
                if not file_obj:
                    continue
                    
                try:
                    # Map field name to document category
                    category_mapping = {
                        'photo': 'Photo',
                        'sscMarksheet': 'Marksheet',
                        'sscCertificate': 'Certificate',
                        'birthCertificateDoc': 'Birth Certificate',
                        'studentNIDCopy': 'NID',
                        'fatherNIDFront': 'NID',
                        'fatherNIDBack': 'NID',
                        'motherNIDFront': 'NID',
                        'motherNIDBack': 'NID',
                        'testimonial': 'Testimonial',
                        'medicalCertificate': 'Medical Certificate',
                        'quotaDocument': 'Quota Document',
                        'extraCertificates': 'Certificate',
                    }
                    
                    category = category_mapping.get(field_name, 'Other')
                    
                    # Use enhanced file storage service
                    file_info = file_storage.save_file(
                        uploaded_file=file_obj,
                        category='documents',
                        subfolder=f'admission/{field_name}',
                        validate=True
                    )
                    
                    # Create document record with enhanced fields
                    document = Document.objects.create(
                        student_id=getattr(self.user, 'related_profile_id', None),  # Link to student if exists
                        fileName=file_info['file_name'],
                        fileType=file_info['file_type'],
                        category=category,
                        filePath=file_info['file_path'],
                        fileSize=file_info['file_size'],
                        fileHash=file_info['file_hash'],
                        mimeType=file_info['mime_type'],
                        source_type='admission',
                        source_id=self.id,
                        original_field_name=field_name,
                        description=f'Admission document: {field_name}',
                        status='active'
                    )
                    
                    processed_documents.append(document.id)
                    
                    # Update documents JSON field
                    if not self.documents:
                        self.documents = {}
                    self.documents[field_name] = file_info['file_path']
                    
                except ValidationError as e:
                    errors.append(f"Validation error for {field_name}: {str(e)}")
                except Exception as e:
                    errors.append(f"Error processing {field_name}: {str(e)}")
            
            if errors:
                self.document_processing_errors = errors
                self.documents_processed = False
            else:
                self.document_processing_errors = None
                self.documents_processed = True
                
            self.save()
            return len(errors) == 0
            
        except Exception as e:
            self.document_processing_errors = [f"General processing error: {str(e)}"]
            self.documents_processed = False
            self.save()
            return False
