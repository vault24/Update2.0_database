from django.urls import path
from . import views

app_name = 'notices'

urlpatterns = [
    # Admin endpoints
    path('admin/notices/', views.AdminNoticeListCreateView.as_view(), name='admin-notice-list-create'),
    path('admin/notices/<int:pk>/', views.AdminNoticeDetailView.as_view(), name='admin-notice-detail'),
    path('admin/notices/stats/', views.notice_stats, name='notice-stats'),
    path('admin/notices/<int:notice_id>/stats/', views.notice_detail_stats, name='notice-detail-stats'),
    path('admin/notices/engagement-summary/', views.notice_engagement_summary, name='notice-engagement-summary'),
    
    # Student endpoints (legacy - kept for backward compatibility)
    path('student/notices/', views.StudentNoticeListView.as_view(), name='student-notice-list'),
    path('student/notices/<int:pk>/', views.StudentNoticeDetailView.as_view(), name='student-notice-detail'),
    path('student/notices/<int:notice_id>/mark-read/', views.mark_notice_as_read, name='mark-notice-read'),
    path('student/notices/bulk-mark-read/', views.bulk_mark_as_read, name='bulk-mark-read'),
    path('student/notices/unread-count/', views.student_unread_count, name='student-unread-count'),
    
    # General user endpoints (for students, captains, teachers)
    path('notices/', views.StudentNoticeListView.as_view(), name='user-notice-list'),
    path('notices/<int:pk>/', views.StudentNoticeDetailView.as_view(), name='user-notice-detail'),
    path('notices/<int:notice_id>/mark-read/', views.mark_notice_as_read, name='user-mark-notice-read'),
    path('notices/bulk-mark-read/', views.bulk_mark_as_read, name='user-bulk-mark-read'),
    path('notices/unread-count/', views.student_unread_count, name='user-unread-count'),
]