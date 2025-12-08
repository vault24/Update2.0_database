"""
System Settings Serializers
"""
from rest_framework import serializers
from .models import SystemSettings


class SystemSettingsSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = SystemSettings
        fields = '__all__'
        read_only_fields = ['id', 'updated_at', 'updated_by']


class SystemSettingsUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            'current_academic_year', 'current_semester',
            'enable_email_notifications', 'enable_sms_notifications', 'admin_notification_email',
            'allow_student_registration', 'allow_teacher_registration', 'allow_admission_submission',
            'institute_name', 'institute_address', 'institute_phone', 'institute_email',
            'maintenance_mode', 'maintenance_message'
        ]
    
    def validate_current_semester(self, value):
        if value < 1 or value > 8:
            raise serializers.ValidationError("Semester must be between 1 and 8")
        return value
