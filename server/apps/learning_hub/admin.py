"""
Learning Hub Admin Configuration
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Subject, ClassActivity, Assignment, AssignmentSubmission,
    StudyMaterial, MaterialAccess
)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'department', 'semester', 'teacher', 'is_active']
    list_filter = ['department', 'semester', 'is_active']
    search_fields = ['code', 'name', 'description']
    ordering = ['department', 'semester', 'code']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'description')
        }),
        ('Academic Details', {
            'fields': ('department', 'semester', 'teacher', 'color')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )


@admin.register(ClassActivity)
class ClassActivityAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'activity_type', 'scheduled_date', 'start_time', 'status']
    list_filter = ['activity_type', 'status', 'scheduled_date', 'subject__department']
    search_fields = ['title', 'description', 'subject__name']
    date_hierarchy = 'scheduled_date'
    ordering = ['-scheduled_date', '-start_time']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'subject')
        }),
        ('Schedule', {
            'fields': ('scheduled_date', 'start_time', 'end_time')
        }),
        ('Details', {
            'fields': ('activity_type', 'location', 'topics_covered', 'materials')
        }),
        ('Status', {
            'fields': ('status', 'notes')
        }),
        ('Attendance', {
            'fields': ('attendance_taken', 'total_students', 'present_students'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'assigned_date', 'deadline', 'priority', 'status', 'is_active']
    list_filter = ['priority', 'status', 'is_active', 'assigned_date', 'subject__department']
    search_fields = ['title', 'description', 'subject__name']
    date_hierarchy = 'deadline'
    ordering = ['-deadline']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'subject')
        }),
        ('Schedule', {
            'fields': ('deadline',)
        }),
        ('Details', {
            'fields': ('priority', 'max_marks', 'weightage', 'instructions')
        }),
        ('Files', {
            'fields': ('attachments',)
        }),
        ('Status', {
            'fields': ('status', 'is_active')
        }),
    )


class AssignmentSubmissionInline(admin.TabularInline):
    model = AssignmentSubmission
    extra = 0
    readonly_fields = ['submitted_at', 'is_late']


@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ['assignment', 'student', 'submitted_at', 'is_late', 'status', 'marks_obtained']
    list_filter = ['status', 'is_late', 'submitted_at', 'assignment__subject']
    search_fields = ['assignment__title', 'student__user__username', 'student__student_id']
    date_hierarchy = 'submitted_at'
    ordering = ['-submitted_at']
    
    fieldsets = (
        ('Submission Details', {
            'fields': ('assignment', 'student', 'submission_text')
        }),
        ('Files', {
            'fields': ('attachments',)
        }),
        ('Grading', {
            'fields': ('marks_obtained', 'grade', 'feedback', 'graded_by', 'graded_at')
        }),
        ('Status', {
            'fields': ('status', 'submitted_at', 'is_late')
        }),
    )
    
    readonly_fields = ['submitted_at', 'is_late']


@admin.register(StudyMaterial)
class StudyMaterialAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'material_type', 'upload_date', 'access_count', 'is_public']
    list_filter = ['material_type', 'is_public', 'upload_date', 'subject__department']
    search_fields = ['title', 'description', 'tags', 'subject__name']
    date_hierarchy = 'upload_date'
    ordering = ['-upload_date']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'subject')
        }),
        ('Content', {
            'fields': ('material_type', 'file_path', 'file_size', 'duration', 'tags')
        }),
        ('Organization', {
            'fields': ('department', 'semester', 'shift', 'uploaded_by')
        }),
        ('Access Control', {
            'fields': ('is_public', 'allowed_semesters')
        }),
        ('Statistics', {
            'fields': ('access_count', 'last_accessed'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['access_count', 'last_accessed']


@admin.register(MaterialAccess)
class MaterialAccessAdmin(admin.ModelAdmin):
    list_display = ['material', 'student', 'accessed_at']
    list_filter = ['accessed_at', 'material__subject', 'material__material_type']
    search_fields = ['material__title', 'student__user__username', 'student__student_id']
    date_hierarchy = 'accessed_at'
    ordering = ['-accessed_at']
    
    readonly_fields = ['accessed_at']