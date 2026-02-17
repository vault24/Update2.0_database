"""
API views for structured document storage
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Document
from .structured_serializers import (
    StructuredStudentDocumentUploadSerializer,
    StructuredStudentDocumentSerializer,
    BulkStudentDocumentUploadSerializer,
    StudentDocumentListSerializer,
    DocumentStorageStatsSerializer,
)
from apps.students.models import Student
from utils.structured_file_storage import structured_storage
import logging

logger = logging.getLogger(__name__)


class StructuredStudentDocumentUploadView(APIView):
    """
    Upload student document with structured storage
    
    POST /api/documents/structured/student/upload/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Upload a single student document"""
        serializer = StructuredStudentDocumentUploadSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    document = serializer.save()
                
                response_serializer = StructuredStudentDocumentSerializer(document)
                return Response(
                    {
                        'success': True,
                        'message': 'Document uploaded successfully',
                        'document': response_serializer.data
                    },
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                logger.error(f"Failed to upload document: {str(e)}")
                return Response(
                    {
                        'success': False,
                        'message': f'Failed to upload document: {str(e)}'
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            {
                'success': False,
                'message': 'Validation failed',
                'errors': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class BulkStudentDocumentUploadView(APIView):
    """
    Upload multiple student documents at once
    
    POST /api/documents/structured/student/bulk-upload/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Upload multiple documents for a student"""
        serializer = BulkStudentDocumentUploadSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                result = serializer.save()
                
                # Serialize created documents
                created_docs = StructuredStudentDocumentSerializer(
                    result['created'], many=True
                ).data
                
                return Response(
                    {
                        'success': True,
                        'message': f"Uploaded {result['success_count']} of {result['total']} documents",
                        'documents': created_docs,
                        'errors': result['errors'],
                        'stats': {
                            'total': result['total'],
                            'success': result['success_count'],
                            'failed': result['error_count'],
                        }
                    },
                    status=status.HTTP_201_CREATED if result['success_count'] > 0 else status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Failed to upload documents: {str(e)}")
                return Response(
                    {
                        'success': False,
                        'message': f'Failed to upload documents: {str(e)}'
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            {
                'success': False,
                'message': 'Validation failed',
                'errors': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class StudentDocumentListView(APIView):
    """
    List all documents for a student
    
    GET /api/documents/structured/student/{student_id}/
    GET /api/documents/structured/student/{student_id}/?category=photo
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, student_id):
        """Get all documents for a student, optionally filtered by category"""
        try:
            student = Student.objects.select_related('department').get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {
                    'success': False,
                    'message': 'Student not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get category filter
        category = request.query_params.get('category', 'all')
        
        # Query documents
        documents = Document.objects.filter(
            student=student,
            status='active'
        ).order_by('-uploadDate')
        
        # Filter by category if specified
        if category != 'all':
            documents = documents.filter(document_category=category)
        
        # Serialize
        serializer = StructuredStudentDocumentSerializer(documents, many=True)
        
        # Group by category
        grouped_documents = {}
        for doc in serializer.data:
            cat = doc['document_category']
            if cat not in grouped_documents:
                grouped_documents[cat] = []
            grouped_documents[cat].append(doc)
        
        return Response(
            {
                'success': True,
                'student': {
                    'id': str(student.id),
                    'name': student.fullNameEnglish,
                    'roll': student.currentRollNumber,
                    'department': student.department.name,
                    'session': student.session,
                    'shift': student.shift,
                },
                'documents': serializer.data,
                'grouped_documents': grouped_documents,
                'total_count': len(serializer.data),
            },
            status=status.HTTP_200_OK
        )


class StudentDocumentDetailView(APIView):
    """
    Get, update, or delete a specific student document
    
    GET /api/documents/structured/student/{student_id}/{category}/
    DELETE /api/documents/structured/student/{student_id}/{category}/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, student_id, category):
        """Get a specific document by category"""
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {
                    'success': False,
                    'message': 'Student not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get document
        try:
            document = Document.objects.get(
                student=student,
                document_category=category,
                status='active'
            )
        except Document.DoesNotExist:
            return Response(
                {
                    'success': False,
                    'message': f'Document not found for category: {category}'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except Document.MultipleObjectsReturned:
            # If multiple documents, return the most recent
            document = Document.objects.filter(
                student=student,
                document_category=category,
                status='active'
            ).order_by('-uploadDate').first()
        
        serializer = StructuredStudentDocumentSerializer(document)
        return Response(
            {
                'success': True,
                'document': serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    def delete(self, request, student_id, category):
        """Delete a specific document by category"""
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {
                    'success': False,
                    'message': 'Student not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get document
        try:
            document = Document.objects.get(
                student=student,
                document_category=category,
                status='active'
            )
        except Document.DoesNotExist:
            return Response(
                {
                    'success': False,
                    'message': f'Document not found for category: {category}'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            with transaction.atomic():
                # Delete physical file
                file_deleted = structured_storage.delete_file(document.filePath)
                
                if not file_deleted:
                    logger.warning(f"Physical file not found: {document.filePath}")
                
                # Mark document as deleted
                document.status = 'deleted'
                document.save()
            
            return Response(
                {
                    'success': True,
                    'message': 'Document deleted successfully'
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Failed to delete document: {str(e)}")
            return Response(
                {
                    'success': False,
                    'message': f'Failed to delete document: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DocumentStorageStatsView(APIView):
    """
    Get storage statistics
    
    GET /api/documents/structured/stats/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get storage statistics"""
        try:
            stats = structured_storage.get_storage_stats()
            serializer = DocumentStorageStatsSerializer(stats)
            
            # Add database stats
            db_stats = {
                'total_documents': Document.objects.filter(status='active').count(),
                'student_documents': Document.objects.filter(
                    document_type='student', status='active'
                ).count(),
                'teacher_documents': Document.objects.filter(
                    document_type='teacher', status='active'
                ).count(),
                'alumni_documents': Document.objects.filter(
                    document_type='alumni', status='active'
                ).count(),
            }
            
            return Response(
                {
                    'success': True,
                    'storage_stats': serializer.data,
                    'database_stats': db_stats,
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Failed to get storage stats: {str(e)}")
            return Response(
                {
                    'success': False,
                    'message': f'Failed to get storage stats: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DocumentMigrationStatusView(APIView):
    """
    Check migration status of documents
    
    GET /api/documents/structured/migration-status/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get migration status"""
        try:
            # Count documents by migration status
            total_docs = Document.objects.filter(status='active').count()
            migrated_docs = Document.objects.filter(
                status='active',
                filePath__startswith='Student_Documents/'
            ).count() + Document.objects.filter(
                status='active',
                filePath__startswith='Teacher_Documents/'
            ).count() + Document.objects.filter(
                status='active',
                filePath__startswith='Alumni_Documents/'
            ).count()
            
            not_migrated = total_docs - migrated_docs
            migration_percentage = (migrated_docs / total_docs * 100) if total_docs > 0 else 0
            
            return Response(
                {
                    'success': True,
                    'migration_status': {
                        'total_documents': total_docs,
                        'migrated': migrated_docs,
                        'not_migrated': not_migrated,
                        'migration_percentage': round(migration_percentage, 2),
                        'is_complete': not_migrated == 0,
                    }
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Failed to get migration status: {str(e)}")
            return Response(
                {
                    'success': False,
                    'message': f'Failed to get migration status: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
