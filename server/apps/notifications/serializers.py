from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Notification, NotificationPreference, NotificationPreferenceType, DeliveryLog


class NotificationSerializer(serializers.ModelSerializer):
    recipient_username = serializers.CharField(source='recipient.username', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'recipient_username', 'notification_type', 'title',
            'message', 'data', 'status', 'created_at', 'read_at', 'archived_at', 'deleted_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at', 'archived_at', 'deleted_at']

    def validate_recipient(self, value):
        """Validate that recipient exists"""
        if not isinstance(value, User):
            raise serializers.ValidationError("Invalid recipient user.")
        return value

    def validate_title(self, value):
        """Validate that title is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value

    def validate_message(self, value):
        """Validate that message is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Message cannot be empty.")
        return value


class NotificationPreferenceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreferenceType
        fields = ['id', 'notification_type', 'enabled', 'email_enabled']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    type_preferences = NotificationPreferenceTypeSerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = NotificationPreference
        fields = ['id', 'user', 'username', 'type_preferences', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class DeliveryLogSerializer(serializers.ModelSerializer):
    notification_title = serializers.CharField(source='notification.title', read_only=True)
    recipient_username = serializers.CharField(source='notification.recipient.username', read_only=True)

    class Meta:
        model = DeliveryLog
        fields = [
            'id', 'notification', 'notification_title', 'recipient_username',
            'channel', 'status', 'retry_count', 'error_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
