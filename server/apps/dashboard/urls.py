"""
Dashboard URLs
"""
from django.urls import path
from .views import (
    DashboardStatsView,
    AdminDashboardView,
    StudentDashboardView,
    TeacherDashboardView,
    AnalyticsView
)

urlpatterns = [
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('admin/', AdminDashboardView.as_view(), name='dashboard-admin'),
    path('student/', StudentDashboardView.as_view(), name='dashboard-student'),
    path('teacher/', TeacherDashboardView.as_view(), name='dashboard-teacher'),
    path('analytics/', AnalyticsView.as_view(), name='dashboard-analytics'),
]
