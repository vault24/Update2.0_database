"""
Correction Request Serializers
"""
from rest_framework import serializers
from .models import CorrectionRequest


class CorrectionRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for Correction Request model
    """
    student_name = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    
    class Meta:
        model = CorrectionRequest
        fields = [
            'id', 'student', 'student_name', 'field_name', 'current_value',
            'requested_value', 'reason', 'supporting_documents', 'status',
            'requested_by', 'requested_by_name', 'submitted_at',
            'reviewed_at', 'reviewed_by', 'reviewed_by_name', 'review_notes'
        ]
        read_only_fields = ['id', 'submitted_at', 'reviewed_at']


class CorrectionRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating correction requests
    """
    class Meta:
        model = CorrectionRequest
        fields = [
            'student', 'field_name', 'current_value',
            'requested_value', 'reason', 'supporting_documents'
        ]


class CorrectionRequestReviewSerializer(serializers.Serializer):
    """
    Serializer for reviewing correction requests
    """
    review_notes = serializers.CharField(required=False, allow_blank=True)
