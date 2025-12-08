"""
Admin configuration for Attendance app
"""
from django.contrib import admin
from .models import AttendanceRecord


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ['student', 'subject_name', 'date', 'is_present', 'recorded_by', 'recorded_at']
    list_filter = ['is_present', 'semester', 'date', 'subject_code']
    search_fields = ['student__fullNameEnglish', 'student__rollNumber', 'subject_name', 'subject_code']
    readonly_fields = ['id', 'recorded_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student', 'semester')
        }),
        ('Subject Information', {
            'fields': ('subject_code', 'subject_name')
        }),
        ('Attendance Information', {
            'fields': ('date', 'is_present', 'notes')
        }),
        ('Recording Information', {
            'fields': ('recorded_by', 'recorded_at')
        }),
    )
