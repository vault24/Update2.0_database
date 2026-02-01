from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MotivationMessageViewSet, MotivationSettingsViewSet,
    MotivationViewViewSet, MotivationLikeViewSet
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'messages', MotivationMessageViewSet, basename='motivation-messages')
router.register(r'settings', MotivationSettingsViewSet, basename='motivation-settings')
router.register(r'views', MotivationViewViewSet, basename='motivation-views')
router.register(r'likes', MotivationLikeViewSet, basename='motivation-likes')

urlpatterns = [
    path('', include(router.urls)),
]