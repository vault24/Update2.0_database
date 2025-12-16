"""
Document Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.http import FileResponse, Http404
import os

from .models import Document
from .serializers import (
    DocumentSerializer, 
    DocumentUploadSerializer,
    BatchDocumentUploadSerializer,
    AdmissionDocumentUploadSerializer
)
from utils.file_handler import save_uploaded_file


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing documents
    
    Provides CRUD operations for student documents with file upload handling
    """
    queryset = Document.objects.all()
    permission_classes = [AllowAny]
    serializer_class = DocumentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['student', 'category', 'source_type']
    ordering_fields = ['uploadDate', 'fileName']
    ordering = ['-uploadDate']
    
    def create(self, request, *args, **kwargs):
        """
        Handle document upload
        
        POST /api/documents/
        """
        upload_serializer = DocumentUploadSerializer(data=request.data)
        
        if upload_serializer.is_valid():
            student_id = upload_serializer.validated_data['student']
            category = upload_serializer.validated_data['category']
            file = upload_serializer.validated_data['file']
            
            # Save file to client/assets/images/documents/
            relative_path = save_uploaded_file(file, 'documents')
            
            # Get file extension
            file_extension = os.path.splitext(file.name)[1][1:]  # Remove the dot
            
            # Create document record
            document = Document.objects.create(
                student_id=student_id,
                fileName=file.name,
                fileType=file_extension,
                category=category,
                filePath=relative_path,
                fileSize=file.size
            )
            
            serializer = DocumentSerializer(document)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(
            upload_serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete document and remove physical file
        
        DELETE /api/documents/{id}/
        """
        document = self.get_object()
        
        # Get the file path
        file_path = document.filePath
        
        # Delete the database record first
        document.delete()
        
        # Try to delete the physical file
        try:
            # Construct full path to file
            # filePath is relative like "documents/filename.pdf"
            # We need to go up from server/ to client/assets/images/
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            full_path = os.path.join(base_dir, '..', 'client', 'assets', 'images', file_path)
            full_path = os.path.normpath(full_path)
            
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception as e:
            # Log the error but don't fail the request
            # The database record is already deleted
            print(f"Warning: Could not delete file {file_path}: {str(e)}")
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download document file with access control
        
        GET /api/documents/{id}/download/
        
        Returns the file as a downloadable attachment
        Access control:
        - Admins can download any document
        - Students can only download their own documents
        """
        document = self.get_object()
        
        # Access control validation
        if not self._check_download_permission(request.user, document):
            return Response(
                {
                    'error': 'Permission denied',
                    'details': 'You do not have permission to download this document'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Construct full path to file
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        full_path = os.path.join(base_dir, '..', 'client', 'assets', 'images', document.filePath)
        full_path = os.path.normpath(full_path)
        
        # Security check: ensure path is within allowed directory
        allowed_base = os.path.join(base_dir, '..', 'client', 'assets', 'images')
        allowed_base = os.path.normpath(allowed_base)
        
        if not full_path.startswith(allowed_base):
            return Response(
                {
                    'error': 'Security violation',
                    'details': 'Invalid file path'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if file exists
        if not os.path.exists(full_path):
            return Response(
                {
                    'error': 'File not found',
                    'details': f'Document file "{document.fileName}" not found on server',
                    'document_id': str(document.id),
                    'file_path': document.filePath
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check file integrity
        try:
            file_size = os.path.getsize(full_path)
            if file_size == 0:
                return Response(
                    {
                        'error': 'File corrupted',
                        'details': 'Document file is empty or corrupted',
                        'document_id': str(document.id)
                    },
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY
                )
        except OSError as e:
            return Response(
                {
                    'error': 'File access error',
                    'details': f'Cannot access file: {str(e)}',
                    'document_id': str(document.id)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Determine content type based on file extension
        content_type = self._get_content_type(document.fileType)
        
        # Return file as response
        try:
            file_handle = open(full_path, 'rb')
            response = FileResponse(
                file_handle,
                content_type=content_type,
                as_attachment=True,
                filename=document.fileName
            )
            
            # Add additional headers for better download experience
            response['Content-Length'] = str(file_size)
            response['X-Document-ID'] = str(document.id)
            response['X-Document-Category'] = document.category
            response['X-Document-Source'] = document.source_type or 'manual'
            
            return response
            
        except PermissionError:
            return Response(
                {
                    'error': 'File permission error',
                    'details': 'Server does not have permission to read the file',
                    'document_id': str(document.id)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {
                    'error': 'Download failed',
                    'details': f'Unexpected error during file download: {str(e)}',
                    'document_id': str(document.id)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _check_download_permission(self, user, document):
        """
        Check if user has permission to download the document
        
        Args:
            user: Request user
            document: Document instance
            
        Returns:
            bool: True if user can download, False otherwise
        """
        # Admins can download any document
        if user.is_staff or user.role == 'admin':
            return True
        
        # Students can only download their own documents
        if user.role == 'student':
            # Check if user is linked to the document's student
            if hasattr(user, 'related_profile_id') and user.related_profile_id:
                return str(document.student_id) == str(user.related_profile_id)
            
            # Fallback: check if user created an admission that links to this document
            if document.source_type == 'admission' and document.source_id:
                from apps.admissions.models import Admission
                try:
                    admission = Admission.objects.get(id=document.source_id)
                    return admission.user == user
                except Admission.DoesNotExist:
                    pass
        
        return False
    
    def _get_content_type(self, file_type):
        """
        Get appropriate content type for file download
        
        Args:
            file_type: File extension
            
        Returns:
            str: MIME content type
        """
        content_types = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
        }
        
        return content_types.get(file_type.lower(), 'application/octet-stream')
    
    @action(detail=True, methods=['get'], url_path='check-integrity')
    def check_integrity(self, request, pk=None):
        """
        Check file integrity and existence
        
        GET /api/documents/{id}/check-integrity/
        
        Returns file status information without downloading
        """
        document = self.get_object()
        
        # Access control validation
        if not self._check_download_permission(request.user, document):
            return Response(
                {
                    'error': 'Permission denied',
                    'details': 'You do not have permission to check this document'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Construct full path to file
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        full_path = os.path.join(base_dir, '..', 'client', 'assets', 'images', document.filePath)
        full_path = os.path.normpath(full_path)
        
        integrity_status = {
            'document_id': str(document.id),
            'file_name': document.fileName,
            'expected_size': document.fileSize,
            'file_path': document.filePath,
            'exists': False,
            'accessible': False,
            'size_match': False,
            'actual_size': None,
            'corrupted': False,
            'status': 'unknown',
            'errors': []
        }
        
        try:
            # Check if file exists
            if os.path.exists(full_path):
                integrity_status['exists'] = True
                
                try:
                    # Check if file is accessible
                    actual_size = os.path.getsize(full_path)
                    integrity_status['accessible'] = True
                    integrity_status['actual_size'] = actual_size
                    
                    # Check size match
                    if actual_size == document.fileSize:
                        integrity_status['size_match'] = True
                    else:
                        integrity_status['errors'].append(
                            f"Size mismatch: expected {document.fileSize} bytes, found {actual_size} bytes"
                        )
                    
                    # Check if file is corrupted (empty or unreadable)
                    if actual_size == 0:
                        integrity_status['corrupted'] = True
                        integrity_status['errors'].append("File is empty")
                    else:
                        # Try to read first few bytes to check readability
                        try:
                            with open(full_path, 'rb') as f:
                                f.read(1024)  # Read first 1KB
                        except Exception as read_error:
                            integrity_status['corrupted'] = True
                            integrity_status['errors'].append(f"File is not readable: {str(read_error)}")
                    
                except OSError as e:
                    integrity_status['errors'].append(f"Cannot access file: {str(e)}")
            else:
                integrity_status['errors'].append("File does not exist on server")
        
        except Exception as e:
            integrity_status['errors'].append(f"Integrity check failed: {str(e)}")
        
        # Determine overall status
        if not integrity_status['exists']:
            integrity_status['status'] = 'missing'
        elif integrity_status['corrupted']:
            integrity_status['status'] = 'corrupted'
        elif not integrity_status['accessible']:
            integrity_status['status'] = 'inaccessible'
        elif not integrity_status['size_match']:
            integrity_status['status'] = 'size_mismatch'
        elif integrity_status['errors']:
            integrity_status['status'] = 'warning'
        else:
            integrity_status['status'] = 'healthy'
        
        # Set appropriate HTTP status code
        if integrity_status['status'] in ['missing', 'corrupted', 'inaccessible']:
            status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        elif integrity_status['status'] in ['size_mismatch', 'warning']:
            status_code = status.HTTP_200_OK  # Warning but still accessible
        else:
            status_code = status.HTTP_200_OK
        
        return Response(integrity_status, status=status_code)
    
    @action(detail=False, methods=['post'], url_path='batch-integrity-check')
    def batch_integrity_check(self, request):
        """
        Check integrity of multiple documents
        
        POST /api/documents/batch-integrity-check/
        
        Request body:
        {
            "document_ids": ["uuid1", "uuid2", ...]
        }
        """
        document_ids = request.data.get('document_ids', [])
        
        if not document_ids:
            return Response(
                {
                    'error': 'No document IDs provided',
                    'details': 'Please provide a list of document IDs to check'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(document_ids) > 50:  # Limit batch size
            return Response(
                {
                    'error': 'Too many documents',
                    'details': 'Maximum 50 documents can be checked at once'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = []
        
        for doc_id in document_ids:
            try:
                document = Document.objects.get(id=doc_id)
                
                # Check permission
                if not self._check_download_permission(request.user, document):
                    results.append({
                        'document_id': str(doc_id),
                        'status': 'permission_denied',
                        'error': 'No permission to check this document'
                    })
                    continue
                
                # Use the single integrity check logic
                request.resolver_match.kwargs = {'pk': doc_id}
                integrity_response = self.check_integrity(request, pk=doc_id)
                results.append(integrity_response.data)
                
            except Document.DoesNotExist:
                results.append({
                    'document_id': str(doc_id),
                    'status': 'not_found',
                    'error': 'Document not found'
                })
            except Exception as e:
                results.append({
                    'document_id': str(doc_id),
                    'status': 'error',
                    'error': f'Integrity check failed: {str(e)}'
                })
        
        # Summary statistics
        summary = {
            'total_checked': len(results),
            'healthy': len([r for r in results if r.get('status') == 'healthy']),
            'missing': len([r for r in results if r.get('status') == 'missing']),
            'corrupted': len([r for r in results if r.get('status') == 'corrupted']),
            'warnings': len([r for r in results if r.get('status') in ['size_mismatch', 'warning']]),
            'errors': len([r for r in results if r.get('status') in ['error', 'permission_denied', 'not_found']])
        }
        
        return Response({
            'summary': summary,
            'results': results
        })
    
    @action(detail=False, methods=['get'])
    def my_documents(self, request):
        """
        Student-specific endpoint to view their own documents
        
        GET /api/documents/my-documents/?student={student_id}
        
        Query params:
        - student: Student UUID (required)
        - category: Filter by document category (optional)
        """
        student_id = request.query_params.get('student')
        
        if not student_id:
            return Response(
                {
                    'error': 'Student ID required',
                    'details': 'Please provide student query parameter'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter documents by student
        documents = Document.objects.filter(student_id=student_id)
        
        # Additional filter by category if provided
        category = request.query_params.get('category')
        if category:
            documents = documents.filter(category=category)
        
        # Order by upload date (newest first)
        documents = documents.order_by('-uploadDate')
        
        serializer = DocumentSerializer(documents, many=True)
        return Response({
            'count': documents.count(),
            'documents': serializer.data
        })
    
    @action(detail=False, methods=['post'], url_path='batch-upload')
    def batch_upload(self, request):
        """
        Batch document upload endpoint
        
        POST /api/documents/batch-upload/
        
        Request body:
        {
            "student": "uuid",  // Optional for admission documents
            "source_type": "manual|admission",
            "source_id": "uuid",  // Optional, for linking to admission
            "documents": [
                {
                    "file": <file>,
                    "category": "NID|Marksheet|etc",
                    "original_field_name": "photo",  // Optional
                    "metadata": {}  // Optional
                }
            ]
        }
        """
        serializer = BatchDocumentUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        validated_data = serializer.validated_data
        student_id = validated_data.get('student')
        source_type = validated_data.get('source_type', 'manual')
        source_id = validated_data.get('source_id')
        documents_data = validated_data['documents']
        
        created_documents = []
        errors = []
        
        # Process each document
        for i, doc_data in enumerate(documents_data):
            try:
                file_obj = doc_data['file']
                category = doc_data['category']
                original_field_name = doc_data.get('original_field_name', '')
                
                # Save file to filesystem
                relative_path = save_uploaded_file(file_obj, 'documents')
                
                # Get file extension
                file_extension = os.path.splitext(file_obj.name)[1][1:]  # Remove the dot
                
                # Create document record
                document = Document.objects.create(
                    student_id=student_id,
                    fileName=file_obj.name,
                    fileType=file_extension,
                    category=category,
                    filePath=relative_path,
                    fileSize=file_obj.size,
                    source_type=source_type,
                    source_id=source_id,
                    original_field_name=original_field_name
                )
                
                created_documents.append(document)
                
            except Exception as e:
                errors.append(f"Document {i+1}: {str(e)}")
        
        # Prepare response
        if errors:
            # If there were errors, return partial success
            response_data = {
                'success': len(created_documents),
                'errors': len(errors),
                'error_details': errors,
                'created_documents': DocumentSerializer(created_documents, many=True).data
            }
            return Response(response_data, status=status.HTTP_207_MULTI_STATUS)
        else:
            # All documents processed successfully
            response_data = {
                'success': len(created_documents),
                'message': f'Successfully uploaded {len(created_documents)} documents',
                'documents': DocumentSerializer(created_documents, many=True).data
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
