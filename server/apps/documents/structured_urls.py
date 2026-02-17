"""
URL patterns for structured document storage API
"""
from django.urls import path
from .structured_views import (
    StructuredStudentDocumentUploadView,
    BulkStudentDocumentUploadView,
    StudentDocumentListView,
    StudentDocumentDetailView,
    DocumentStorageStatsView,
    DocumentMigrationStatusView,
)

app_name = 'structured_documents'

urlpatterns = [
    # Student document management
    path(
        'student/upload/',
        StructuredStudentDocumentUploadView.as_view(),
        name='student-document-upload'
    ),
    path(
        'student/bulk-upload/',
        BulkStudentDocumentUploadView.as_view(),
        name='student-document-bulk-upload'
    ),
    path(
        'student/<uuid:student_id>/',
        StudentDocumentListView.as_view(),
        name='student-document-list'
    ),
    path(
        'student/<uuid:student_id>/<str:category>/',
        StudentDocumentDetailView.as_view(),
        name='student-document-detail'
    ),
    
    # Storage management
    path(
        'stats/',
        DocumentStorageStatsView.as_view(),
        name='storage-stats'
    ),
    path(
        'migration-status/',
        DocumentMigrationStatusView.as_view(),
        name='migration-status'
    ),
]
