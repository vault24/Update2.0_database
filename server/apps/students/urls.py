"""
Student URL Configuration
"""
from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')

urlpatterns = [
    # Custom endpoint for fetching by identifier (before router URLs)
    re_path(r'^students/by-identifier/(?P<identifier>[^/]+)/$', 
            StudentViewSet.as_view({'get': 'by_identifier'}), 
            name='student-by-identifier'),
    path('', include(router.urls)),
]
