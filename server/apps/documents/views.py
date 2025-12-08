"""
Document Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.http import FileResponse, Http404
import os

from .models import Document
from .serializers import DocumentSerializer, DocumentUploadSerializer
from utils.file_handler import save_uploaded_file


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing documents
    
    Provides CRUD operations for student documents with file upload handling
    """
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['student', 'category']
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
        Download document file
        
        GET /api/documents/{id}/download/
        
        Returns the file as a downloadable attachment
        """
        document = self.get_object()
        
        # Construct full path to file
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        full_path = os.path.join(base_dir, '..', 'client', 'assets', 'images', document.filePath)
        full_path = os.path.normpath(full_path)
        
        # Check if file exists
        if not os.path.exists(full_path):
            raise Http404("File not found on server")
        
        # Return file as response
        try:
            response = FileResponse(
                open(full_path, 'rb'),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="{document.fileName}"'
            return response
        except Exception as e:
            return Response(
                {
                    'error': 'Failed to download file',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
