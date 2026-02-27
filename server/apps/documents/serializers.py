"""
Enhanced Document Serializers
"""
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Document, DocumentAccessLog
from utils.file_storage import file_storage


class DocumentSerializer(serializers.ModelSerializer):
    """
    Complete serializer for document data with enhanced fields
    """
    studentName = serializers.SerializerMethodField()
    studentRoll = serializers.SerializerMethodField()
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    file_url = serializers.ReadOnlyField()
    file_size_mb = serializers.ReadOnlyField()
    is_image = serializers.ReadOnlyField()
    is_pdf = serializers.ReadOnlyField()
    
    def get_studentName(self, obj):
        """Get student name from student relationship or owner_name field"""
        if obj.student:
            return obj.student.fullNameEnglish
        elif obj.source_type == 'admission' and obj.owner_name:
            return obj.owner_name.replace('_', ' ').title()
        return None
    
    def get_studentRoll(self, obj):
        """Get student roll from student relationship or owner_id field"""
        if obj.student:
            return obj.student.currentRollNumber
        elif obj.source_type == 'admission' and obj.owner_id:
            return obj.owner_id
        return None
    
    class Meta:
        model = Document
        fields = [
            'id',
            'student',
            'studentName',
            'studentRoll',
            'fileName',
            'fileType',
            'category',
            'filePath',
            'fileSize',
            'file_size_mb',
            'fileHash',
            'mimeType',
            'uploadDate',
            'lastModified',
            'status',
            'status_display',
            'source_type',
            'source_type_display',
            'source_id',
            'original_field_name',
            'is_public',
            'access_permissions',
            'description',
            'tags',
            'metadata',
            'file_url',
            'is_image',
            'is_pdf',
        ]
        read_only_fields = [
            'id', 'uploadDate', 'lastModified', 'filePath', 
            'fileSize', 'fileHash', 'mimeType', 'file_url',
            'file_size_mb', 'is_image', 'is_pdf'
        ]


class DocumentUploadSerializer(serializers.Serializer):
    """
    Enhanced serializer for document uploads with better validation
    """
    student = serializers.UUIDField(required=False, allow_null=True)
    category = serializers.ChoiceField(
        choices=Document.CATEGORY_CHOICES,
        required=True
    )
    file = serializers.FileField(required=True)
    source_type = serializers.ChoiceField(
        choices=Document.SOURCE_TYPE_CHOICES,
        default='manual'
    )
    source_id = serializers.UUIDField(required=False, allow_null=True)
    original_field_name = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    is_public = serializers.BooleanField(default=False)
    custom_filename = serializers.CharField(required=False, allow_blank=True)
    
    def validate_file(self, value):
        """Enhanced file validation"""
        try:
            # Use the file storage service for validation
            file_storage.validate_file(value, 'documents')
            return value
        except DjangoValidationError as e:
            raise serializers.ValidationError(str(e))
    
    def validate_student(self, value):
        """Validate that student exists (if provided)"""
        if value is None:
            return value
            
        from apps.students.models import Student
        try:
            Student.objects.get(id=value)
        except Student.DoesNotExist:
            raise serializers.ValidationError("Student not found.")
        return value
    
    def validate_tags(self, value):
        """Validate tags"""
        if len(value) > 10:
            raise serializers.ValidationError("Maximum 10 tags allowed")
        
        for tag in value:
            if len(tag.strip()) < 2:
                raise serializers.ValidationError("Each tag must be at least 2 characters long")
        
        return [tag.strip().lower() for tag in value]
    
    def validate_custom_filename(self, value):
        """Validate custom filename"""
        if value:
            # Check for dangerous characters
            dangerous_chars = '<>:"/\\|?*'
            if any(char in value for char in dangerous_chars):
                raise serializers.ValidationError(
                    "Filename contains invalid characters: " + ', '.join(dangerous_chars)
                )
            
            if len(value) > 100:
                raise serializers.ValidationError("Filename too long (max 100 characters)")
        
        return value


