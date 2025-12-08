"""
Class Routine Admin
"""
from django.contrib import admin
from .models import ClassRoutine


@admin.register(ClassRoutine)
class ClassRoutineAdmin(admin.ModelAdmin):
    list_display = ['subject_name', 'department', 'semester', 'shift', 'day_of_week', 'start_time', 'end_time', 'teacher', 'is_active']
    list_filter = ['department', 'semester', 'shift', 'day_of_week', 'is_active']
    search_fields = ['subject_name', 'subject_code', 'room_number']
    ordering = ['day_of_week', 'start_time']
