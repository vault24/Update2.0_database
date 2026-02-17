"""
Simple Document Search
Provides fast, simple search functionality without complex dependencies
"""
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)


class DocumentSearch:
    """Simple but effective document search"""
    
    @staticmethod
    def search(query, filters=None):
        """
        Search documents by filename, category, or content
        
        Args:
            query: Search query string
            filters: Optional dict with filters:
                - student_id: UUID
                - document_type: str
                - category: str
                - year: int
                - department_code: str
                - session: str
                
        Returns:
            QuerySet of matching documents
        """
        from apps.documents.models import Document
        
        queryset = Document.objects.filter(status='active')
        
        # Text search
        if query:
            query = query.strip().lower()
            queryset = queryset.filter(
                Q(fileName__icontains=query) |
                Q(document_category__icontains=query) |
                Q(search_text__icontains=query) |
                Q(owner_name__icontains=query) |
                Q(owner_id__icontains=query)
            )
        
        # Apply filters
        if filters:
            if 'student_id' in filters and filters['student_id']:
                queryset = queryset.filter(student_id=filters['student_id'])
            
            if 'document_type' in filters and filters['document_type']:
                queryset = queryset.filter(document_type=filters['document_type'])
            
            if 'category' in filters and filters['category']:
                queryset = queryset.filter(document_category=filters['category'])
            
            if 'year' in filters and filters['year']:
                queryset = queryset.filter(year=filters['year'])
            
            if 'department_code' in filters and filters['department_code']:
                queryset = queryset.filter(department_code=filters['department_code'])
            
            if 'session' in filters and filters['session']:
                queryset = queryset.filter(session=filters['session'])
        
        return queryset.select_related('student').order_by('-uploadDate')
    
    @staticmethod
    def search_student_documents(student_id, query=None):
        """
        Search within a student's documents
        
        Args:
            student_id: Student UUID
            query: Optional search query
            
        Returns:
            QuerySet of matching documents
        """
        filters = {'student_id': student_id}
        return DocumentSearch.search(query, filters)
    
    @staticmethod
    def search_by_category(category, query=None, filters=None):
        """
        Search documents by category
        
        Args:
            category: Document category
            query: Optional search query
            filters: Optional additional filters
            
        Returns:
            QuerySet of matching documents
        """
        if filters is None:
            filters = {}
        filters['category'] = category
        return DocumentSearch.search(query, filters)
    
    @staticmethod
    def search_by_year(year, query=None, filters=None):
        """
        Search documents by year
        
        Args:
            year: Year (int)
            query: Optional search query
            filters: Optional additional filters
            
        Returns:
            QuerySet of matching documents
        """
        if filters is None:
            filters = {}
        filters['year'] = year
        return DocumentSearch.search(query, filters)
    
    @staticmethod
    def get_recent_documents(limit=50, document_type=None):
        """
        Get recently uploaded documents
        
        Args:
            limit: Number of documents to return
            document_type: Optional document type filter
            
        Returns:
            QuerySet of recent documents
        """
        from apps.documents.models import Document
        
        queryset = Document.objects.filter(status='active')
        
        if document_type:
            queryset = queryset.filter(document_type=document_type)
        
        return queryset.select_related('student').order_by('-uploadDate')[:limit]
    
    @staticmethod
    def update_search_text(document):
        """
        Update search_text field for a document
        
        Args:
            document: Document instance
        """
        search_parts = [document.fileName]
        
        if document.description:
            search_parts.append(document.description)
        
        if document.tags:
            search_parts.extend(document.tags)
        
        if document.owner_name:
            search_parts.append(document.owner_name)
        
        if document.owner_id:
            search_parts.append(document.owner_id)
        
        document.search_text = ' '.join(search_parts).lower()
        document.save(update_fields=['search_text'])


# Global instance
document_search = DocumentSearch()
