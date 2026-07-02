"""
Stipend URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StipendCriteriaViewSet,
    StipendEligibilityViewSet,
    StipendCriteriaSettingsView,
)

router = DefaultRouter()
router.register(r'criteria', StipendCriteriaViewSet, basename='stipend-criteria')
router.register(r'eligibility', StipendEligibilityViewSet, basename='stipend-eligibility')

urlpatterns = [
    path('settings/', StipendCriteriaSettingsView.as_view(), name='stipend-criteria-settings'),
    path('', include(router.urls)),
]
