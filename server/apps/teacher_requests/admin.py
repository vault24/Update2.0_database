"""
Teacher Request Admin Configuration
"""
from django.contrib import admin
from .models import TeacherSignupRequest, TeacherRequest


@admin.register(TeacherSignupRequest)
class TeacherSignupRequestAdmin(admin.ModelAdmin):
    """
    Admin interface for Teacher Signup Request model
    """
    list_display = [
        'full_name_english',
        'email',
        'designation',
        'department',
        'status',
        'submitted_at'
    ]
    list_filter = ['status', 'department', 'designation']
    search_fields = ['full_name_english', 'full_name_bangla', 'email', 'designation']
    ordering = ['-submitted_at']
    readonly_fields = ['submitted_at', 'reviewed_at', 'created_at', 'updated_at']


@admin.register(TeacherRequest)
class TeacherRequestAdmin(admin.ModelAdmin):
    """
    Admin interface for Teacher Contact Request model
    """
    list_display = ['student', 'teacher', 'subject', 'status', 'requestDate']
    list_filter = ['status', 'requestDate']
    search_fields = ['student__fullNameEnglish', 'teacher__fullNameEnglish', 'subject']
    ordering = ['-requestDate']
    readonly_fields = ['requestDate', 'createdAt', 'updatedAt']
