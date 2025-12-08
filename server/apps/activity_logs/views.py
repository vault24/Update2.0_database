"""
Activity Log Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.http import HttpResponse
import csv
from .models import ActivityLog
from .serializers import ActivityLogSerializer


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing activity logs (read-only)
    """
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['user', 'action_type', 'entity_type']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export activity logs to CSV"""
        # Get filtered queryset
        queryset = self.filter_queryset(self.get_queryset())
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="activity_logs.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Timestamp', 'User', 'Action Type', 'Entity Type', 
            'Entity ID', 'Description', 'IP Address'
        ])
        
        for log in queryset:
            writer.writerow([
                log.timestamp,
                log.user.username if log.user else 'System',
                log.action_type,
                log.entity_type,
                log.entity_id,
                log.description,
                log.ip_address or ''
            ])
        
        return response
