"""
Student Admin Configuration
"""
from django.contrib import admin
from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    """
    Admin interface for Student model
    """
    list_display = [
        'fullNameEnglish',
        'currentRollNumber',
        'semester',
        'department',
        'status',
        'createdAt'
    ]
    list_filter = ['status', 'department', 'semester', 'shift', 'gender']
    search_fields = [
        'fullNameEnglish',
        'fullNameBangla',
        'currentRollNumber',
        'currentRegistrationNumber',
        'mobileStudent'
    ]
    ordering = ['-createdAt']
    readonly_fields = ['id', 'createdAt', 'updatedAt']
    
    fieldsets = (
        ('Personal Information', {
            'fields': (
                'fullNameBangla',
                'fullNameEnglish',
                'fatherName',
                'fatherNID',
                'motherName',
                'motherNID',
                'dateOfBirth',
                'birthCertificateNo',
                'nidNumber',
                'gender',
                'religion',
                'bloodGroup',
                'maritalStatus',
            )
        }),
        ('Contact Information', {
            'fields': (
                'mobileStudent',
                'guardianMobile',
                'email',
                'emergencyContact',
                'presentAddress',
                'permanentAddress',
            )
        }),
        ('Educational Background', {
            'fields': (
                'highestExam',
                'board',
                'group',
                'rollNumber',
                'registrationNumber',
                'passingYear',
                'gpa',
                'institutionName',
            )
        }),
        ('Current Academic Information', {
            'fields': (
                'currentRollNumber',
                'currentRegistrationNumber',
                'semester',
                'department',
                'session',
                'shift',
                'currentGroup',
                'status',
                'enrollmentDate',
            )
        }),
        ('Academic Records', {
            'fields': (
                'semesterResults',
                'semesterAttendance',
            )
        }),
        ('Discontinued Information', {
            'fields': (
                'discontinuedReason',
                'lastSemester',
            )
        }),
        ('Media', {
            'fields': (
                'profilePhoto',
            )
        }),
        ('System Information', {
            'fields': (
                'id',
                'createdAt',
                'updatedAt',
            )
        }),
    )
