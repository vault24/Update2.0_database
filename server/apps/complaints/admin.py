"""
Complaints Admin Configuration
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    ComplaintCategory, ComplaintSubcategory, Complaint, ComplaintUpdate,
    ComplaintComment, ComplaintEscalation, ComplaintTemplate, ComplaintAnalytics
)


@admin.register(ComplaintCategory)
class ComplaintCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    ordering = ['name']
    
    fieldsets = (
        ('Category Information', {
            'fields': ('name', 'description')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )


@admin.register(ComplaintSubcategory)
class ComplaintSubcategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_active', 'sort_order']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'description', 'category__name']
    ordering = ['category', 'sort_order', 'name']
    
    fieldsets = (
        ('Subcategory Information', {
            'fields': ('category', 'name', 'description')
        }),
        ('Settings', {
            'fields': ('is_active', 'sort_order')
        }),
    )


class ComplaintUpdateInline(admin.TabularInline):
    model = ComplaintUpdate
    extra = 0
    readonly_fields = ['created_at']
    fields = ['update_type', 'description', 'created_at']


class ComplaintCommentInline(admin.TabularInline):
    model = ComplaintComment
    extra = 0
    readonly_fields = ['created_at', 'author_name']
    fields = ['content', 'comment_type', 'author_name', 'created_at']


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'title', 'student_info', 'category', 'subcategory', 'status', 'priority', 'created_at', 'is_anonymous']
    list_filter = ['status', 'priority', 'is_anonymous', 'created_at', 'category', 'subcategory']
    search_fields = ['title', 'description', 'reference_number', 'student__user__username', 'student__student_id']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    inlines = [ComplaintUpdateInline, ComplaintCommentInline]
    
    fieldsets = (
        ('Complaint Details', {
            'fields': ('title', 'description', 'category', 'subcategory', 'reference_number')
        }),
        ('Reporter Information', {
            'fields': ('student', 'teacher', 'is_anonymous', 'reporter_name', 'reporter_email')
        }),
        ('Classification', {
            'fields': ('priority', 'status', 'assigned_to', 'department')
        }),
        ('Response & Resolution', {
            'fields': ('response', 'resolution_notes', 'responded_by', 'responded_at', 'resolved_at')
        }),
        ('Feedback', {
            'fields': ('satisfaction_rating', 'feedback_comment'),
            'classes': ('collapse',)
        }),
        ('Attachments', {
            'fields': ('attachments',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['reference_number', 'responded_at', 'resolved_at']
    
    actions = ['mark_as_seen', 'mark_as_in_progress', 'mark_as_resolved']
    
    def student_info(self, obj):
        if obj.is_anonymous:
            return format_html('<em>Anonymous</em>')
        if obj.student:
            return f"{obj.student.user.get_full_name()} ({obj.student.student_id})"
        elif obj.teacher:
            return f"{obj.teacher.name} (Teacher)"
        return "Unknown"
    student_info.short_description = "Reporter"
    
    def mark_as_seen(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status='pending').update(
            status='seen',
            responded_at=timezone.now(),
            responded_by=request.user.teacher if hasattr(request.user, 'teacher') else None
        )
        self.message_user(request, f"{updated} complaints marked as seen.")
    mark_as_seen.short_description = "Mark selected complaints as seen"
    
    def mark_as_in_progress(self, request, queryset):
        updated = queryset.exclude(status__in=['resolved', 'closed']).update(status='in_progress')
        self.message_user(request, f"{updated} complaints marked as in progress.")
    mark_as_in_progress.short_description = "Mark selected complaints as in progress"
    
    def mark_as_resolved(self, request, queryset):
        updated = queryset.exclude(status__in=['resolved', 'closed']).update(status='resolved')
        self.message_user(request, f"{updated} complaints marked as resolved.")
    mark_as_resolved.short_description = "Mark selected complaints as resolved"


@admin.register(ComplaintUpdate)
class ComplaintUpdateAdmin(admin.ModelAdmin):
    list_display = ['complaint', 'update_type', 'description_preview', 'updated_by_info', 'created_at']
    list_filter = ['update_type', 'created_at']
    search_fields = ['complaint__title', 'complaint__reference_number', 'description']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    def description_preview(self, obj):
        return obj.description[:100] + "..." if len(obj.description) > 100 else obj.description
    description_preview.short_description = "Description"
    
    def updated_by_info(self, obj):
        if obj.updated_by_student:
            return f"{obj.updated_by_student.fullNameEnglish} (Student)"
        elif obj.updated_by_teacher:
            return f"{obj.updated_by_teacher.name} (Teacher)"
        elif obj.updated_by_admin:
            return "System Admin"
        return "Unknown"
    updated_by_info.short_description = "Updated By"


@admin.register(ComplaintComment)
class ComplaintCommentAdmin(admin.ModelAdmin):
    list_display = ['complaint', 'author_name', 'comment_type', 'content_preview', 'created_at']
    list_filter = ['comment_type', 'is_visible_to_reporter', 'created_at']
    search_fields = ['complaint__title', 'complaint__reference_number', 'content', 'author_name']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    def content_preview(self, obj):
        return obj.content[:100] + "..." if len(obj.content) > 100 else obj.content
    content_preview.short_description = "Content"


@admin.register(ComplaintTemplate)
class ComplaintTemplateAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'subcategory', 'usage_count', 'is_active', 'created_by']
    list_filter = ['category', 'subcategory', 'is_active', 'created_at']
    search_fields = ['title', 'content']
    ordering = ['-usage_count', 'title']
    
    fieldsets = (
        ('Template Information', {
            'fields': ('title', 'content', 'category', 'subcategory')
        }),
        ('Settings', {
            'fields': ('is_active', 'created_by')
        }),
        ('Statistics', {
            'fields': ('usage_count',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['usage_count']
