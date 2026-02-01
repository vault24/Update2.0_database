"""
Learning Hub URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'subjects', views.SubjectViewSet, basename='subject')
router.register(r'activities', views.ClassActivityViewSet, basename='classactivity')
router.register(r'assignments', views.AssignmentViewSet, basename='assignment')
router.register(r'materials', views.StudyMaterialViewSet, basename='studymaterial')
router.register(r'dashboard', views.DashboardViewSet, basename='learning-hub-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]