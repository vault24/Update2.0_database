"""
Enhanced Document Views with Filesystem Storage
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from django.http import FileResponse, Http404
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
import os
import logging

from .models import Document, DocumentAccessLog
from .serializers import (
    DocumentSerializer, 
    DocumentUploadSerializer,
    BatchDocumentUploadSerializer,
    DocumentAccessLogSerializer,
    DocumentIntegritySerializer
)
from utils.file_storage import file_storage

logger = logging.getLogger(__name__)


class DocumentViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for managing documents with filesystem storage
    
    Provides CRUD operations with enhanced security, validation, and file management
    """
    queryset = Document.objects.filter(status='active')
    permission_classes = [AllowAny]
    serializer_class = DocumentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['student', 'category', 'source_type', 'status', 'is_public']
    ordering_fields = ['uploadDate', 'fileName', 'fileSize', 'lastModified']
    ordering = ['-uploadDate']
    search_fields = ['fileName', 'description', 'tags']
    
    def create(self, request, *args, **kwargs):
        """
        Enhanced document upload with filesystem storage
        
        POST /api/documents/
        """
        upload_serializer = DocumentUploadSerializer(data=request.data)
        
        if not upload_serializer.is_valid():
            return Response(
                upload_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        validated_data = upload_serializer.validated_data
        
        try:
            with transaction.atomic():
                # Save file using enhanced storage service
                file_info = file_storage.save_file(
                    uploaded_file=validated_data['file'],
                    category='documents',
                    subfolder=validated_data.get('category', '').lower(),
                    custom_name=validated_data.get('custom_filename'),
                    validate=True
                )
                
                # Create document record with enhanced fields
                document = Document.objects.create(
                    student_id=validated_data.get('student'),
                    fileName=file_info['file_name'],
                    fileType=file_info['file_type'],
                    category=validated_data['category'],
                    filePath=file_info['file_path'],
                    fileSize=file_info['file_size'],
                    fileHash=file_info['file_hash'],
                    mimeType=file_info['mime_type'],
                    source_type=validated_data.get('source_type', 'manual'),
                    source_id=validated_data.get('source_id'),
                    original_field_name=validated_data.get('original_field_name', ''),
                    description=validated_data.get('description', ''),
                    tags=validated_data.get('tags', []),
                    is_public=validated_data.get('is_public', False),
                    status='active'
                )
                
                # Log the upload
                self._log_document_access(
                    document=document,
                    user=request.user if request.user.is_authenticated else None,
                    access_type='upload',
                    request=request,
                    success=True
                )
                
                serializer = DocumentSerializer(document)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except ValidationError as e:
            return Response(
                {'error': 'Validation failed', 'details': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Document upload failed: {str(e)}")
            return Response(
                {'error': 'Upload failed', 'details': 'An unexpected error occurred'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Enhanced document deletion with file cleanup
        
        DELETE /api/documents/{id}/
        """
        document = self.get_object()
        
        try:
            with transaction.atomic():
                # Log the deletion attempt
                self._log_document_access(
                    document=document,
                    user=request.user if request.user.is_authenticated else None,
                    access_type='delete',
                    request=request,
                    success=True
                )
                
                # Mark as deleted instead of hard delete (for audit trail)
                document.status = 'deleted'
                document.save()
                
                # Delete physical file
                file_deleted = file_storage.delete_file(document.filePath)
                
                if not file_deleted:
                    logger.warning(f"Physical file not found during deletion: {document.filePath}")
                
                return Response(
                    {
                        'message': 'Document deleted successfully',
                        'file_deleted': file_deleted
                    },
                    status=status.HTTP_200_OK
                )
                
        except Exception as e:
            logger.error(f"Document deletion failed: {str(e)}")
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='delete',
                request=request,
                success=False,
                error_message=str(e)
            )
            return Response(
                {'error': 'Deletion failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Enhanced document download with access control and logging
        
        GET /api/documents/{id}/download/
        """
        document = self.get_object()
        
        # Access control validation
        if not self._check_download_permission(request.user, document):
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='download',
                request=request,
                success=False,
                error_message='Permission denied'
            )
            return Response(
                {'error': 'Permission denied', 'details': 'You do not have permission to download this document'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get file information
        file_info = file_storage.get_file_info(document.filePath)
        
        if not file_info or not file_info.get('exists'):
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='download',
                request=request,
                success=False,
                error_message='File not found'
            )
            return Response(
                {
                    'error': 'File not found',
                    'details': f'Document file "{document.fileName}" not found on server',
                    'document_id': str(document.id)
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not file_info.get('readable'):
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='download',
                request=request,
                success=False,
                error_message='File not accessible'
            )
            return Response(
                {'error': 'File not accessible', 'details': 'Cannot read file from storage'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            # Open file and create response
            file_handle = open(file_info['storage_path'], 'rb')
            response = FileResponse(
                file_handle,
                content_type=file_info['mime_type'],
                as_attachment=True,
                filename=document.fileName
            )
            
            # Add security and metadata headers
            response['Content-Length'] = str(file_info['file_size'])
            response['X-Document-ID'] = str(document.id)
            response['X-Document-Category'] = document.category
            response['X-Document-Hash'] = document.fileHash or ''
            response['Cache-Control'] = 'private, no-cache'
            response['X-Content-Type-Options'] = 'nosniff'
            
            # Log successful download
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='download',
                request=request,
                success=True
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Document download failed: {str(e)}")
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='download',
                request=request,
                success=False,
                error_message=str(e)
            )
            return Response(
                {'error': 'Download failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """
        Enhanced document preview for viewing in browser
        
        GET /api/documents/{id}/preview/
        """
        document = self.get_object()
        
        # Access control validation
        if not self._check_download_permission(request.user, document):
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='preview',
                request=request,
                success=False,
                error_message='Permission denied'
            )
            return Response(
                {'error': 'Permission denied', 'details': 'You do not have permission to preview this document'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get file information
        file_info = file_storage.get_file_info(document.filePath)
        
        if not file_info or not file_info.get('exists'):
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='preview',
                request=request,
                success=False,
                error_message='File not found'
            )
            return Response(
                {
                    'error': 'File not found',
                    'details': f'Document file "{document.fileName}" not found on server',
                    'document_id': str(document.id)
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not file_info.get('readable'):
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='preview',
                request=request,
                success=False,
                error_message='File not accessible'
            )
            return Response(
                {'error': 'File not accessible', 'details': 'Cannot read file from storage'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            # Open file and create response for inline viewing
            file_handle = open(file_info['storage_path'], 'rb')
            response = FileResponse(
                file_handle,
                content_type=file_info['mime_type'],
                as_attachment=False,  # This allows inline viewing
                filename=document.fileName
            )
            
            # Add headers for inline viewing
            response['Content-Length'] = str(file_info['file_size'])
            response['X-Document-ID'] = str(document.id)
            response['X-Document-Category'] = document.category
            response['X-Document-Hash'] = document.fileHash or ''
            response['Cache-Control'] = 'private, max-age=3600'  # 1 hour cache
            response['X-Content-Type-Options'] = 'nosniff'
            
            # For PDFs, ensure they display inline
            if document.is_pdf:
                response['Content-Disposition'] = f'inline; filename="{document.fileName}"'
            
            # Log successful preview
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='preview',
                request=request,
                success=True
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Document preview failed: {str(e)}")
            self._log_document_access(
                document=document,
                user=request.user if request.user.is_authenticated else None,
                access_type='preview',
                request=request,
                success=False,
                error_message=str(e)
            )
            return Response(
                {'error': 'Preview failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def integrity_check(self, request, pk=None):
        """
        Enhanced integrity check with detailed analysis
        
        GET /api/documents/{id}/integrity-check/
        """
        document = self.get_object()
        
        # Access control
        if not self._check_download_permission(request.user, document):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get file information
        file_info = file_storage.get_file_info(document.filePath)
        
        # Verify integrity
        integrity_valid, integrity_message = document.verify_integrity()
        
        integrity_status = {
            'document_id': str(document.id),
            'file_name': document.fileName,
            'file_path': document.filePath,
            'expected_size': document.fileSize,
            'expected_hash': document.fileHash,
            'exists': file_info.get('exists', False) if file_info else False,
            'accessible': file_info.get('readable', False) if file_info else False,
            'actual_size': file_info.get('file_size') if file_info else None,
            'size_match': False,
            'hash_match': integrity_valid,
            'status': 'unknown',
            'errors': [],
            'warnings': []
        }
        
        if file_info and file_info.get('exists'):
            # Check size match
            if file_info.get('file_size') == document.fileSize:
                integrity_status['size_match'] = True
            else:
                integrity_status['errors'].append(
                    f"Size mismatch: expected {document.fileSize} bytes, found {file_info.get('file_size', 0)} bytes"
                )
        else:
            integrity_status['errors'].append("File does not exist in storage")
        
        # Determine overall status
        if not integrity_status['exists']:
            integrity_status['status'] = 'missing'
        elif not integrity_status['accessible']:
            integrity_status['status'] = 'inaccessible'
        elif not integrity_status['size_match']:
            integrity_status['status'] = 'size_mismatch'
        elif not integrity_status['hash_match']:
            integrity_status['status'] = 'hash_mismatch'
        elif integrity_status['errors']:
            integrity_status['status'] = 'error'
        elif integrity_status['warnings']:
            integrity_status['status'] = 'warning'
        else:
            integrity_status['status'] = 'healthy'
        
        # Add integrity message
        integrity_status['integrity_message'] = integrity_message
        
        # Set appropriate HTTP status
        if integrity_status['status'] in ['missing', 'inaccessible', 'hash_mismatch']:
            response_status = status.HTTP_422_UNPROCESSABLE_ENTITY
        elif integrity_status['status'] in ['size_mismatch', 'warning']:
            response_status = status.HTTP_200_OK
        else:
            response_status = status.HTTP_200_OK
        
        return Response(integrity_status, status=response_status)
    
    @action(detail=False, methods=['post'], url_path='batch-upload')
    def batch_upload(self, request):
        """
        Enhanced batch document upload
        
        POST /api/documents/batch-upload/
        """
        serializer = BatchDocumentUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        student_id = validated_data.get('student')
        source_type = validated_data.get('source_type', 'manual')
        source_id = validated_data.get('source_id')
        documents_data = validated_data['documents']
        
        created_documents = []
        errors = []
        
        try:
            with transaction.atomic():
                for i, doc_data in enumerate(documents_data):
                    try:
                        # Save file using enhanced storage
                        file_info = file_storage.save_file(
                            uploaded_file=doc_data['file'],
                            category='documents',
                            subfolder=doc_data['category'].lower(),
                            validate=True
                        )
                        
                        # Create document record
                        document = Document.objects.create(
                            student_id=student_id,
                            fileName=file_info['file_name'],
                            fileType=file_info['file_type'],
                            category=doc_data['category'],
                            filePath=file_info['file_path'],
                            fileSize=file_info['file_size'],
                            fileHash=file_info['file_hash'],
                            mimeType=file_info['mime_type'],
                            source_type=source_type,
                            source_id=source_id,
                            original_field_name=doc_data.get('original_field_name', ''),
                            description=doc_data.get('description', ''),
                            tags=doc_data.get('tags', []),
                            is_public=doc_data.get('is_public', False),
                            metadata=doc_data.get('metadata', {}),
                            status='active'
                        )
                        
                        created_documents.append(document)
                        
                        # Log upload
                        self._log_document_access(
                            document=document,
                            user=request.user if request.user.is_authenticated else None,
                            access_type='upload',
                            request=request,
                            success=True
                        )
                        
                    except Exception as e:
                        errors.append(f"Document {i+1} ({doc_data['file'].name}): {str(e)}")
                        logger.error(f"Batch upload error for document {i+1}: {str(e)}")
        
        except Exception as e:
            logger.error(f"Batch upload transaction failed: {str(e)}")
            return Response(
                {'error': 'Batch upload failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Prepare response
        if errors and not created_documents:
            return Response(
                {'error': 'All uploads failed', 'error_details': errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif errors:
            response_data = {
                'success': len(created_documents),
                'errors': len(errors),
                'error_details': errors,
                'created_documents': DocumentSerializer(created_documents, many=True).data
            }
            return Response(response_data, status=status.HTTP_207_MULTI_STATUS)
        else:
            response_data = {
                'success': len(created_documents),
                'message': f'Successfully uploaded {len(created_documents)} documents',
                'documents': DocumentSerializer(created_documents, many=True).data
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], url_path='storage-stats')
    def storage_stats(self, request):
        """
        Get storage statistics
        
        GET /api/documents/storage-stats/
        """
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get file storage stats
        storage_stats = file_storage.get_storage_stats()
        
        # Get database stats
        db_stats = {
            'total_documents': Document.objects.count(),
            'active_documents': Document.objects.filter(status='active').count(),
            'deleted_documents': Document.objects.filter(status='deleted').count(),
            'corrupted_documents': Document.objects.filter(status='corrupted').count(),
        }
        
        # Combine stats
        combined_stats = {
            'storage': storage_stats,
            'database': db_stats,
            'timestamp': timezone.now()
        }
        
        return Response(combined_stats)
    
    @action(detail=False, methods=['get'], url_path='my-documents')
    def my_documents(self, request):
        """
        Get documents for the current student
        
        GET /api/documents/my-documents/?student={student_id}
        """
        student_id = request.query_params.get('student')
        category = request.query_params.get('category')
        
        if not student_id:
            return Response(
                {'error': 'Student ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permission - students can only access their own documents
        if request.user.is_authenticated:
            if request.user.is_staff or getattr(request.user, 'role', None) == 'admin':
                # Admins can access any student's documents
                pass
            elif getattr(request.user, 'role', None) == 'student':
                # Students can only access their own documents
                if hasattr(request.user, 'related_profile_id') and str(request.user.related_profile_id) != str(student_id):
                    return Response(
                        {'error': 'Permission denied'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            # Build query
            queryset = Document.objects.filter(
                student_id=student_id,
                status='active'
            )
            
            if category:
                queryset = queryset.filter(category=category)
            
            # Order by upload date (newest first)
            queryset = queryset.order_by('-uploadDate')
            
            # Serialize documents
            serializer = DocumentSerializer(queryset, many=True)
            
            return Response({
                'count': queryset.count(),
                'documents': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error fetching student documents: {str(e)}")
            return Response(
                {'error': 'Failed to fetch documents', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='cleanup-orphaned')
    def cleanup_orphaned(self, request):
        """
        Clean up orphaned files not referenced in database
        
        POST /api/documents/cleanup-orphaned/
        """
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all valid file paths from database
        valid_paths = list(
            Document.objects.filter(status='active')
            .values_list('filePath', flat=True)
        )
        
        # Cleanup orphaned files
        cleanup_stats = file_storage.cleanup_orphaned_files(valid_paths)
        
        return Response({
            'message': 'Cleanup completed',
            'stats': cleanup_stats
        })
    
    def _check_download_permission(self, user, document):
        """
        Enhanced permission checking for document access
        """
        # Public documents can be accessed by anyone
        if document.is_public:
            return True
        
        # Admins can access any document
        if user and user.is_authenticated and (user.is_staff or getattr(user, 'role', None) == 'admin'):
            return True
        
        # Students can access their own documents
        if user and user.is_authenticated and getattr(user, 'role', None) == 'student':
            if hasattr(user, 'related_profile_id') and user.related_profile_id:
                return str(document.student_id) == str(user.related_profile_id)
            
            # Check admission documents
            if document.source_type == 'admission' and document.source_id:
                from apps.admissions.models import Admission
                try:
                    admission = Admission.objects.get(id=document.source_id)
                    return admission.user == user
                except Admission.DoesNotExist:
                    pass
        
        return False
    
    def _log_document_access(self, document, user, access_type, request, success=True, error_message=''):
        """
        Log document access for audit purposes
        """
        try:
            # Get client IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            
            # Get user agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            DocumentAccessLog.objects.create(
                document=document,
                user=user,
                access_type=access_type,
                ip_address=ip_address,
                user_agent=user_agent,
                success=success,
                error_message=error_message
            )
        except Exception as e:
            logger.error(f"Failed to log document access: {str(e)}")


class DocumentAccessLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing document access logs (admin only)
    """
    queryset = DocumentAccessLog.objects.all()
    serializer_class = DocumentAccessLogSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['document', 'user', 'access_type', 'success']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Filter logs based on user permissions"""
        if not self.request.user.is_staff:
            return DocumentAccessLog.objects.none()
        return super().get_queryset()
