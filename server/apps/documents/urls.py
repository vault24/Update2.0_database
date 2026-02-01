"""
Enhanced Document URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, DocumentAccessLogViewSet

router = DefaultRouter()
router.register(r'', DocumentViewSet, basename='document')
router.register(r'access-logs', DocumentAccessLogViewSet, basename='document-access-log')

urlpatterns = [
    path('', include(router.urls)),
]
