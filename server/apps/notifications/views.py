from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from .models import Notification, NotificationPreference, NotificationPreferenceType, DeliveryLog
from .serializers import (
    NotificationSerializer, NotificationPreferenceSerializer,
    NotificationPreferenceTypeSerializer, DeliveryLogSerializer
)


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return notifications for the current user"""
        user = self.request.user
        queryset = Notification.objects.filter(recipient=user)

        # Filter by status if provided
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by notification type if provided
        type_param = self.request.query_params.get('type')
        if type_param:
            queryset = queryset.filter(notification_type=type_param)

        # Filter by date range if provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        # Exclude deleted notifications from main view
        if not self.request.query_params.get('include_deleted'):
            queryset = queryset.exclude(status='deleted')

        return queryset

    def get_object(self):
        """Override to ensure user can only access their own notifications"""
        obj = super().get_object()
        if obj.recipient != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to access this notification.")
        return obj

    def create(self, request, *args, **kwargs):
        """Create a new notification"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['patch'])
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def archive(self, request, pk=None):
        """Archive a notification"""
        notification = self.get_object()
        notification.archive()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'])
    def soft_delete(self, request, pk=None):
        """Soft delete a notification"""
        notification = self.get_object()
        notification.delete_notification()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], permission_classes=[])
    def unread_count(self, request):
        """Get count of unread notifications"""
        # If user is not authenticated, return 0
        if not request.user.is_authenticated:
            return Response({'unread_count': 0})
        
        user = request.user
        count = Notification.objects.filter(
            recipient=user,
            status='unread'
        ).count()
        return Response({'unread_count': count})

    @action(detail=False, methods=['patch'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read"""
        user = request.user
        notifications = Notification.objects.filter(
            recipient=user,
            status='unread'
        )
        count = notifications.count()
        for notification in notifications:
            notification.mark_as_read()
        return Response({'marked_as_read': count})


class NotificationPreferenceViewSet(viewsets.ViewSet):
    """ViewSet for managing notification preferences"""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get notification preferences for current user"""
        user = request.user
        preference, created = NotificationPreference.objects.get_or_create(user=user)

        # Create default preferences if they don't exist
        if created:
            from .models import NOTIFICATION_TYPES
            for notif_type, _ in NOTIFICATION_TYPES:
                NotificationPreferenceType.objects.get_or_create(
                    preference=preference,
                    notification_type=notif_type,
                    defaults={'enabled': True, 'email_enabled': False}
                )

        serializer = NotificationPreferenceSerializer(preference)
        return Response(serializer.data)

    def update(self, request, pk=None):
        """Update notification preference for a specific type"""
        user = request.user
        preference, _ = NotificationPreference.objects.get_or_create(user=user)

        notification_type = request.data.get('notification_type')
        enabled = request.data.get('enabled')
        email_enabled = request.data.get('email_enabled')

        if not notification_type:
            return Response(
                {'error': 'notification_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        pref_type, _ = NotificationPreferenceType.objects.get_or_create(
            preference=preference,
            notification_type=notification_type
        )

        if enabled is not None:
            pref_type.enabled = enabled
        if email_enabled is not None:
            pref_type.email_enabled = email_enabled

        pref_type.save()

        serializer = NotificationPreferenceTypeSerializer(pref_type)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_preferences(self, request):
        """Get current user's notification preferences"""
        user = request.user
        preference, created = NotificationPreference.objects.get_or_create(user=user)

        if created:
            from .models import NOTIFICATION_TYPES
            for notif_type, _ in NOTIFICATION_TYPES:
                NotificationPreferenceType.objects.get_or_create(
                    preference=preference,
                    notification_type=notif_type,
                    defaults={'enabled': True, 'email_enabled': False}
                )

        serializer = NotificationPreferenceSerializer(preference)
        return Response(serializer.data)


class DeliveryLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing delivery logs (admin only)"""
    queryset = DeliveryLog.objects.all()
    serializer_class = DeliveryLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['notification__title', 'error_message']
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """Only allow admins to view delivery logs"""
        user = self.request.user
        if user.is_staff:
            return DeliveryLog.objects.all()
        return DeliveryLog.objects.none()

    @action(detail=False, methods=['get'])
    def failed_deliveries(self, request):
        """Get failed deliveries (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        failed_logs = DeliveryLog.objects.filter(status='failed')
        serializer = self.get_serializer(failed_logs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed delivery (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        delivery_log = self.get_object()
        if delivery_log.status == 'failed' and delivery_log.retry_count < 3:
            delivery_log.status = 'pending'
            delivery_log.retry_count += 1
            delivery_log.error_message = None
            delivery_log.save()
            serializer = self.get_serializer(delivery_log)
            return Response(serializer.data)

        return Response(
            {'error': 'Cannot retry this delivery'},
            status=status.HTTP_400_BAD_REQUEST
        )
