"""
Teacher Admin Configuration
"""
from django.contrib import admin
from .models import Teacher


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ['fullNameEnglish', 'designation', 'department', 'employmentStatus', 'email']
    list_filter = ['employmentStatus', 'department', 'designation']
    search_fields = ['fullNameEnglish', 'fullNameBangla', 'email']
    ordering = ['fullNameEnglish']
