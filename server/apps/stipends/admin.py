"""
Stipend Admin
"""
from django.contrib import admin
from .models import StipendCriteria, StipendEligibility


@admin.register(StipendCriteria)
class StipendCriteriaAdmin(admin.ModelAdmin):
    list_display = ['name', 'minAttendance', 'minGpa', 'passRequirement', 'department', 'semester', 'isActive', 'createdAt']
    list_filter = ['isActive', 'department', 'semester', 'shift', 'passRequirement']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'createdAt', 'updatedAt']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'isActive')
        }),
        ('Eligibility Criteria', {
            'fields': ('minAttendance', 'minGpa', 'passRequirement')
        }),
        ('Filters', {
            'fields': ('department', 'semester', 'shift', 'session')
        }),
        ('Metadata', {
            'fields': ('id', 'createdBy', 'createdAt', 'updatedAt'),
            'classes': ('collapse',)
        }),
    )


@admin.register(StipendEligibility)
class StipendEligibilityAdmin(admin.ModelAdmin):
    list_display = ['student', 'criteria', 'gpa', 'attendance', 'rank', 'isEligible', 'isApproved', 'createdAt']
    list_filter = ['isEligible', 'isApproved', 'criteria']
    search_fields = ['student__fullNameEnglish', 'student__currentRollNumber']
    readonly_fields = ['id', 'createdAt', 'updatedAt']
    
    fieldsets = (
        ('Student & Criteria', {
            'fields': ('student', 'criteria')
        }),
        ('Academic Data', {
            'fields': ('attendance', 'gpa', 'cgpa', 'referredSubjects', 'totalSubjects', 'passedSubjects', 'rank')
        }),
        ('Status', {
            'fields': ('isEligible', 'isApproved', 'approvedBy', 'approvedAt')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('id', 'createdAt', 'updatedAt'),
            'classes': ('collapse',)
        }),
    )
