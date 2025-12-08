"""
Alumni Admin Configuration
"""
from django.contrib import admin
from .models import Alumni


@admin.register(Alumni)
class AlumniAdmin(admin.ModelAdmin):
    """
    Admin interface for Alumni model
    """
    list_display = [
        'get_student_name',
        'alumniType',
        'graduationYear',
        'currentSupportCategory',
        'transitionDate',
    ]
    list_filter = ['alumniType', 'currentSupportCategory', 'graduationYear']
    search_fields = [
        'student__fullNameEnglish',
        'student__fullNameBangla',
        'student__currentRollNumber',
    ]
    ordering = ['-transitionDate']
    readonly_fields = ['student', 'transitionDate', 'createdAt', 'updatedAt']
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student',)
        }),
        ('Alumni Information', {
            'fields': (
                'alumniType',
                'transitionDate',
                'graduationYear',
            )
        }),
        ('Support Tracking', {
            'fields': (
                'currentSupportCategory',
                'supportHistory',
            )
        }),
        ('Career Information', {
            'fields': (
                'currentPosition',
                'careerHistory',
            )
        }),
        ('System Information', {
            'fields': (
                'createdAt',
                'updatedAt',
            )
        }),
    )
    
    def get_student_name(self, obj):
        """Get student's English name"""
        return obj.student.fullNameEnglish
    get_student_name.short_description = 'Student Name'
    get_student_name.admin_order_field = 'student__fullNameEnglish'
