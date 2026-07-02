"""
System Reports serializers
"""
from rest_framework import serializers

from .models import SystemReport


class SystemReportListSerializer(serializers.ModelSerializer):
    """Compact serializer for the reports table (no stack trace)."""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True, default=None)

    class Meta:
        model = SystemReport
        fields = [
            'id', 'category', 'category_display', 'severity', 'severity_display',
            'status', 'status_display', 'source', 'title', 'message',
            'exception_type', 'path', 'method', 'status_code',
            'user_display', 'occurrence_count', 'first_seen', 'last_seen',
            'assigned_to', 'assigned_to_name', 'resolved_at',
        ]


class SystemReportDetailSerializer(serializers.ModelSerializer):
    """Full serializer including stack trace and workflow fields."""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True, default=None)
    resolved_by_name = serializers.CharField(source='resolved_by.username', read_only=True, default=None)

    class Meta:
        model = SystemReport
        fields = [
            'id', 'category', 'category_display', 'severity', 'severity_display',
            'status', 'status_display', 'source', 'title', 'message',
            'exception_type', 'stack_trace', 'path', 'method', 'status_code',
            'ip_address', 'user', 'user_display', 'extra',
            'occurrence_count', 'first_seen', 'last_seen',
            'assigned_to', 'assigned_to_name', 'resolved_by', 'resolved_by_name',
            'resolved_at', 'resolution_note', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'source', 'occurrence_count', 'first_seen', 'last_seen',
            'created_at', 'updated_at',
        ]


class SystemReportCreateSerializer(serializers.ModelSerializer):
    """Manual entries: maintenance logs, downtime/outage records, bugs."""

    class Meta:
        model = SystemReport
        fields = ['category', 'severity', 'title', 'message', 'extra']

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Title is required.')
        return value.strip()
