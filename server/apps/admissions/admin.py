"""
Admissions Admin
"""
from django.contrib import admin
from .models import Admission


@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):
    """
    Admin interface for Admission model
    """
    list_display = [
        'full_name_english',
        'email',
        'desired_department',
        'desired_shift',
        'session',
        'status',
        'gpa',
        'submitted_at'
    ]
    list_filter = [
        'status',
        'desired_department',
        'desired_shift',
        'session',
        'gender'
    ]
    search_fields = [
        'full_name_english',
        'full_name_bangla',
        'email',
        'mobile_student',
        'father_name',
        'mother_name'
    ]
    ordering = ['-submitted_at']
    readonly_fields = ['submitted_at', 'reviewed_at', 'created_at', 'updated_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Personal Information', {
            'fields': (
                'full_name_bangla',
                'full_name_english',
                'father_name',
                'father_nid',
                'mother_name',
                'mother_nid',
                'date_of_birth',
                'birth_certificate_no',
                'gender',
                'religion',
                'blood_group'
            )
        }),
        ('Contact Information', {
            'fields': (
                'mobile_student',
                'guardian_mobile',
                'email',
                'emergency_contact',
                'present_address',
                'permanent_address'
            )
        }),
        ('Educational Background', {
            'fields': (
                'highest_exam',
                'board',
                'group',
                'roll_number',
                'registration_number',
                'passing_year',
                'gpa',
                'institution_name'
            )
        }),
        ('Admission Details', {
            'fields': (
                'desired_department',
                'desired_shift',
                'session',
                'documents'
            )
        }),
        ('Review Information', {
            'fields': (
                'status',
                'submitted_at',
                'reviewed_at',
                'reviewed_by',
                'review_notes'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
