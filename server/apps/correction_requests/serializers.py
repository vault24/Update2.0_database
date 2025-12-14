"""
Correction Request Serializers
"""
from rest_framework import serializers
from .models import CorrectionRequest
from apps.students.serializers import StudentListSerializer
from apps.authentication.serializers import UserSerializer


class CorrectionRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for reading correction requests
    """
    student = StudentListSerializer(read_only=True)
    requested_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    
    class Meta:
        model = CorrectionRequest
        fields = [
            'id', 'student', 'requested_by', 'field_name', 'current_value',
            'requested_value', 'reason', 'supporting_documents', 'status',
            'submitted_at', 'reviewed_at', 'reviewed_by', 'review_notes'
        ]
        read_only_fields = [
            'id', 'submitted_at', 'reviewed_at', 'reviewed_by', 'status'
        ]


class CorrectionRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating correction requests
    """
    class Meta:
        model = CorrectionRequest
        fields = [
            'student', 'field_name', 'current_value', 'requested_value',
            'reason', 'supporting_documents'
        ]
    
    def validate(self, data):
        """
        Validate correction request data
        """
        # Check if there's already a pending request for this field
        student = data.get('student')
        field_name = data.get('field_name')
        
        if student and field_name:
            existing_request = CorrectionRequest.objects.filter(
                student=student,
                field_name=field_name,
                status='pending'
            ).first()
            
            if existing_request:
                raise serializers.ValidationError(
                    f"There is already a pending correction request for {field_name}"
                )
        
        return data


class CorrectionRequestReviewSerializer(serializers.Serializer):
    """
    Serializer for reviewing correction requests
    """
    review_notes = serializers.CharField(required=False, allow_blank=True)