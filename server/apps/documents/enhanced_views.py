"""
Enhanced Document Views - Additional endpoints for improved functionality
Add these to the DocumentViewSet in views.py
"""
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count
from .search import DocumentSearch
from utils.duplicate_detector import duplicate_detector


# Add these methods to DocumentViewSet class

@action(detail=False, methods=['get'], url_path='search')
def search_documents(self, request):
    """
    Search documents with filters
    
    GET /api/documents/search/?q=query&student=uuid&type=student&year=2024
    """
    query = request.query_params.get('q', '')
    filters = {
        'student_id': request.query_params.get('student'),
        'document_type': request.query_params.get('type'),
        'category': request.query_params.get('category'),
        'year': request.query_params.get('year'),
        'department_code': request.query_params.get('dept'),
        'session': request.query_params.get('session'),
    }
    # Remove None values
    filters = {k: v for k, v in filters.items() if v}
    
    results = DocumentSearch.search(query, filters)
    
    # Limit results
    limit = int(request.query_params.get('limit', 100))
    results = results[:limit]
    
    from .serializers import DocumentSerializer
    serializer = DocumentSerializer(results, many=True)
    
    return Response({
        'count': results.count(),
        'query': query,
        'filters': filters,
        'results': serializer.data
    })


@action(detail=False, methods=['get'], url_path='stats')
def get_stats(self, request):
    """
    Get storage statistics
    
    GET /api/documents/stats/
    """
    from .models import Document
    
    stats = {
        'total_documents': Document.objects.filter(status='active').count(),
        'total_size_bytes': (
            Document.objects.filter(status='active').aggregate(
                total=Sum('fileSize')
            )['total'] or 0
        ),
        'by_type': list(
            Document.objects.filter(status='active').values('document_type').annotate(
                count=Count('id'),
                size_bytes=Sum('fileSize')
            )
        ),
        'by_year': list(
            Document.objects.filter(status='active').values('year').annotate(
                count=Count('id'),
                size_bytes=Sum('fileSize')
            ).order_by('-year')
        ),
        'by_category': list(
            Document.objects.filter(status='active').values('document_category').annotate(
                count=Count('id')
            ).order_by('-count')[:10]
        ),
    }
    
    # Add calculated fields
    stats['total_size_mb'] = round(stats['total_size_bytes'] / (1024 * 1024), 2)
    stats['total_size_gb'] = round(stats['total_size_bytes'] / (1024 * 1024 * 1024), 2)
    
    # Add duplicate stats
    try:
        dup_stats = duplicate_detector.get_duplicate_stats()
        stats['duplicates'] = dup_stats
    except Exception as e:
        stats['duplicates'] = {'error': str(e)}
    
    return Response(stats)


@action(detail=False, methods=['post'], url_path='check-duplicate')
def check_duplicate(self, request):
    """
    Check if file is duplicate before uploading
    
    POST /api/documents/check-duplicate/
    Body: {
        "file": <file>,
        "student_id": "uuid" (optional)
    }
    """
    if 'file' not in request.FILES:
        return Response(
            {'error': 'File is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    file_obj = request.FILES['file']
    student_id = request.data.get('student_id')
    
    result = duplicate_detector.check_before_upload(file_obj, student_id)
    
    if result['is_duplicate']:
        from .serializers import DocumentSerializer
        serializer = DocumentSerializer(result['existing_document'])
        return Response({
            'is_duplicate': True,
            'message': result['message'],
            'existing_document': serializer.data
        })
    
    return Response({
        'is_duplicate': False,
        'message': 'File is unique',
        'file_hash': result['file_hash']
    })


@action(detail=False, methods=['get'], url_path='recent')
def get_recent(self, request):
    """
    Get recently uploaded documents
    
    GET /api/documents/recent/?limit=50&type=student
    """
    limit = int(request.query_params.get('limit', 50))
    document_type = request.query_params.get('type')
    
    results = DocumentSearch.get_recent_documents(limit, document_type)
    
    from .serializers import DocumentSerializer
    serializer = DocumentSerializer(results, many=True)
    
    return Response({
        'count': len(serializer.data),
        'documents': serializer.data
    })


@action(detail=False, methods=['get'], url_path='by-year')
def get_by_year(self, request):
    """
    Get documents by year
    
    GET /api/documents/by-year/?year=2024
    """
    year = request.query_params.get('year')
    if not year:
        return Response(
            {'error': 'Year parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        year = int(year)
    except ValueError:
        return Response(
            {'error': 'Invalid year format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    results = DocumentSearch.search_by_year(year)
    
    from .serializers import DocumentSerializer
    serializer = DocumentSerializer(results[:100], many=True)
    
    return Response({
        'year': year,
        'count': results.count(),
        'documents': serializer.data
    })