class BatchDocumentUploadSerializer(serializers.Serializer):
    """
    Enhanced serializer for batch document uploads
    """
    student = serializers.UUIDField(required=False, allow_null=True)
    documents = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=20,
        help_text="List of document objects with file, category, and optional metadata"
    )
    source_type = serializers.ChoiceField(
        choices=Document.SOURCE_TYPE_CHOICES,
        default='manual'
    )
    source_id = serializers.UUIDField(required=False, allow_null=True)
    
    def validate_documents(self, value):
        """Enhanced validation for batch documents"""
        validated_documents = []
        total_size = 0
        max_batch_size = 100 * 1024 * 1024  # 100MB total
        
        for i, doc_data in enumerate(value):
            # Validate required fields
            if 'file' not in doc_data:
                raise serializers.ValidationError(f"Document {i+1}: 'file' field is required")
            if 'category' not in doc_data:
                raise serializers.ValidationError(f"Document {i+1}: 'category' field is required")
            
            # Validate category
            category = doc_data['category']
            valid_categories = [choice[0] for choice in Document.CATEGORY_CHOICES]
            if category not in valid_categories:
                raise serializers.ValidationError(
                    f"Document {i+1}: Invalid category '{category}'. Must be one of: {valid_categories}"
                )
            
            # Validate file
            file_obj = doc_data['file']
            if not hasattr(file_obj, 'name') or not hasattr(file_obj, 'size'):
                raise serializers.ValidationError(f"Document {i+1}: Invalid file object")
            
            # Use file storage service for validation
            try:
                file_storage.validate_file(file_obj, 'documents')
            except DjangoValidationError as e:
                raise serializers.ValidationError(f"Document {i+1}: {str(e)}")
            
            # Check batch size limit
            total_size += file_obj.size
            if total_size > max_batch_size:
                raise serializers.ValidationError(
                    f"Total batch size ({total_size / (1024 * 1024):.2f}MB) exceeds "
                    f"maximum allowed ({max_batch_size / (1024 * 1024):.2f}MB)"
                )
            
            # Validate optional fields
            tags = doc_data.get('tags', [])
            if tags and len(tags) > 10:
                raise serializers.ValidationError(f"Document {i+1}: Maximum 10 tags allowed")
            
            validated_documents.append({
                'file': file_obj,
                'category': category,
                'original_field_name': doc_data.get('original_field_name', ''),
                'description': doc_data.get('description', ''),
                'tags': [tag.strip().lower() for tag in tags] if tags else [],
                'is_public': doc_data.get('is_public', False),
                'metadata': doc_data.get('metadata', {})
            })
        
        return validated_documents
    
    def validate_student(self, value):
        """Validate that student exists (if provided)"""
        if value is None:
            return value
            
        from apps.students.models import Student
        try:
            Student.objects.get(id=value)
        except Student.DoesNotExist:
            raise serializers.ValidationError("Student not found.")
        return value


class DocumentAccessLogSerializer(serializers.ModelSerializer):
    """
    Serializer for document access logs
    """
    document_name = serializers.CharField(source='document.fileName', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = DocumentAccessLog
        fields = [
            'id',
            'document',
            'document_name',
            'user',
            'user_name',
            'access_type',
            'ip_address',
            'user_agent',
            'timestamp',
            'success',
            'error_message',
        ]
        read_only_fields = ['id', 'timestamp']


class DocumentIntegritySerializer(serializers.Serializer):
    """
    Serializer for document integrity check results
    """
    document_id = serializers.UUIDField()
    file_name = serializers.CharField()
    file_path = serializers.CharField()
    exists = serializers.BooleanField()
    accessible = serializers.BooleanField()
    size_match = serializers.BooleanField()
    hash_match = serializers.BooleanField(required=False)
    expected_size = serializers.IntegerField()
    actual_size = serializers.IntegerField(required=False, allow_null=True)
    status = serializers.CharField()
    errors = serializers.ListField(child=serializers.CharField(), required=False)
    warnings = serializers.ListField(child=serializers.CharField(), required=False)


class AdmissionDocumentUploadSerializer(serializers.Serializer):
    """
    Serializer for admission document uploads
    """
    admission_id = serializers.UUIDField(required=True)
    documents = serializers.DictField(
        child=serializers.FileField(),
        help_text="Dictionary of field_name -> file mappings"
    )
    
    def validate_admission_id(self, value):
        """Validate that admission exists and is pending"""
        from apps.admissions.models import Admission
        try:
            admission = Admission.objects.get(id=value)
            if admission.status not in ['pending']:
                raise serializers.ValidationError(
                    f"Cannot upload documents for {admission.status} admission"
                )
            return value
        except Admission.DoesNotExist:
            raise serializers.ValidationError("Admission not found.")
    
    def validate_documents(self, value):
        """Validate document files"""
        if not value:
            raise serializers.ValidationError("At least one document is required")
        
        # Valid field names for admission documents
        valid_fields = [
            'photo', 'sscMarksheet', 'sscCertificate', 'birthCertificateDoc',
            'studentNIDCopy', 'fatherNIDFront', 'fatherNIDBack', 
            'motherNIDFront', 'motherNIDBack', 'testimonial',
            'medicalCertificate', 'quotaDocument', 'extraCertificates'
        ]
        
        validated_documents = {}
        
        for field_name, file_obj in value.items():
            # Validate field name
            if field_name not in valid_fields:
                raise serializers.ValidationError(
                    f"Invalid document field '{field_name}'. "
                    f"Valid fields: {valid_fields}"
                )
            
            # Validate file
            if not hasattr(file_obj, 'name') or not hasattr(file_obj, 'size'):
                raise serializers.ValidationError(f"Invalid file object for '{field_name}'")
            
            # Use file storage service for validation
            try:
                file_storage.validate_file(file_obj, 'documents')
            except DjangoValidationError as e:
                raise serializers.ValidationError(f"Document '{field_name}': {str(e)}")
            
            validated_documents[field_name] = file_obj
        
        return validated_documents


class FileUploadProgressSerializer(serializers.Serializer):
    """
    Serializer for file upload progress tracking
    """
    upload_id = serializers.UUIDField()
    filename = serializers.CharField()
    total_size = serializers.IntegerField()
    uploaded_size = serializers.IntegerField()
    progress_percent = serializers.FloatField()
    status = serializers.CharField()
    error_message = serializers.CharField(required=False, allow_blank=True)
