"""
Admin configuration for Activity Logs app
"""
from django.contrib import admin
from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user', 'action_type', 'entity_type', 'entity_id', 'ip_address']
    list_filter = ['action_type', 'entity_type', 'timestamp']
    search_fields = ['user__username', 'entity_type', 'entity_id', 'description']
    readonly_fields = ['id', 'timestamp', 'user', 'action_type', 'entity_type', 'entity_id', 
                       'description', 'changes', 'ip_address', 'user_agent']
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        # Prevent manual creation of logs
        return False
    
    def has_change_permission(self, request, obj=None):
        # Prevent editing of logs
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Allow deletion for cleanup
        return True
