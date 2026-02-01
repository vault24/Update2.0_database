"""
Complaints Views
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from django.utils import timezone
from datetime import datetime, timedelta

from .models import Complaint, ComplaintCategory
from .serializers import (
    ComplaintSerializer, ComplaintDetailSerializer,
    ComplaintCategorySerializer
)


class ComplaintCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Complaint category viewset"""
    queryset = ComplaintCategory.objects.filter(is_active=True)
    serializer_class = ComplaintCategorySerializer
    permission_classes = [IsAuthenticated]
    ordering = ['name']


class ComplaintViewSet(viewsets.ModelViewSet):
    """Complaint viewset for students"""
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'status', 'priority', 'is_anonymous']
    search_fields = ['title', 'description', 'category__name']
    ordering_fields = ['created_at', 'updated_at', 'priority']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Students can only see their own complaints
        if hasattr(user, 'student_profile'):
            queryset = queryset.filter(student=user.student_profile)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ComplaintDetailSerializer
        return ComplaintSerializer
    
    def perform_create(self, serializer):
        """Set student when creating complaint"""
        user = self.request.user
        
        if not hasattr(user, 'student_profile'):
            raise ValueError('Only students can create complaints')
        
        serializer.save(
            student=user.student_profile,
            status='pending'
        )
    
    def create(self, request, *args, **kwargs):
        """Create a new complaint"""
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'error': 'Only students can create complaints'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Students can only update pending complaints"""
        instance = self.get_object()
        
        if instance.status != 'pending':
            return Response(
                {'error': 'Cannot update complaint that is being processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Students can only delete pending complaints"""
        instance = self.get_object()
        
        if instance.status != 'pending':
            return Response(
                {'error': 'Cannot delete complaint that is being processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def my_stats(self, request):
        """Get user's complaint statistics"""
        user = request.user
        
        if not hasattr(user, 'student_profile'):
            return Response(
                {'error': 'Only students can view complaint statistics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student = user.student_profile
        complaints = Complaint.objects.filter(student=student)
        
        stats = {
            'total': complaints.count(),
            'pending': complaints.filter(status='pending').count(),
            'seen': complaints.filter(status='seen').count(),
            'in_progress': complaints.filter(status='in_progress').count(),
            'resolved': complaints.filter(status='resolved').count(),
            'closed': complaints.filter(status='closed').count(),
        }
        
        # Resolution rate
        resolved_count = stats['resolved'] + stats['closed']
        stats['resolution_rate'] = round(
            (resolved_count / stats['total'] * 100) if stats['total'] > 0 else 0, 1
        )
        
        # Average response time (for resolved complaints)
        resolved_complaints = complaints.filter(
            status__in=['resolved', 'closed'],
            updated_at__isnull=False
        )
        
        if resolved_complaints.exists():
            total_response_time = sum([
                (complaint.updated_at - complaint.created_at).total_seconds()
                for complaint in resolved_complaints
            ])
            avg_response_hours = total_response_time / resolved_complaints.count() / 3600
            stats['avg_response_time_hours'] = round(avg_response_hours, 1)
        else:
            stats['avg_response_time_hours'] = 0
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Get complaints grouped by status"""
        status_param = request.query_params.get('status', 'all')
        
        queryset = self.get_queryset()
        
        if status_param != 'all':
            queryset = queryset.filter(status=status_param)
        
        complaints = queryset.order_by('-created_at')
        serializer = self.get_serializer(complaints, many=True)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get complaints grouped by category"""
        category_id = request.query_params.get('category_id')
        
        queryset = self.get_queryset()
        
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Group by category
        complaints_by_category = {}
        for complaint in queryset:
            category_name = complaint.category.name
            if category_name not in complaints_by_category:
                complaints_by_category[category_name] = []
            complaints_by_category[category_name].append(
                self.get_serializer(complaint).data
            )
        
        return Response(complaints_by_category)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent complaints"""
        complaints = self.get_queryset()[:10]
        serializer = self.get_serializer(complaints, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending complaints"""
        complaints = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(complaints, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def resolved(self, request):
        """Get resolved complaints"""
        complaints = self.get_queryset().filter(status__in=['resolved', 'closed'])
        serializer = self.get_serializer(complaints, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_seen(self, request, pk=None):
        """Mark complaint as seen (for admin use)"""
        complaint = self.get_object()
        
        # Only allow if user is admin/staff
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff can mark complaints as seen'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if complaint.status == 'pending':
            complaint.status = 'seen'
            complaint.seen_at = timezone.now()
            complaint.seen_by = request.user
            complaint.save()
            
            return Response({'message': 'Complaint marked as seen'})
        
        return Response(
            {'error': 'Complaint is not in pending status'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def add_response(self, request, pk=None):
        """Add response to complaint (for admin use)"""
        complaint = self.get_object()
        
        # Only allow if user is admin/staff
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff can respond to complaints'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        response_text = request.data.get('response')
        new_status = request.data.get('status', 'in_progress')
        
        if not response_text:
            return Response(
                {'error': 'Response text is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update complaint with response
        complaint.response = response_text
        complaint.responded_by = request.user.username
        complaint.responded_at = timezone.now()
        complaint.status = new_status
        complaint.updated_at = timezone.now()
        complaint.save()
        
        return Response({
            'message': 'Response added successfully',
            'complaint': ComplaintDetailSerializer(complaint).data
        })


class DashboardViewSet(viewsets.ViewSet):
    """Complaints dashboard"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get dashboard data"""
        user = request.user
        
        if not hasattr(user, 'student_profile'):
            return Response(
                {'error': 'Only students can access complaints dashboard'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student = user.student_profile
        
        # Get user's complaints
        complaints = Complaint.objects.filter(student=student)
        
        # Recent complaints
        recent_complaints = complaints.order_by('-created_at')[:10]
        
        # Pending complaints
        pending_complaints = complaints.filter(status='pending')
        
        # In progress complaints
        in_progress_complaints = complaints.filter(status__in=['seen', 'in_progress'])
        
        # Resolved complaints
        resolved_complaints = complaints.filter(status__in=['resolved', 'closed'])
        
        # Statistics
        total_complaints = complaints.count()
        pending_count = pending_complaints.count()
        in_progress_count = in_progress_complaints.count()
        resolved_count = resolved_complaints.count()
        
        resolution_rate = round(
            (resolved_count / total_complaints * 100) if total_complaints > 0 else 0, 1
        )
        
        # Category breakdown
        category_stats = {}
        for complaint in complaints:
            category_name = complaint.category.name
            if category_name not in category_stats:
                category_stats[category_name] = 0
            category_stats[category_name] += 1
        
        dashboard_data = {
            'recent_complaints': ComplaintSerializer(recent_complaints, many=True).data,
            'pending_complaints': ComplaintSerializer(pending_complaints, many=True).data,
            'in_progress_complaints': ComplaintSerializer(in_progress_complaints, many=True).data,
            'statistics': {
                'total_complaints': total_complaints,
                'pending_count': pending_count,
                'in_progress_count': in_progress_count,
                'resolved_count': resolved_count,
                'resolution_rate': resolution_rate,
                'category_breakdown': category_stats
            }
        }
        
        return Response(dashboard_data)