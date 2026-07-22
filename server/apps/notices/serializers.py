import json
import os

from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.departments.models import Department
from apps.students.models import Student
from .models import Notice, NoticeReadStatus, NoticeAttachment

User = get_user_model()

VALID_AUDIENCES = {choice[0] for choice in Notice.AUDIENCE_CHOICES}
VALID_SHIFTS = {choice[0] for choice in Student.SHIFT_CHOICES}


def clean_targeting_payload(data):
    """Validate and normalize a targeting payload.

    Accepts a dict (JSON requests) or a JSON string (multipart form posts).
    Returns ``{'audience', 'departments', 'semesters', 'shifts', 'sessions'}``
    with every filter defaulting to "no restriction". Shared by the notice
    create/update serializer and the recipient-preview endpoint so both
    validate identically.
    """
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (TypeError, ValueError):
            raise serializers.ValidationError({'targeting': 'Invalid JSON payload.'})
    if data is None:
        data = {}
    if not isinstance(data, dict):
        raise serializers.ValidationError({'targeting': 'Targeting must be an object.'})

    audience = data.get('audience') or Notice.AUDIENCE_STUDENTS_TEACHERS
    if audience not in VALID_AUDIENCES:
        raise serializers.ValidationError({'targeting': f'Unknown audience "{audience}".'})

    def _as_list(key):
        value = data.get(key) or []
        if not isinstance(value, list):
            raise serializers.ValidationError({'targeting': f'"{key}" must be a list.'})
        return value

    departments = [str(d) for d in _as_list('departments')]
    if departments:
        found = set(
            str(pk) for pk in
            Department.objects.filter(id__in=departments).values_list('id', flat=True)
        )
        missing = [d for d in departments if d not in found]
        if missing:
            raise serializers.ValidationError({'targeting': 'Unknown department id(s) in filter.'})

    semesters = []
    for s in _as_list('semesters'):
        try:
            s = int(s)
        except (TypeError, ValueError):
            raise serializers.ValidationError({'targeting': 'Semesters must be integers.'})
        if not 1 <= s <= 8:
            raise serializers.ValidationError({'targeting': 'Semesters must be between 1 and 8.'})
        semesters.append(s)

    shifts = [str(s) for s in _as_list('shifts')]
    invalid_shifts = [s for s in shifts if s not in VALID_SHIFTS]
    if invalid_shifts:
        raise serializers.ValidationError({'targeting': f'Unknown shift(s): {", ".join(invalid_shifts)}.'})

    sessions = [str(s).strip() for s in _as_list('sessions') if str(s).strip()]

    # Teachers-only audiences have no semester/shift/session dimension;
    # alumni have no semester. Silently drop non-applicable filters instead
    # of erroring so the UI can switch audiences without stale-state failures.
    if audience == Notice.AUDIENCE_TEACHERS:
        semesters, shifts, sessions = [], [], []
    elif audience == Notice.AUDIENCE_ALUMNI:
        semesters = []

    return {
        'audience': audience,
        'departments': departments,
        'semesters': sorted(set(semesters)),
        'shifts': shifts,
        'sessions': sessions,
    }


class TargetDepartmentSerializer(serializers.ModelSerializer):
    """Compact department representation for targeting displays."""

    class Meta:
        model = Department
        fields = ['id', 'name', 'code']


class NoticeAttachmentSerializer(serializers.ModelSerializer):
    """Serializer exposing a downloadable URL + friendly name for an attachment."""

    name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = NoticeAttachment
        fields = ['id', 'name', 'file_url', 'uploaded_at']

    def get_name(self, obj):
        return obj.original_name or os.path.basename(obj.file.name)

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class NoticeSerializer(serializers.ModelSerializer):
    """Serializer for Notice model"""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    read_count = serializers.IntegerField(read_only=True)
    total_students = serializers.IntegerField(read_only=True)
    read_percentage = serializers.FloatField(read_only=True)
    is_low_engagement = serializers.BooleanField(read_only=True)
    attachments = NoticeAttachmentSerializer(many=True, read_only=True)
    audience_display = serializers.CharField(source='get_audience_display', read_only=True)
    target_departments = TargetDepartmentSerializer(many=True, read_only=True)

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
            'attachments',
            'audience',
            'audience_display',
            'target_departments',
            'target_semesters',
            'target_shifts',
            'target_sessions',
            'recipient_count',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'created_by',
            'audience', 'target_departments', 'target_semesters',
            'target_shifts', 'target_sessions', 'recipient_count',
        ]
    
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
    """Serializer for creating and updating notices (admin only).

    Audience targeting arrives as a single `targeting` payload — a JSON
    object (JSON requests) or JSON string (multipart posts with attachments):
        {"audience": "students", "departments": [...uuids],
         "semesters": [4], "shifts": ["Morning"], "sessions": ["22-23"]}
    Omitting `targeting` keeps the notice's existing targeting (default for
    new notices: active students + teachers, no filters) so legacy API
    clients keep working unchanged.
    """

    targeting = serializers.JSONField(required=False, write_only=True)

    class Meta:
        model = Notice
        fields = ['title', 'content', 'priority', 'is_published', 'targeting']

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

    def validate_targeting(self, value):
        return clean_targeting_payload(value)

    def _apply_targeting(self, notice, targeting):
        notice.audience = targeting['audience']
        notice.target_semesters = targeting['semesters']
        notice.target_shifts = targeting['shifts']
        notice.target_sessions = targeting['sessions']
        notice.save(update_fields=['audience', 'target_semesters', 'target_shifts', 'target_sessions'])
        notice.target_departments.set(targeting['departments'])

    def create(self, validated_data):
        targeting = validated_data.pop('targeting', None)
        notice = super().create(validated_data)
        if targeting is not None:
            self._apply_targeting(notice, targeting)
        return notice

    def update(self, instance, validated_data):
        targeting = validated_data.pop('targeting', None)
        notice = super().update(instance, validated_data)
        if targeting is not None:
            self._apply_targeting(notice, targeting)
        return notice


class StudentNoticeSerializer(serializers.ModelSerializer):
    """Serializer for notices as seen by students"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    is_read = serializers.SerializerMethodField()
    attachments = NoticeAttachmentSerializer(many=True, read_only=True)

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
            'attachments',
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