"""
Live Classes Serializers
"""
from rest_framework import serializers
from .models import (
    LiveClass, ClassParticipant, ClassRecording, RecordingAccess,
    ClassChat, ClassPoll, PollResponse
)


class LiveClassSerializer(serializers.ModelSerializer):
    """Live class serializer"""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    participants_count = serializers.SerializerMethodField()
    
    class Meta:
        model = LiveClass
        fields = [
            'id', 'title', 'description', 'subject', 'subject_name', 'subject_code',
            'teacher', 'teacher_name', 'scheduled_date', 'start_time', 'end_time', 'timezone',
            'platform', 'meeting_link', 'meeting_id', 'passcode',
            'status', 'is_recorded', 'recording_url', 'max_participants', 'participants_count',
            'agenda', 'materials', 'reminder_sent', 'notification_time',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'participants_count', 'created_at', 'updated_at']
    
    def get_participants_count(self, obj):
        return obj.participants.filter(is_present=True).count()


class ClassParticipantSerializer(serializers.ModelSerializer):
    """Class participant serializer"""
    participant_name = serializers.SerializerMethodField()
    participant_email = serializers.SerializerMethodField()
    
    class Meta:
        model = ClassParticipant
        fields = [
            'id', 'live_class', 'student', 'teacher', 'guest_name', 'guest_email',
            'role', 'participant_name', 'participant_email',
            'joined_at', 'left_at', 'duration_minutes', 'is_present',
            'questions_asked', 'chat_messages', 'created_at'
        ]
        read_only_fields = ['id', 'duration_minutes', 'created_at']
    
    def get_participant_name(self, obj):
        if obj.student:
            return obj.student.fullNameEnglish
        elif obj.teacher:
            return obj.teacher.name
        else:
            return obj.guest_name
    
    def get_participant_email(self, obj):
        if obj.student:
            return obj.student.email
        elif obj.teacher:
            return obj.teacher.email
        else:
            return obj.guest_email


class ClassRecordingSerializer(serializers.ModelSerializer):
    """Class recording serializer"""
    live_class_title = serializers.CharField(source='live_class.title', read_only=True)
    subject_name = serializers.CharField(source='live_class.subject.name', read_only=True)
    
    class Meta:
        model = ClassRecording
        fields = [
            'id', 'live_class', 'live_class_title', 'subject_name',
            'title', 'description', 'recording_type',
            'file_url', 'file_size', 'duration_seconds',
            'start_time', 'end_time', 'chapters',
            'is_public', 'password_protected', 'access_password',
            'view_count', 'download_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'view_count', 'download_count', 'created_at', 'updated_at']


class RecordingAccessSerializer(serializers.ModelSerializer):
    """Recording access tracking serializer"""
    recording_title = serializers.CharField(source='recording.title', read_only=True)
    student_name = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    
    class Meta:
        model = RecordingAccess
        fields = [
            'id', 'recording', 'recording_title', 'student', 'student_name',
            'accessed_at', 'watch_duration_seconds', 'completed', 'last_position_seconds',
            'bookmarks', 'notes', 'rating'
        ]
        read_only_fields = ['id', 'accessed_at']


class ClassChatSerializer(serializers.ModelSerializer):
    """Class chat serializer"""
    sender_avatar = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ClassChat
        fields = [
            'id', 'live_class', 'student', 'teacher', 'sender_name', 'sender_avatar',
            'message_type', 'content', 'attachments',
            'timestamp', 'is_private', 'is_pinned',
            'reactions', 'reply_to', 'replies_count'
        ]
        read_only_fields = ['id', 'timestamp', 'sender_name', 'sender_avatar', 'replies_count']
    
    def get_sender_avatar(self, obj):
        if obj.student and obj.student.profilePhoto:
            return obj.student.profilePhoto
        return None
    
    def get_replies_count(self, obj):
        return obj.replies.count()


class ClassPollSerializer(serializers.ModelSerializer):
    """Class poll serializer"""
    responses_count = serializers.SerializerMethodField()
    my_response = serializers.SerializerMethodField()
    
    class Meta:
        model = ClassPoll
        fields = [
            'id', 'live_class', 'question', 'poll_type', 'options',
            'is_anonymous', 'allow_multiple_answers', 'time_limit_seconds',
            'is_active', 'started_at', 'ended_at', 'responses_count', 'my_response',
            'created_at'
        ]
        read_only_fields = ['id', 'responses_count', 'my_response', 'created_at']
    
    def get_responses_count(self, obj):
        return obj.responses.count()
    
    def get_my_response(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'student_profile'):
            try:
                response = obj.responses.get(student=request.user.student_profile)
                return PollResponseSerializer(response).data
            except PollResponse.DoesNotExist:
                return None
        return None


class PollResponseSerializer(serializers.ModelSerializer):
    """Poll response serializer"""
    student_name = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    
    class Meta:
        model = PollResponse
        fields = [
            'id', 'poll', 'student', 'student_name',
            'selected_options', 'text_response', 'rating_value',
            'submitted_at'
        ]
        read_only_fields = ['id', 'submitted_at']


# Detailed serializers
class LiveClassDetailSerializer(LiveClassSerializer):
    """Detailed live class serializer with participants and recordings"""
    participants = ClassParticipantSerializer(many=True, read_only=True)
    recordings = ClassRecordingSerializer(many=True, read_only=True)
    chat_messages = ClassChatSerializer(many=True, read_only=True)
    polls = ClassPollSerializer(many=True, read_only=True, context={'request': None})
    my_participation = serializers.SerializerMethodField()
    
    class Meta(LiveClassSerializer.Meta):
        fields = LiveClassSerializer.Meta.fields + [
            'participants', 'recordings', 'chat_messages', 'polls', 'my_participation'
        ]
    
    def get_my_participation(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'student_profile'):
            try:
                participation = obj.participants.get(student=request.user.student_profile)
                return ClassParticipantSerializer(participation).data
            except ClassParticipant.DoesNotExist:
                return None
        return None


class ClassRecordingDetailSerializer(ClassRecordingSerializer):
    """Detailed recording serializer with access info"""
    my_access = serializers.SerializerMethodField()
    total_views = serializers.SerializerMethodField()
    
    class Meta(ClassRecordingSerializer.Meta):
        fields = ClassRecordingSerializer.Meta.fields + ['my_access', 'total_views']
    
    def get_my_access(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'student_profile'):
            try:
                access = obj.accesses.get(student=request.user.student_profile)
                return RecordingAccessSerializer(access).data
            except RecordingAccess.DoesNotExist:
                return None
        return None
    
    def get_total_views(self, obj):
        return obj.accesses.count()


# Summary serializers for dashboard
class LiveClassSummarySerializer(serializers.ModelSerializer):
    """Summary serializer for dashboard"""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    
    class Meta:
        model = LiveClass
        fields = [
            'id', 'title', 'subject_name', 'subject_code',
            'scheduled_date', 'start_time', 'status', 'is_recorded'
        ]