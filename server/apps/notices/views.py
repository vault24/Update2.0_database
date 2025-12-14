from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Q, Case, When, IntegerField, Prefetch
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers

from .models import Notice, NoticeReadStatus
from .serializers import (
    NoticeSerializer,
    NoticeCreateUpdateSerializer,
    StudentNoticeSerializer,
    NoticeReadStatusSerializer,
    NoticeStatsSerializer,
    MarkAsReadSerializer
)

User = get_user_model()


class NoticesPagination(PageNumberPagination):
    """Custom pagination for notices"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50
    
    def get_paginated_response(self, data):
        """Enhanced pagination response with additional metadata"""
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'results': data
        })


class AdminNoticeListCreateView(generics.ListCreateAPIView):
    """
    Admin view for listing and creating notices
    GET: List all notices (admin only)
    POST: Create a new notice (admin only)
    """
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NoticesPagination
    
    def get_queryset(self):
        """Get all notices for admin users"""
        if not self.request.user.role in ['institute_head', 'registrar']:
            return Notice.objects.none()
        
        queryset = Notice.objects.select_related('created_by').prefetch_related('read_statuses')
        
        # Filter by publication status if specified
        is_published = self.request.query_params.get('is_published')
        if is_published is not None:
            queryset = queryset.filter(is_published=is_published.lower() == 'true')
        
        # Filter by priority if specified
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.request.method == 'POST':
            return NoticeCreateUpdateSerializer
        return NoticeSerializer
    
    def perform_create(self, serializer):
        """Set the created_by field to the current user and invalidate caches"""
        serializer.save(created_by=self.request.user)
        
        # Invalidate all user unread count caches when a new notice is created
        from django.core.cache.utils import make_template_fragment_key
        User = get_user_model()
        user_ids = User.objects.filter(role__in=['student', 'captain', 'teacher']).values_list('id', flat=True)
        for user_id in user_ids:
            cache_key = f'user_unread_count_{user_id}'
            cache.delete(cache_key)


class AdminNoticeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin view for retrieving, updating, and deleting specific notices
    GET: Retrieve a notice (admin only)
    PUT/PATCH: Update a notice (admin only)
    DELETE: Delete a notice (admin only)
    """
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get notices for admin users only"""
        if not self.request.user.role in ['institute_head', 'registrar']:
            return Notice.objects.none()
        return Notice.objects.select_related('created_by').prefetch_related('read_statuses')
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.request.method in ['PUT', 'PATCH']:
            return NoticeCreateUpdateSerializer
        return NoticeSerializer


@method_decorator(vary_on_headers('Authorization'), name='dispatch')
class StudentNoticeListView(generics.ListAPIView):
    """
    Student view for listing published notices
    GET: List published notices (students only)
    """
    serializer_class = StudentNoticeSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NoticesPagination
    
    def get_queryset(self):
        """Get published notices for authenticated users with optimized queries"""
        if not self.request.user.role in ['student', 'captain', 'teacher']:
            return Notice.objects.none()
        
        # Use select_related and prefetch_related for performance
        queryset = Notice.objects.filter(is_published=True).select_related('created_by')
        
        # Filter by priority if specified
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Filter by read status if specified
        read_status = self.request.query_params.get('read_status')
        if read_status == 'unread':
            # Get notices that the user hasn't read (optimized query)
            read_notice_ids = NoticeReadStatus.objects.filter(
                student=self.request.user
            ).values_list('notice_id', flat=True)
            queryset = queryset.exclude(id__in=read_notice_ids)
        elif read_status == 'read':
            # Get notices that the user has read (optimized query)
            read_notice_ids = NoticeReadStatus.objects.filter(
                student=self.request.user
            ).values_list('notice_id', flat=True)
            queryset = queryset.filter(id__in=read_notice_ids)
        
        # Order by priority (high=3, normal=2, low=1) then by creation date
        priority_order = Case(
            When(priority='high', then=3),
            When(priority='normal', then=2),
            When(priority='low', then=1),
            default=2,
            output_field=IntegerField()
        )
        
        return queryset.annotate(priority_order=priority_order).order_by('-priority_order', '-created_at')


class StudentNoticeDetailView(generics.RetrieveAPIView):
    """
    Student view for retrieving a specific notice
    GET: Retrieve a published notice (students only)
    """
    serializer_class = StudentNoticeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get published notices for authenticated users only"""
        if not self.request.user.role in ['student', 'captain', 'teacher']:
            return Notice.objects.none()
        return Notice.objects.filter(is_published=True).select_related('created_by')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_notice_as_read(request, notice_id):
    """
    Mark a notice as read for the current user
    POST: Mark notice as read (students, captains, teachers)
    """
    if request.user.role not in ['student', 'captain', 'teacher']:
        return Response(
            {'error': 'Only authenticated users can mark notices as read'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get the notice
    notice = get_object_or_404(Notice, id=notice_id, is_published=True)
    
    # Create or get the read status
    read_status, created = NoticeReadStatus.objects.get_or_create(
        notice=notice,
        student=request.user
    )
    
    # Invalidate cache for this user's unread count
    cache_key = f'user_unread_count_{request.user.id}'
    cache.delete(cache_key)
    
    return Response({
        'notice_id': notice_id,
        'is_read': True,
        'read_at': read_status.read_at,
        'already_read': not created
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def student_unread_count(request):
    """
    Get the count of unread notices for the current user
    GET: Get unread count (students, captains, teachers)
    """
    if request.user.role not in ['student', 'captain', 'teacher']:
        return Response(
            {'error': 'Only authenticated users can check unread count'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Use caching for unread count to improve performance
    cache_key = f'user_unread_count_{request.user.id}'
    cached_result = cache.get(cache_key)
    
    if cached_result is not None:
        return Response(cached_result)
    
    # Get all published notices
    total_notices = Notice.objects.filter(is_published=True).count()
    
    # Get read notices for this user
    read_count = NoticeReadStatus.objects.filter(student=request.user).count()
    
    unread_count = total_notices - read_count
    
    result = {
        'unread_count': max(0, unread_count),
        'total_notices': total_notices,
        'read_count': read_count
    }
    
    # Cache for 5 minutes
    cache.set(cache_key, result, 300)
    
    return Response(result)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def notice_stats(request):
    """
    Get engagement statistics for all notices
    GET: Get notice statistics (admin only)
    """
    if request.user.role not in ['institute_head', 'registrar']:
        return Response(
            {'error': 'Only admins can view notice statistics'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get total student count
    total_students = User.objects.filter(role='student').count()
    
    # Get notices with read counts
    notices = Notice.objects.annotate(
        read_count=Count('read_statuses'),
        unread_count=Case(
            When(read_statuses__isnull=True, then=total_students),
            default=total_students - Count('read_statuses'),
            output_field=IntegerField()
        )
    ).order_by('-created_at')
    
    stats_data = []
    for notice in notices:
        read_percentage = (notice.read_count / total_students * 100) if total_students > 0 else 0
        
        stats_data.append({
            'notice_id': notice.id,
            'title': notice.title,
            'priority': notice.priority,
            'created_at': notice.created_at,
            'is_published': notice.is_published,
            'read_count': notice.read_count,
            'total_students': total_students,
            'read_percentage': round(read_percentage, 1),
            'is_low_engagement': read_percentage < 30,
            'unread_count': max(0, total_students - notice.read_count)
        })
    
    # Paginate the results
    paginator = NoticesPagination()
    page = paginator.paginate_queryset(stats_data, request)
    
    if page is not None:
        serializer = NoticeStatsSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = NoticeStatsSerializer(stats_data, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def notice_detail_stats(request, notice_id):
    """
    Get detailed engagement statistics for a specific notice
    GET: Get detailed notice statistics (admin only)
    """
    if request.user.role not in ['institute_head', 'registrar']:
        return Response(
            {'error': 'Only admins can view notice statistics'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    notice = get_object_or_404(Notice, id=notice_id)
    total_students = User.objects.filter(role='student').count()
    read_count = notice.read_statuses.count()
    read_percentage = (read_count / total_students * 100) if total_students > 0 else 0
    
    # Get list of students who have read the notice
    read_students = NoticeReadStatus.objects.filter(notice=notice).select_related('student')
    
    return Response({
        'notice': NoticeSerializer(notice).data,
        'total_students': total_students,
        'read_count': read_count,
        'unread_count': max(0, total_students - read_count),
        'read_percentage': round(read_percentage, 1),
        'is_low_engagement': read_percentage < 30,
        'read_students': [
            {
                'id': rs.student.id,
                'name': rs.student.get_full_name(),
                'username': rs.student.username,
                'read_at': rs.read_at
            }
            for rs in read_students
        ]
    })


def invalidate_user_caches():
    """Helper function to invalidate all user unread count caches"""
    User = get_user_model()
    user_ids = User.objects.filter(role__in=['student', 'captain', 'teacher']).values_list('id', flat=True)
    for user_id in user_ids:
        cache_key = f'user_unread_count_{user_id}'
        cache.delete(cache_key)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def notice_engagement_summary(request):
    """
    Get overall engagement summary for all notices
    GET: Get engagement summary (admin only)
    """
    if request.user.role not in ['institute_head', 'registrar']:
        return Response(
            {'error': 'Only admins can view engagement summary'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        total_students = User.objects.filter(role='student').count()
        total_notices = Notice.objects.filter(is_published=True).count()
        
        if total_notices == 0:
            return Response({
                'total_notices': 0,
                'total_students': total_students,
                'average_engagement': 0,
                'high_engagement_notices': 0,
                'low_engagement_notices': 0,
                'unread_notices': 0
            })
        
        # Calculate engagement metrics
        notices_with_stats = Notice.objects.filter(is_published=True).annotate(
            read_count=Count('read_statuses')
        )
        
        total_reads = sum(notice.read_count for notice in notices_with_stats)
        possible_reads = total_notices * total_students
        average_engagement = (total_reads / possible_reads * 100) if possible_reads > 0 else 0
        
        high_engagement_count = 0
        low_engagement_count = 0
        
        for notice in notices_with_stats:
            engagement = (notice.read_count / total_students * 100) if total_students > 0 else 0
            if engagement >= 70:
                high_engagement_count += 1
            elif engagement < 30:
                low_engagement_count += 1
        
        return Response({
            'total_notices': total_notices,
            'total_students': total_students,
            'average_engagement': round(average_engagement, 1),
            'high_engagement_notices': high_engagement_count,
            'low_engagement_notices': low_engagement_count,
            'total_possible_reads': possible_reads,
            'total_actual_reads': total_reads
        })
        
    except Exception as e:
        return Response(
            {'error': 'Failed to calculate engagement summary', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def bulk_mark_as_read(request):
    """
    Mark multiple notices as read for the current user
    POST: Bulk mark notices as read (students, captains, teachers)
    """
    if request.user.role not in ['student', 'captain', 'teacher']:
        return Response(
            {'error': 'Only authenticated users can mark notices as read'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    notice_ids = request.data.get('notice_ids', [])
    
    if not notice_ids or not isinstance(notice_ids, list):
        return Response(
            {'error': 'notice_ids must be a non-empty list'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get published notices that exist
        existing_notices = Notice.objects.filter(
            id__in=notice_ids,
            is_published=True
        ).values_list('id', flat=True)
        
        # Create read status records for notices not already read
        existing_read_statuses = NoticeReadStatus.objects.filter(
            notice_id__in=existing_notices,
            student=request.user
        ).values_list('notice_id', flat=True)
        
        new_read_notices = set(existing_notices) - set(existing_read_statuses)
        
        # Bulk create read status records
        read_statuses_to_create = [
            NoticeReadStatus(notice_id=notice_id, student=request.user)
            for notice_id in new_read_notices
        ]
        
        created_statuses = NoticeReadStatus.objects.bulk_create(read_statuses_to_create)
        
        # Invalidate cache
        cache_key = f'user_unread_count_{request.user.id}'
        cache.delete(cache_key)
        
        return Response({
            'marked_as_read': len(created_statuses),
            'already_read': len(existing_read_statuses),
            'not_found': len(notice_ids) - len(existing_notices),
            'total_requested': len(notice_ids)
        })
        
    except Exception as e:
        return Response(
            {'error': 'Failed to mark notices as read', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )