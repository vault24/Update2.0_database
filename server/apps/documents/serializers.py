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
        # Check file type (only PDF allowed for documents)
        if not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError(
                "Only PDF files are allowed for documents."
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
