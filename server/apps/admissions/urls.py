"""
Admission URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.AdmissionViewSet, basename='admission')

urlpatterns = [
    # Must precede the router so 'settings' isn't captured as an admission pk.
    path('settings/', views.AdmissionSettingsView.as_view(), name='admission-settings'),
    path('', include(router.urls)),
]
