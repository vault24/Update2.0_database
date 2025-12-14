from django.contrib import admin
from django.utils.html import format_html
from .models import Notice, NoticeReadStatus


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = [
        'title', 
        'priority', 
        'is_published', 
        'created_by', 
        'created_at', 
        'read_count_display',
        'engagement_display'
    ]
    list_filter = ['priority', 'is_published', 'created_at', 'created_by']
    search_fields = ['title', 'content']
    readonly_fields = ['created_at', 'updated_at', 'read_count_display', 'engagement_display']
    fieldsets = (
        ('Notice Information', {
            'fields': ('title', 'content', 'priority', 'is_published')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Engagement Metrics', {
            'fields': ('read_count_display', 'engagement_display'),
            'classes': ('collapse',)
        }),
    )
    
    def read_count_display(self, obj):
        """Display read count with total students"""
        return f"{obj.read_count} / {obj.total_students}"
    read_count_display.short_description = "Read Count"
    
    def engagement_display(self, obj):
        """Display engagement percentage with color coding"""
        percentage = obj.read_percentage
        if percentage >= 70:
            color = 'green'
        elif percentage >= 40:
            color = 'orange'
        else:
            color = 'red'
        
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color,
            percentage
        )
    engagement_display.short_description = "Engagement"
    
    def save_model(self, request, obj, form, change):
        """Set the created_by field to the current user if creating a new notice"""
        if not change:  # Only set on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(NoticeReadStatus)
class NoticeReadStatusAdmin(admin.ModelAdmin):
    list_display = ['notice', 'student', 'read_at']
    list_filter = ['read_at', 'notice__priority']
    search_fields = ['notice__title', 'student__username', 'student__email']
    readonly_fields = ['read_at', 'created_at']
    
    def has_add_permission(self, request):
        """Disable manual creation of read status records"""
        return False