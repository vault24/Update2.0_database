"""
Document Admin Configuration
"""
from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    """
    Admin interface for Document model
    """
    list_display = [
        'fileName',
        'category',
        'student',
        'fileType',
        'fileSize',
        'uploadDate'
    ]
    list_filter = ['category', 'fileType', 'uploadDate']
    search_fields = [
        'fileName',
        'student__fullNameEnglish',
        'student__currentRollNumber'
    ]
    readonly_fields = ['id', 'uploadDate', 'fileSize']
    
    fieldsets = (
        ('Document Information', {
            'fields': (
                'id',
                'student',
                'fileName',
                'fileType',
                'category'
            )
        }),
        ('File Details', {
            'fields': (
                'filePath',
                'fileSize',
                'uploadDate'
            )
        }),
    )
