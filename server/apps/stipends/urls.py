"""
Stipend URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StipendCriteriaViewSet, StipendEligibilityViewSet

router = DefaultRouter()
router.register(r'criteria', StipendCriteriaViewSet, basename='stipend-criteria')
router.register(r'eligibility', StipendEligibilityViewSet, basename='stipend-eligibility')

urlpatterns = [
    path('', include(router.urls)),
]
