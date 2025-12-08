"""
Admin configuration for System Settings app
"""
from django.contrib import admin
from .models import SystemSettings


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ['current_academic_year', 'current_semester', 'maintenance_mode', 'updated_at']
    readonly_fields = ['id', 'updated_at', 'updated_by']
    
    fieldsets = (
        ('Academic Year Configuration', {
            'fields': ('current_academic_year', 'current_semester')
        }),
        ('Notification Preferences', {
            'fields': ('enable_email_notifications', 'enable_sms_notifications', 'admin_notification_email')
        }),
        ('Application Settings', {
            'fields': ('allow_student_registration', 'allow_teacher_registration', 'allow_admission_submission')
        }),
        ('Institute Information', {
            'fields': ('institute_name', 'institute_address', 'institute_phone', 'institute_email')
        }),
        ('Maintenance', {
            'fields': ('maintenance_mode', 'maintenance_message')
        }),
        ('Metadata', {
            'fields': ('updated_at', 'updated_by')
        }),
    )
    
    def has_add_permission(self, request):
        # Only allow one settings instance
        return not SystemSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of settings
        return False
