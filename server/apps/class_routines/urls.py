"""
Class Routine URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClassRoutineViewSet

router = DefaultRouter()
router.register(r'', ClassRoutineViewSet, basename='class-routine')

urlpatterns = [
    path('', include(router.urls)),
]
