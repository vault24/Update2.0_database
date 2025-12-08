"""
Application Serializers
"""
from rest_framework import serializers
from .models import Application


class ApplicationSubmitSerializer(serializers.ModelSerializer):
    """
    Serializer for public application submissions
    """
    class Meta:
        model = Application
        fields = [
            'fullNameBangla',
            'fullNameEnglish',
            'fatherName',
            'motherName',
            'department',
            'session',
            'shift',
            'rollNumber',
            'registrationNumber',
            'email',
            'applicationType',
            'subject',
            'message',
            'selectedDocuments',
        ]
    
    def validate_email(self, value):
        """Validate email format if provided"""
        if value and '@' not in value:
            raise serializers.ValidationError("Enter a valid email address.")
        return value


class ApplicationSerializer(serializers.ModelSerializer):
    """
    Complete serializer for application data
    """
    class Meta:
        model = Application
        fields = [
            'id',
            'fullNameBangla',
            'fullNameEnglish',
            'fatherName',
            'motherName',
            'department',
            'session',
            'shift',
            'rollNumber',
            'registrationNumber',
            'email',
            'applicationType',
            'subject',
            'message',
            'selectedDocuments',
            'status',
            'submittedAt',
            'reviewedAt',
            'reviewedBy',
            'reviewNotes',
        ]
        read_only_fields = ['id', 'submittedAt']


class ApplicationReviewSerializer(serializers.Serializer):
    """
    Serializer for admin review of applications
    """
    status = serializers.ChoiceField(
        choices=['approved', 'rejected'],
        required=True
    )
    reviewedBy = serializers.CharField(max_length=255, required=True)
    reviewNotes = serializers.CharField(
        required=False,
        allow_blank=True,
        style={'base_template': 'textarea.html'}
    )
    
    def validate_status(self, value):
        """Ensure status is either approved or rejected"""
        if value not in ['approved', 'rejected']:
            raise serializers.ValidationError(
                "Status must be either 'approved' or 'rejected'."
            )
        return value
