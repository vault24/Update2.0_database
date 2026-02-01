"""
Live Classes URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'classes', views.LiveClassViewSet, basename='liveclass')
router.register(r'recordings', views.ClassRecordingViewSet, basename='classrecording')
router.register(r'dashboard', views.DashboardViewSet, basename='live-classes-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]