from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Notice, NoticeReadStatus

User = get_user_model()


class NoticeSerializer(serializers.ModelSerializer):
    """Serializer for Notice model"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    read_count = serializers.IntegerField(read_only=True)
    total_students = serializers.IntegerField(read_only=True)
    read_percentage = serializers.FloatField(read_only=True)
    is_low_engagement = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Notice
        fields = [
            'id',
            'title',
            'content',
            'priority',
            'is_published',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
            'read_count',
            'total_students',
            'read_percentage',
            'is_low_engagement',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def validate_title(self, value):
        """Validate that title is not empty or just whitespace"""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty or contain only whitespace.")
        return value.strip()
    
    def validate_content(self, value):
        """Validate that content is not empty or just whitespace"""
        if not value or not value.strip():
            raise serializers.ValidationError("Content cannot be empty or contain only whitespace.")
        return value.strip()


class NoticeCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating notices (admin only)"""
    
    class Meta:
        model = Notice
        fields = ['title', 'content', 'priority', 'is_published']
    
    def validate_title(self, value):
        """Validate that title is not empty or just whitespace"""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty or contain only whitespace.")
        return value.strip()
    
    def validate_content(self, value):
        """Validate that content is not empty or just whitespace"""
        if not value or not value.strip():
            raise serializers.ValidationError("Content cannot be empty or contain only whitespace.")
        return value.strip()


class StudentNoticeSerializer(serializers.ModelSerializer):
    """Serializer for notices as seen by students"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    is_read = serializers.SerializerMethodField()
    
    class Meta:
        model = Notice
        fields = [
            'id',
            'title',
            'content',
            'priority',
            'created_at',
            'updated_at',
            'created_by_name',
            'is_read',
        ]
    
    def get_is_read(self, obj):
        """Check if the current student has read this notice"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return NoticeReadStatus.objects.filter(
                notice=obj,
                student=request.user
            ).exists()
        return False


class NoticeReadStatusSerializer(serializers.ModelSerializer):
    """Serializer for NoticeReadStatus model"""
    
    notice_title = serializers.CharField(source='notice.title', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    
    class Meta:
        model = NoticeReadStatus
        fields = [
            'id',
            'notice',
            'student',
            'notice_title',
            'student_name',
            'read_at',
            'created_at',
        ]
        read_only_fields = ['id', 'read_at', 'created_at']


class NoticeStatsSerializer(serializers.Serializer):
    """Serializer for notice engagement statistics"""
    
    notice_id = serializers.IntegerField()
    title = serializers.CharField()
    priority = serializers.CharField()
    created_at = serializers.DateTimeField()
    is_published = serializers.BooleanField()
    read_count = serializers.IntegerField()
    total_students = serializers.IntegerField()
    read_percentage = serializers.FloatField()
    is_low_engagement = serializers.BooleanField()
    unread_count = serializers.IntegerField()


class MarkAsReadSerializer(serializers.Serializer):
    """Serializer for marking a notice as read"""
    
    notice_id = serializers.IntegerField()
    
    def validate_notice_id(self, value):
        """Validate that the notice exists and is published"""
        try:
            notice = Notice.objects.get(id=value, is_published=True)
            return value
        except Notice.DoesNotExist:
            raise serializers.ValidationError("Notice not found or not published.")
    
    def create(self, validated_data):
        """Create or get the read status record"""
        notice_id = validated_data['notice_id']
        student = self.context['request'].user
        
        notice = Notice.objects.get(id=notice_id)
        read_status, created = NoticeReadStatus.objects.get_or_create(
            notice=notice,
            student=student
        )
        
        return {
            'notice_id': notice_id,
            'is_read': True,
            'read_at': read_status.read_at,
            'created': created
        }