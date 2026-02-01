"""
Live Classes Admin Configuration
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import LiveClass, ClassRecording, ClassParticipant


@admin.register(LiveClass)
class LiveClassAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'scheduled_date', 'start_time', 'status', 'platform']
    list_filter = ['status', 'platform', 'scheduled_date', 'subject__department']
    search_fields = ['title', 'description', 'subject__name', 'meeting_id']
    date_hierarchy = 'scheduled_date'
    ordering = ['-scheduled_date', '-start_time']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'subject', 'teacher')
        }),
        ('Schedule', {
            'fields': ('scheduled_date', 'start_time', 'end_time', 'timezone')
        }),
        ('Meeting Details', {
            'fields': ('platform', 'meeting_link', 'meeting_id', 'passcode')
        }),
        ('Settings', {
            'fields': ('max_participants', 'is_recorded', 'recording_url')
        }),
        ('Content', {
            'fields': ('agenda', 'materials')
        }),
        ('Notifications', {
            'fields': ('reminder_sent', 'notification_time')
        }),
        ('Status', {
            'fields': ('status',)
        }),
    )
    
    actions = ['mark_as_live', 'mark_as_ended', 'mark_as_cancelled']
    
    def mark_as_live(self, request, queryset):
        queryset.update(status='live')
        self.message_user(request, f"{queryset.count()} classes marked as live.")
    mark_as_live.short_description = "Mark selected classes as live"
    
    def mark_as_ended(self, request, queryset):
        queryset.update(status='ended')
        self.message_user(request, f"{queryset.count()} classes marked as ended.")
    mark_as_ended.short_description = "Mark selected classes as ended"
    
    def mark_as_cancelled(self, request, queryset):
        queryset.update(status='cancelled')
        self.message_user(request, f"{queryset.count()} classes marked as cancelled.")
    mark_as_cancelled.short_description = "Mark selected classes as cancelled"


class ClassParticipantInline(admin.TabularInline):
    model = ClassParticipant
    extra = 0
    readonly_fields = ['joined_at', 'left_at']


@admin.register(ClassRecording)
class ClassRecordingAdmin(admin.ModelAdmin):
    list_display = ['live_class', 'title', 'recording_type', 'duration_minutes', 'file_size_mb', 'view_count', 'is_public']
    list_filter = ['recording_type', 'is_public', 'created_at', 'live_class__subject']
    search_fields = ['title', 'description', 'live_class__title', 'live_class__subject__name']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Recording Details', {
            'fields': ('live_class', 'title', 'description', 'recording_type')
        }),
        ('File Information', {
            'fields': ('file_url', 'file_size', 'duration_seconds')
        }),
        ('Timing', {
            'fields': ('start_time', 'end_time', 'chapters')
        }),
        ('Access Control', {
            'fields': ('is_public', 'password_protected', 'access_password')
        }),
        ('Statistics', {
            'fields': ('view_count', 'download_count'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['view_count', 'download_count']
    
    def file_size_mb(self, obj):
        if obj.file_size:
            return f"{obj.file_size / (1024 * 1024):.2f} MB"
        return "N/A"
    file_size_mb.short_description = "File Size (MB)"
    
    def duration_minutes(self, obj):
        if obj.duration_seconds:
            return f"{obj.duration_seconds // 60}:{obj.duration_seconds % 60:02d}"
        return "N/A"
    duration_minutes.short_description = "Duration"


@admin.register(ClassParticipant)
class ClassParticipantAdmin(admin.ModelAdmin):
    list_display = ['live_class', 'get_participant_name', 'role', 'joined_at', 'left_at', 'duration_minutes', 'is_present']
    list_filter = ['role', 'is_present', 'joined_at', 'live_class__subject']
    search_fields = ['live_class__title', 'student__user__username', 'student__student_id', 'teacher__name', 'guest_name']
    date_hierarchy = 'joined_at'
    ordering = ['-joined_at']
    
    fieldsets = (
        ('Attendance Details', {
            'fields': ('live_class', 'student', 'teacher', 'guest_name', 'guest_email', 'role', 'is_present')
        }),
        ('Timing', {
            'fields': ('joined_at', 'left_at', 'duration_minutes')
        }),
        ('Interaction', {
            'fields': ('questions_asked', 'chat_messages')
        }),
    )
    
    readonly_fields = ['joined_at', 'left_at', 'duration_minutes']
    
    def get_participant_name(self, obj):
        if obj.student:
            return obj.student.fullNameEnglish
        elif obj.teacher:
            return obj.teacher.name
        else:
            return obj.guest_name or "Unknown"
    get_participant_name.short_description = "Participant"
    
    def duration_minutes(self, obj):
        if obj.joined_at and obj.left_at:
            duration = obj.left_at - obj.joined_at
            return f"{duration.total_seconds() / 60:.1f} min"
        return "N/A"
    duration_minutes.short_description = "Duration (minutes)"