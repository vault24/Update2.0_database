"""
Department Admin Configuration
"""
from django.contrib import admin
from .models import Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """
    Admin interface for Department model
    """
    list_display = ['name', 'code', 'student_count', 'createdAt', 'updatedAt']
    search_fields = ['name', 'code']
    readonly_fields = ['id', 'createdAt', 'updatedAt']
    ordering = ['name']
    
    def student_count(self, obj):
        """Display student count in admin"""
        return obj.student_count()
    student_count.short_description = 'Students'
