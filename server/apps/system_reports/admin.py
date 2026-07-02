from django.contrib import admin

from .models import SystemReport


@admin.register(SystemReport)
class SystemReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'severity', 'status', 'occurrence_count', 'last_seen')
    list_filter = ('category', 'severity', 'status', 'source')
    search_fields = ('title', 'message', 'exception_type', 'path', 'user_display')
    readonly_fields = ('fingerprint', 'occurrence_count', 'first_seen', 'last_seen')
    date_hierarchy = 'last_seen'
