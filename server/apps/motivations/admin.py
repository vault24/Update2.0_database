from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import MotivationMessage, MotivationView, MotivationLike, MotivationSettings


@admin.register(MotivationMessage)
class MotivationMessageAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'category', 'primary_language', 'priority', 
        'is_active', 'is_featured', 'view_count', 'like_count', 
        'created_at', 'status_indicator'
    ]
    list_filter = [
        'category', 'primary_language', 'is_active', 'is_featured', 
        'priority', 'created_at', 'updated_at'
    ]
    search_fields = ['title', 'message', 'author', 'title_bn', 'message_bn', 'author_bn']
    readonly_fields = ['view_count', 'like_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'message', 'author', 'category', 'priority')
        }),
        ('Bengali Translation', {
            'fields': ('title_bn', 'message_bn', 'author_bn'),
            'classes': ('collapse',)
        }),
        ('Arabic Translation', {
            'fields': ('title_ar', 'message_ar', 'author_ar'),
            'classes': ('collapse',)
        }),
        ('Reference Information', {
            'fields': ('reference_source', 'reference_url', 'reference_date', 'reference_context'),
            'classes': ('collapse',)
        }),
        ('Display Settings', {
            'fields': ('primary_language', 'display_duration', 'is_active', 'is_featured')
        }),
        ('Scheduling', {
            'fields': ('start_date', 'end_date'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('view_count', 'like_count'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def status_indicator(self, obj):
        if obj.effective_active_status:
            return format_html('<span style="color: green;">●</span> Active')
        elif obj.is_active and not obj.is_scheduled_active:
            return format_html('<span style="color: orange;">●</span> Scheduled')
        else:
            return format_html('<span style="color: red;">●</span> Inactive')
    status_indicator.short_description = 'Status'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
    
    actions = ['make_active', 'make_inactive', 'make_featured', 'remove_featured']
    
    def make_active(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, f"{queryset.count()} messages marked as active.")
    make_active.short_description = "Mark selected messages as active"
    
    def make_inactive(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f"{queryset.count()} messages marked as inactive.")
    make_inactive.short_description = "Mark selected messages as inactive"
    
    def make_featured(self, request, queryset):
        queryset.update(is_featured=True)
        self.message_user(request, f"{queryset.count()} messages marked as featured.")
    make_featured.short_description = "Mark selected messages as featured"
    
    def remove_featured(self, request, queryset):
        queryset.update(is_featured=False)
        self.message_user(request, f"{queryset.count()} messages removed from featured.")
    remove_featured.short_description = "Remove featured status from selected messages"


@admin.register(MotivationView)
class MotivationViewAdmin(admin.ModelAdmin):
    list_display = ['message', 'user', 'ip_address', 'language_requested', 'viewed_at']
    list_filter = ['language_requested', 'viewed_at', 'message__category']
    search_fields = ['message__title', 'user__username', 'ip_address']
    readonly_fields = ['viewed_at']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(MotivationLike)
class MotivationLikeAdmin(admin.ModelAdmin):
    list_display = ['message', 'user', 'created_at']
    list_filter = ['created_at', 'message__category']
    search_fields = ['message__title', 'user__username']
    readonly_fields = ['created_at']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(MotivationSettings)
class MotivationSettingsAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'default_language', 'auto_rotate', 'enable_multilingual', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Display Settings', {
            'fields': ('default_display_duration', 'auto_rotate', 'rotation_interval')
        }),
        ('Language Settings', {
            'fields': ('default_language', 'enable_multilingual')
        }),
        ('Feature Settings', {
            'fields': ('enable_likes', 'enable_analytics', 'enable_scheduling')
        }),
        ('Content Settings', {
            'fields': ('max_messages_per_day', 'prioritize_featured')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
    
    def has_add_permission(self, request):
        return not MotivationSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False