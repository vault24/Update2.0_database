from django.contrib import admin
from .models import Notification, NotificationPreference, NotificationPreferenceType, DeliveryLog


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient', 'notification_type', 'status', 'created_at')
    list_filter = ('notification_type', 'status', 'created_at')
    search_fields = ('title', 'message', 'recipient__username')
    readonly_fields = ('created_at', 'read_at', 'archived_at', 'deleted_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('recipient', 'notification_type', 'title', 'message', 'data')
        }),
        ('Status', {
            'fields': ('status', 'read_at', 'archived_at', 'deleted_at')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(NotificationPreferenceType)
class NotificationPreferenceTypeAdmin(admin.ModelAdmin):
    list_display = ('notification_type', 'preference', 'enabled', 'email_enabled')
    list_filter = ('notification_type', 'enabled', 'email_enabled')
    search_fields = ('preference__user__username',)


@admin.register(DeliveryLog)
class DeliveryLogAdmin(admin.ModelAdmin):
    list_display = ('notification', 'channel', 'status', 'retry_count', 'created_at')
    list_filter = ('channel', 'status', 'created_at')
    search_fields = ('notification__title', 'error_message')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Delivery Information', {
            'fields': ('notification', 'channel', 'status')
        }),
        ('Retry Information', {
            'fields': ('retry_count', 'error_message')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
