"""
Admin configuration for Correction Requests app
"""
from django.contrib import admin
from .models import CorrectionRequest


@admin.register(CorrectionRequest)
class CorrectionRequestAdmin(admin.ModelAdmin):
    list_display = ['student', 'field_name', 'status', 'submitted_at', 'reviewed_by']
    list_filter = ['status', 'field_name', 'submitted_at']
    search_fields = ['student__fullNameEnglish', 'student__rollNumber', 'field_name']
    readonly_fields = ['id', 'submitted_at', 'reviewed_at']
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student',)
        }),
        ('Correction Details', {
            'fields': ('field_name', 'current_value', 'requested_value', 'reason', 'supporting_documents')
        }),
        ('Review Information', {
            'fields': ('status', 'reviewed_at', 'reviewed_by', 'review_notes')
        }),
        ('Timestamps', {
            'fields': ('submitted_at',)
        }),
    )
