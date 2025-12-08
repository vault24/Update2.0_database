"""
Admin views for notification monitoring
"""

from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Notification, DeliveryLog


@staff_member_required
def notification_dashboard(request):
    """
    Admin dashboard for notification monitoring
    """
    # Get statistics
    total_notifications = Notification.objects.count()
    unread_notifications = Notification.objects.filter(status='unread').count()
    read_notifications = Notification.objects.filter(status='read').count()
    archived_notifications = Notification.objects.filter(status='archived').count()
    deleted_notifications = Notification.objects.filter(status='deleted').count()

    # Delivery statistics
    total_deliveries = DeliveryLog.objects.count()
    pending_deliveries = DeliveryLog.objects.filter(status='pending').count()
    successful_deliveries = DeliveryLog.objects.filter(status='delivered').count()
    failed_deliveries = DeliveryLog.objects.filter(status='failed').count()

    # Recent notifications
    recent_notifications = Notification.objects.select_related('recipient').order_by('-created_at')[:10]

    # Failed deliveries
    failed_logs = DeliveryLog.objects.filter(status='failed').select_related('notification').order_by('-created_at')[:10]

    # Notifications by type
    notifications_by_type = Notification.objects.values('notification_type').annotate(count=Count('id'))

    # Notifications by status
    notifications_by_status = Notification.objects.values('status').annotate(count=Count('id'))

    # Last 24 hours statistics
    last_24h = timezone.now() - timedelta(hours=24)
    notifications_last_24h = Notification.objects.filter(created_at__gte=last_24h).count()
    deliveries_last_24h = DeliveryLog.objects.filter(created_at__gte=last_24h).count()

    data = {
        'statistics': {
            'total_notifications': total_notifications,
            'unread_notifications': unread_notifications,
            'read_notifications': read_notifications,
            'archived_notifications': archived_notifications,
            'deleted_notifications': deleted_notifications,
            'total_deliveries': total_deliveries,
            'pending_deliveries': pending_deliveries,
            'successful_deliveries': successful_deliveries,
            'failed_deliveries': failed_deliveries,
            'notifications_last_24h': notifications_last_24h,
            'deliveries_last_24h': deliveries_last_24h,
        },
        'recent_notifications': [
            {
                'id': n.id,
                'title': n.title,
                'recipient': n.recipient.username,
                'type': n.notification_type,
                'status': n.status,
                'created_at': n.created_at.isoformat()
            }
            for n in recent_notifications
        ],
        'failed_deliveries': [
            {
                'id': log.id,
                'notification_title': log.notification.title,
                'channel': log.channel,
                'retry_count': log.retry_count,
                'error_message': log.error_message,
                'created_at': log.created_at.isoformat()
            }
            for log in failed_logs
        ],
        'notifications_by_type': list(notifications_by_type),
        'notifications_by_status': list(notifications_by_status),
    }

    return JsonResponse(data)


@staff_member_required
def delivery_logs(request):
    """
    Get delivery logs with filtering
    """
    status_filter = request.GET.get('status')
    channel_filter = request.GET.get('channel')
    limit = int(request.GET.get('limit', 50))

    logs = DeliveryLog.objects.select_related('notification').order_by('-created_at')

    if status_filter:
        logs = logs.filter(status=status_filter)

    if channel_filter:
        logs = logs.filter(channel=channel_filter)

    logs = logs[:limit]

    data = {
        'logs': [
            {
                'id': log.id,
                'notification_id': log.notification.id,
                'notification_title': log.notification.title,
                'recipient': log.notification.recipient.username,
                'channel': log.channel,
                'status': log.status,
                'retry_count': log.retry_count,
                'error_message': log.error_message,
                'created_at': log.created_at.isoformat(),
                'updated_at': log.updated_at.isoformat()
            }
            for log in logs
        ]
    }

    return JsonResponse(data)


@staff_member_required
def retry_failed_delivery(request):
    """
    Retry a failed delivery
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    delivery_id = request.POST.get('delivery_id')

    try:
        log = DeliveryLog.objects.get(id=delivery_id)
        
        if log.status == 'failed' and log.retry_count < 3:
            log.status = 'pending'
            log.retry_count += 1
            log.error_message = None
            log.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Delivery retry scheduled',
                'log': {
                    'id': log.id,
                    'status': log.status,
                    'retry_count': log.retry_count
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'Cannot retry this delivery'
            }, status=400)
    except DeliveryLog.DoesNotExist:
        return JsonResponse({'error': 'Delivery log not found'}, status=404)
