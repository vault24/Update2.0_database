from rest_framework import serializers
from django.utils import timezone
from .models import MotivationMessage, MotivationView, MotivationLike, MotivationSettings


class MotivationMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for MotivationMessage model with multilingual support
    """
    localized_title = serializers.SerializerMethodField()
    localized_message = serializers.SerializerMethodField()
    localized_author = serializers.SerializerMethodField()
    effective_active_status = serializers.ReadOnlyField()
    is_scheduled_active = serializers.ReadOnlyField()
    
    class Meta:
        model = MotivationMessage
        fields = [
            'id', 'title', 'message', 'author', 'category',
            'title_bn', 'message_bn', 'author_bn',
            'title_ar', 'message_ar', 'author_ar',
            'reference_source', 'reference_url', 'reference_date', 'reference_context',
            'primary_language', 'display_duration', 'priority',
            'is_active', 'is_featured', 'view_count', 'like_count',
            'start_date', 'end_date',
            'created_at', 'updated_at',
            'localized_title', 'localized_message', 'localized_author',
            'effective_active_status', 'is_scheduled_active'
        ]
        read_only_fields = ['view_count', 'like_count', 'created_at', 'updated_at']
    
    def get_localized_title(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_localized_title(language)
    
    def get_localized_message(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_localized_message(language)
    
    def get_localized_author(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_localized_author(language)
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
            validated_data['updated_by'] = request.user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['updated_by'] = request.user
        return super().update(instance, validated_data)


class MotivationMessageListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for list views
    """
    localized_title = serializers.SerializerMethodField()
    localized_message = serializers.SerializerMethodField()
    localized_author = serializers.SerializerMethodField()
    effective_active_status = serializers.ReadOnlyField()
    
    class Meta:
        model = MotivationMessage
        fields = [
            'id', 'localized_title', 'localized_message', 'localized_author',
            'category', 'priority', 'is_active', 'is_featured',
            'view_count', 'like_count', 'display_duration',
            'created_at', 'updated_at', 'effective_active_status'
        ]
    
    def get_localized_title(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_localized_title(language)
    
    def get_localized_message(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_localized_message(language)
    
    def get_localized_author(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_localized_author(language)


class MotivationMessageCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating motivation messages
    """
    class Meta:
        model = MotivationMessage
        fields = [
            'title', 'message', 'author', 'category',
            'title_bn', 'message_bn', 'author_bn',
            'title_ar', 'message_ar', 'author_ar',
            'reference_source', 'reference_url', 'reference_date', 'reference_context',
            'primary_language', 'display_duration', 'priority',
            'is_active', 'is_featured',
            'start_date', 'end_date'
        ]
    
    def validate(self, data):
        """
        Validate the data
        """
        # Ensure at least one language version is provided
        if not data.get('title') or not data.get('message'):
            raise serializers.ValidationError("Title and message are required.")
        
        # Validate date range
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError("End date must be after start date.")
        
        return data


class MotivationViewSerializer(serializers.ModelSerializer):
    """
    Serializer for MotivationView model
    """
    message_title = serializers.CharField(source='message.title', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = MotivationView
        fields = [
            'id', 'message', 'message_title', 'user', 'user_name',
            'ip_address', 'user_agent', 'viewed_at', 'language_requested'
        ]
        read_only_fields = ['viewed_at']


class MotivationLikeSerializer(serializers.ModelSerializer):
    """
    Serializer for MotivationLike model
    """
    message_title = serializers.CharField(source='message.title', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = MotivationLike
        fields = ['id', 'message', 'message_title', 'user', 'user_name', 'created_at']
        read_only_fields = ['created_at']


class MotivationSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for MotivationSettings model
    """
    class Meta:
        model = MotivationSettings
        fields = [
            'default_display_duration', 'auto_rotate', 'rotation_interval',
            'default_language', 'enable_multilingual',
            'enable_likes', 'enable_analytics', 'enable_scheduling',
            'max_messages_per_day', 'prioritize_featured',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class MotivationStatsSerializer(serializers.Serializer):
    """
    Serializer for motivation statistics
    """
    total_messages = serializers.IntegerField()
    active_messages = serializers.IntegerField()
    featured_messages = serializers.IntegerField()
    total_views = serializers.IntegerField()
    total_likes = serializers.IntegerField()
    avg_views_per_message = serializers.FloatField()
    avg_likes_per_message = serializers.FloatField()
    most_viewed_message = MotivationMessageListSerializer()
    most_liked_message = MotivationMessageListSerializer()
    recent_views = serializers.IntegerField()
    recent_likes = serializers.IntegerField()
    
    # Category breakdown
    category_stats = serializers.DictField()
    language_stats = serializers.DictField()
    
    # Time-based stats
    views_today = serializers.IntegerField()
    views_this_week = serializers.IntegerField()
    views_this_month = serializers.IntegerField()


class StudentMotivationSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for student-facing API
    """
    localized_title = serializers.SerializerMethodField()
    localized_message = serializers.SerializerMethodField()
    localized_author = serializers.SerializerMethodField()
    
    class Meta:
        model = MotivationMessage
        fields = [
            'id', 'localized_title', 'localized_message', 'localized_author',
            'category', 'display_duration', 'reference_source',
            'like_count', 'created_at'
        ]
    
    def get_localized_title(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_localized_title(language)
    
    def get_localized_message(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_localized_message(language)
    
    def get_localized_author(self, obj):
        language = self.context.get('language', 'en')
        return obj.get_localized_author(language)