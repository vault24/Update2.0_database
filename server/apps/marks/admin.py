"""
Admin configuration for Marks app
"""
from django.contrib import admin
from .models import MarksRecord


@admin.register(MarksRecord)
class MarksRecordAdmin(admin.ModelAdmin):
    list_display = ['student', 'subject_name', 'exam_type', 'marks_obtained', 'total_marks', 'percentage_display', 'recorded_by', 'recorded_at']
    list_filter = ['exam_type', 'semester', 'subject_code']
    search_fields = ['student__fullNameEnglish', 'student__rollNumber', 'subject_name', 'subject_code']
    readonly_fields = ['id', 'recorded_at', 'percentage_display']
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student', 'semester')
        }),
        ('Subject Information', {
            'fields': ('subject_code', 'subject_name')
        }),
        ('Exam Information', {
            'fields': ('exam_type', 'marks_obtained', 'total_marks', 'percentage_display')
        }),
        ('Recording Information', {
            'fields': ('recorded_by', 'recorded_at', 'remarks')
        }),
    )
    
    def percentage_display(self, obj):
        return f"{obj.percentage():.2f}%"
    percentage_display.short_description = 'Percentage'
