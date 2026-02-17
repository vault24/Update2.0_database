"""
Serializers for structured document storage
"""
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Document
from utils.structured_file_storage import structured_storage
from apps.students.models import Student
from apps.departments.models import Department


class StructuredStudentDocumentUploadSerializer(serializers.Serializer):
    """
    Serializer for uploading student documents with structured storage
    """
    file = serializers.FileField(required=True)
    student_id = serializers.UUIDField(required=True)
    document_category = serializers.ChoiceField(
        choices=[
            'photo', 'birth_certificate', 'nid', 'father_nid', 'mother_nid',
            'ssc_marksheet', 'ssc_certificate', 'transcript',
            'medical_certificate', 'quota_document', 'other'
        ],
        required=True
    )
    description = serializers.CharField(required=False, allow_blank=True)
    
    def validate_student_id(self, value):
        """Validate that student exists"""
        try:
            student = Student.objects.select_related('department').get(id=value)
            return student
        except Student.DoesNotExist:
            raise serializers.ValidationError("Student not found")
    
    def validate(self, attrs):
        """Validate file and prepare for upload"""
        file_obj = attrs['file']
        document_category = attrs['document_category']
        
        # Validate file using structured storage
        try:
            structured_storage._validate_file(file_obj, document_category)
        except DjangoValidationError as e:
            raise serializers.ValidationError({'file': str(e)})
        
        return attrs
    
    def create(self, validated_data):
        """Create document with structured storage"""
        file_obj = validated_data['file']
        student = validated_data['student_id']
        document_category = validated_data['document_category']
        description = validated_data.get('description', '')
        
        # Prepare student data for structured storage
        student_data = {
            'department_code': student.department.code.lower().replace(' ', '-'),
            'department_name': student.department.name.lower().replace(' ', '-'),
            'session': student.session,
            'shift': student.shift.lower().replace(' ', '-'),
            'student_name': student.fullNameEnglish.replace(' ', ''),
            'student_id': student.currentRollNumber,
        }
        
        # Save file using structured storage
        file_info = structured_storage.save_student_document(
            uploaded_file=file_obj,
            student_data=student_data,
            document_category=document_category,
            validate=False  # Already validated
        )
        
        # Map old category for backward compatibility
        category_map = {
            'photo': 'Photo',
            'birth_certificate': 'Birth Certificate',
            'nid': 'NID',
            'father_nid': 'NID',
            'mother_nid': 'NID',
            'ssc_marksheet': 'Marksheet',
            'ssc_certificate': 'Certificate',
            'transcript': 'Testimonial',
            'medical_certificate': 'Medical Certificate',
            'quota_document': 'Quota Document',
            'other': 'Other',
        }
        
        # Create document record
        document = Document.objects.create(
            student=student,
            fileName=file_info['file_name'],
            fileType=file_info['file_type'],
            category=category_map.get(document_category, 'Other'),
            filePath=file_info['file_path'],
            fileSize=file_info['file_size'],
            fileHash=file_info['file_hash'],
            mimeType=file_info['mime_type'],
            description=description,
            source_type='manual',
            # Structured storage fields
            document_type=file_info['document_type'],
            department_code=file_info['department_code'],
            session=file_info['session'],
            shift=file_info['shift'],
            owner_name=file_info['owner_name'],
            owner_id=file_info['owner_id'],
            document_category=file_info['document_category'],
        )
        
        return document


class StructuredStudentDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for student documents with structured storage info
    """
    file_url = serializers.SerializerMethodField()
    file_size_mb = serializers.SerializerMethodField()
    is_image = serializers.SerializerMethodField()
    is_pdf = serializers.SerializerMethodField()
    student_name = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    department_name = serializers.CharField(source='student.department.name', read_only=True)
    
    class Meta:
        model = Document
        fields = [
            'id', 'fileName', 'fileType', 'category', 'filePath',
            'fileSize', 'file_size_mb', 'uploadDate', 'lastModified',
            'description', 'status', 'file_url', 'is_image', 'is_pdf',
            # Structured storage fields
            'document_type', 'department_code', 'session', 'shift',
            'owner_name', 'owner_id', 'document_category',
            # Related fields
            'student_name', 'department_name',
        ]
        read_only_fields = [
            'id', 'uploadDate', 'lastModified', 'fileSize', 'fileHash',
            'mimeType', 'file_url', 'file_size_mb', 'is_image', 'is_pdf'
        ]
    
    def get_file_url(self, obj):
        """Get file URL"""
        return structured_storage.get_file_url(obj.filePath)
    
    def get_file_size_mb(self, obj):
        """Get file size in MB"""
        return round(obj.fileSize / (1024 * 1024), 2) if obj.fileSize else 0
    
    def get_is_image(self, obj):
        """Check if file is an image"""
        return obj.is_image
    
    def get_is_pdf(self, obj):
        """Check if file is a PDF"""
        return obj.is_pdf


class BulkStudentDocumentUploadSerializer(serializers.Serializer):
    """
    Serializer for bulk uploading student documents
    """
    student_id = serializers.UUIDField(required=True)
    documents = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        min_length=1,
        max_length=20
    )
    
    def validate_student_id(self, value):
        """Validate that student exists"""
        try:
            student = Student.objects.select_related('department').get(id=value)
            return student
        except Student.DoesNotExist:
            raise serializers.ValidationError("Student not found")
    
    def validate_documents(self, value):
        """Validate documents list"""
        for i, doc in enumerate(value):
            if 'file' not in doc:
                raise serializers.ValidationError(f"Document {i+1}: 'file' field is required")
            if 'document_category' not in doc:
                raise serializers.ValidationError(f"Document {i+1}: 'document_category' field is required")
            
            # Validate category
            valid_categories = [
                'photo', 'birth_certificate', 'nid', 'father_nid', 'mother_nid',
                'ssc_marksheet', 'ssc_certificate', 'transcript',
                'medical_certificate', 'quota_document', 'other'
            ]
            if doc['document_category'] not in valid_categories:
                raise serializers.ValidationError(
                    f"Document {i+1}: Invalid category '{doc['document_category']}'"
                )
        
        return value
    
    def create(self, validated_data):
        """Create multiple documents"""
        student = validated_data['student_id']
        documents_data = validated_data['documents']
        
        created_documents = []
        errors = []
        
        for i, doc_data in enumerate(documents_data):
            try:
                # Use single document serializer
                serializer = StructuredStudentDocumentUploadSerializer(data={
                    'file': doc_data['file'],
                    'student_id': student.id,
                    'document_category': doc_data['document_category'],
                    'description': doc_data.get('description', ''),
                })
                
                if serializer.is_valid():
                    document = serializer.save()
                    created_documents.append(document)
                else:
                    errors.append({
                        'index': i,
                        'category': doc_data['document_category'],
                        'errors': serializer.errors
                    })
            except Exception as e:
                errors.append({
                    'index': i,
                    'category': doc_data['document_category'],
                    'errors': str(e)
                })
        
        return {
            'created': created_documents,
            'errors': errors,
            'total': len(documents_data),
            'success_count': len(created_documents),
            'error_count': len(errors),
        }


class StudentDocumentListSerializer(serializers.Serializer):
    """
    Serializer for listing student documents by category
    """
    student_id = serializers.UUIDField(required=True)
    document_category = serializers.ChoiceField(
        choices=[
            'photo', 'birth_certificate', 'nid', 'father_nid', 'mother_nid',
            'ssc_marksheet', 'ssc_certificate', 'transcript',
            'medical_certificate', 'quota_document', 'other', 'all'
        ],
        required=False,
        default='all'
    )
    
    def validate_student_id(self, value):
        """Validate that student exists"""
        try:
            student = Student.objects.select_related('department').get(id=value)
            return student
        except Student.DoesNotExist:
            raise serializers.ValidationError("Student not found")


class DocumentStorageStatsSerializer(serializers.Serializer):
    """
    Serializer for storage statistics
    """
    total_files = serializers.IntegerField()
    total_size_bytes = serializers.IntegerField()
    total_size_mb = serializers.FloatField()
    total_size_gb = serializers.FloatField()
    by_type = serializers.DictField()
    storage_root = serializers.CharField()
