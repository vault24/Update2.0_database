"""
Secure file serving views
"""
from django.http import FileResponse, Http404, HttpResponse
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.http import etag
from django.core.exceptions import PermissionDenied
from utils.file_storage import file_storage
from .models import Document, DocumentAccessLog
import os
import hashlib
import logging

logger = logging.getLogger(__name__)


class SecureFileView(View):
    """
    Secure file serving with access control and logging
    """
    
    def get(self, request, file_path):
        """
        Serve file with security checks
        
        URL: /files/{file_path}
        """
        # Security: Prevent path traversal
        if '..' in file_path or file_path.startswith('/'):
            logger.warning(f"Path traversal attempt: {file_path} from {request.META.get('REMOTE_ADDR')}")
            raise Http404("File not found")
        
        # Get file info from storage
        file_info = file_storage.get_file_info(file_path)
        if not file_info or not file_info.get('exists'):
            raise Http404("File not found")
        
        # Find associated document for access control
        try:
            document = Document.objects.get(filePath=file_path, status='active')
        except Document.DoesNotExist:
            # File exists but no document record - only allow admin access
            if not request.user.is_authenticated or not request.user.is_staff:
                raise PermissionDenied("Access denied")
            document = None
        
        # Check permissions
        if document and not self._check_access_permission(request.user, document):
            self._log_access_attempt(document, request.user, request, False, "Permission denied")
            raise PermissionDenied("Access denied")
        
        # Log access attempt
        if document:
            self._log_access_attempt(document, request.user, request, True)
        
        # Serve file
        try:
            response = FileResponse(
                open(file_info['storage_path'], 'rb'),
                content_type=file_info['mime_type'],
                filename=os.path.basename(file_path)
            )
            
            # Add security headers
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
            response['Cache-Control'] = 'private, max-age=3600'  # 1 hour cache
            
            # Add ETag for caching
            if document and document.fileHash:
                response['ETag'] = f'"{document.fileHash[:16]}"'
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to serve file {file_path}: {str(e)}")
            if document:
                self._log_access_attempt(document, request.user, request, False, str(e))
            raise Http404("File not found")
    
    def _check_access_permission(self, user, document):
        """Check if user can access the document"""
        # Public documents
        if document.is_public:
            return True
        
        # Authenticated users
        if not user.is_authenticated:
            return False
        
        # Admin access
        if user.is_staff or getattr(user, 'role', None) == 'admin':
            return True
        
        # Student access to own documents
        if getattr(user, 'role', None) == 'student':
            if hasattr(user, 'related_profile_id') and user.related_profile_id:
                return str(document.student_id) == str(user.related_profile_id)
        
        return False
    
    def _log_access_attempt(self, document, user, request, success, error_message=''):
        """Log file access attempt"""
        try:
            # Get client IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            
            DocumentAccessLog.objects.create(
                document=document,
                user=user if user.is_authenticated else None,
                access_type='view',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=success,
                error_message=error_message
            )
        except Exception as e:
            logger.error(f"Failed to log access attempt: {str(e)}")


class DocumentThumbnailView(View):
    """
    Generate and serve document thumbnails
    """
    
    def get(self, request, document_id):
        """
        Generate thumbnail for document
        
        URL: /files/thumbnail/{document_id}/
        """
        try:
            document = Document.objects.get(id=document_id, status='active')
        except Document.DoesNotExist:
            raise Http404("Document not found")
        
        # Check permissions
        if not self._check_access_permission(request.user, document):
            raise PermissionDenied("Access denied")
        
        # Only generate thumbnails for images and PDFs
        if not (document.is_image or document.is_pdf):
            raise Http404("Thumbnail not available for this file type")
        
        # For now, return a placeholder response
        # In a full implementation, you would generate actual thumbnails
        return HttpResponse(
            "Thumbnail generation not implemented yet",
            content_type="text/plain"
        )
    
    def _check_access_permission(self, user, document):
        """Check if user can access the document"""
        # Same logic as SecureFileView
        if document.is_public:
            return True
        
        if not user.is_authenticated:
            return False
        
        if user.is_staff or getattr(user, 'role', None) == 'admin':
            return True
        
        if getattr(user, 'role', None) == 'student':
            if hasattr(user, 'related_profile_id') and user.related_profile_id:
                return str(document.student_id) == str(user.related_profile_id)
        
        return False