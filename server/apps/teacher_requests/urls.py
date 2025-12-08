"""
Teacher Request URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'signup-requests', views.TeacherSignupRequestViewSet, basename='teacher-signup-request')
router.register(r'contact-requests', views.TeacherRequestViewSet, basename='teacher-contact-request')

urlpatterns = [
    path('', include(router.urls)),
]
