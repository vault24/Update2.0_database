from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, NotificationPreferenceViewSet, DeliveryLogViewSet
from . import admin_views
from . import badge_views

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'notification-preferences', NotificationPreferenceViewSet, basename='notification-preference')
router.register(r'delivery-logs', DeliveryLogViewSet, basename='delivery-log')

urlpatterns = [
    path('', include(router.urls)),
    # Sidebar unread badges (per-module "new since last opened" counts).
    path('badges/', badge_views.badges_view, name='badges'),
    path('badges/seen/', badge_views.mark_module_seen_view, name='badges-seen'),
    path('admin/dashboard/', admin_views.notification_dashboard, name='notification-dashboard'),
    path('admin/delivery-logs/', admin_views.delivery_logs, name='delivery-logs'),
    path('admin/retry-delivery/', admin_views.retry_failed_delivery, name='retry-delivery'),
]
