"""
Correction Request URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CorrectionRequestViewSet

router = DefaultRouter()
router.register(r'', CorrectionRequestViewSet, basename='correctionrequest')

urlpatterns = [
    path('', include(router.urls)),
]
