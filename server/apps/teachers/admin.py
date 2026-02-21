"""
Teacher Admin Configuration
"""
from django.contrib import admin
from .models import (
    Teacher,
    TeacherExperience,
    TeacherEducation,
    TeacherPublication,
    TeacherResearch,
    TeacherAward
)


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ['fullNameEnglish', 'designation', 'department', 'employmentStatus', 'email']
    list_filter = ['employmentStatus', 'department', 'designation']
    search_fields = ['fullNameEnglish', 'fullNameBangla', 'email']
    ordering = ['fullNameEnglish']


@admin.register(TeacherExperience)
class TeacherExperienceAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'title', 'institution', 'startDate', 'current']
    list_filter = ['current', 'teacher']
    search_fields = ['title', 'institution', 'teacher__fullNameEnglish']
    ordering = ['teacher', 'order']


@admin.register(TeacherEducation)
class TeacherEducationAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'degree', 'institution', 'year']
    list_filter = ['teacher']
    search_fields = ['degree', 'institution', 'teacher__fullNameEnglish']
    ordering = ['teacher', 'order']


@admin.register(TeacherPublication)
class TeacherPublicationAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'title', 'journal', 'year', 'citations']
    list_filter = ['teacher', 'year']
    search_fields = ['title', 'journal', 'teacher__fullNameEnglish']
    ordering = ['teacher', 'order']


@admin.register(TeacherResearch)
class TeacherResearchAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'title', 'status', 'year']
    list_filter = ['status', 'teacher']
    search_fields = ['title', 'teacher__fullNameEnglish']
    ordering = ['teacher', 'order']


@admin.register(TeacherAward)
class TeacherAwardAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'title', 'issuer', 'year']
    list_filter = ['teacher', 'year']
    search_fields = ['title', 'issuer', 'teacher__fullNameEnglish']
    ordering = ['teacher', 'order']
