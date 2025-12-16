"""
Document Serializers
"""
from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """
    Complete serializer for document data
    """
    studentName = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)
    
    class Meta:
        model = Document
        fields = [
            'id',
            'student',
            'studentName',
            'fileName',
            'fileType',
            'category',
            'filePath',
            'fileSize',
            'uploadDate',
            'source_type',
            'source_type_display',
            'source_id',
            'original_field_name',
        ]
        read_only_fields = ['id', 'uploadDate', 'filePath', 'fileSize']


class DocumentUploadSerializer(serializers.Serializer):
    """
    Serializer for document uploads
    """
    student = serializers.UUIDField(required=True)
    category = serializers.ChoiceField(
        choices=Document.CATEGORY_CHOICES,
        required=True
    )
    file = serializers.FileField(required=True)
    
    def validate_file(self, value):
        """Validate file type and size"""
        # Check file type (allow PDF, JPG, PNG for documents)
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
        if not any(value.name.lower().endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                "Only PDF, JPG, JPEG, and PNG files are allowed for documents."
            )
        
        # Check file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size must not exceed 10MB. Current size: {value.size / (1024 * 1024):.2f}MB"
            )
        
        return value
    
    def validate_student(self, value):
        """Validate that student exists"""
        from apps.students.models import Student
        try:
            Student.objects.get(id=value)
        except Student.DoesNotExist:
            raise serializers.ValidationError("Student not found.")
        return value


class BatchDocumentUploadSerializer(serializers.Serializer):
    """
    Serializer for batch document uploads
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
        """Validate each document in the batch"""
        validated_documents = []
        
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
            
            # File type validation
            allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
            if not any(file_obj.name.lower().endswith(ext) for ext in allowed_extensions):
                raise serializers.ValidationError(
                    f"Document {i+1}: Only PDF, JPG, JPEG, and PNG files are allowed"
                )
            
            # File size validation (max 10MB)
            max_size = 10 * 1024 * 1024
            if file_obj.size > max_size:
                raise serializers.ValidationError(
                    f"Document {i+1}: File size must not exceed 10MB. "
                    f"Current size: {file_obj.size / (1024 * 1024):.2f}MB"
                )
            
            validated_documents.append({
                'file': file_obj,
                'category': category,
                'original_field_name': doc_data.get('original_field_name', ''),
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
            if admission.status != 'pending':
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
            
            # File type validation
            allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
            if not any(file_obj.name.lower().endswith(ext) for ext in allowed_extensions):
                raise serializers.ValidationError(
                    f"Document '{field_name}': Only PDF, JPG, JPEG, and PNG files are allowed"
                )
            
            # File size validation (max 10MB)
            max_size = 10 * 1024 * 1024
            if file_obj.size > max_size:
                raise serializers.ValidationError(
                    f"Document '{field_name}': File size must not exceed 10MB. "
                    f"Current size: {file_obj.size / (1024 * 1024):.2f}MB"
                )
            
            validated_documents[field_name] = file_obj
        
        return validated_documents
