"""
Document Template URLs (mounted at /api/document-templates/)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .template_views import DocumentTemplateViewSet

router = DefaultRouter()
router.register(r'', DocumentTemplateViewSet, basename='document-template')

urlpatterns = [
    path('', include(router.urls)),
]
