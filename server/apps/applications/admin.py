"""
Application Admin Configuration
"""
from django.contrib import admin
from .models import Application


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    """
    Admin interface for Application model
    """
    list_display = [
        'fullNameEnglish',
        'applicationType',
        'department',
        'status',
        'submittedAt',
        'reviewedBy'
    ]
    list_filter = ['status', 'applicationType', 'department', 'submittedAt']
    search_fields = [
        'fullNameEnglish',
        'fullNameBangla',
        'rollNumber',
        'registrationNumber',
        'email'
    ]
    readonly_fields = ['id', 'submittedAt']
    
    fieldsets = (
        ('Applicant Information', {
            'fields': (
                'fullNameBangla',
                'fullNameEnglish',
                'fatherName',
                'motherName',
                'email'
            )
        }),
        ('Academic Information', {
            'fields': (
                'department',
                'session',
                'shift',
                'rollNumber',
                'registrationNumber'
            )
        }),
        ('Application Details', {
            'fields': (
                'applicationType',
                'subject',
                'message'
            )
        }),
        ('Status and Review', {
            'fields': (
                'status',
                'submittedAt',
                'reviewedAt',
                'reviewedBy',
                'reviewNotes'
            )
        }),
    )
