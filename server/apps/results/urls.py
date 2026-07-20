from django.urls import path

from . import views

urlpatterns = [
    path('imports/', views.ImportListCreateView.as_view(), name='result-imports'),
    path('imports/<uuid:import_id>/', views.ImportDetailView.as_view(), name='result-import-detail'),
    path('imports/<uuid:import_id>/issues/', views.ImportIssuesView.as_view(), name='result-import-issues'),
    path('admin/search/', views.AdminRollSearchView.as_view(), name='result-admin-search'),
    path('analytics/exams/', views.AnalyticsExamsView.as_view(), name='result-analytics-exams'),
    path('analytics/summary/', views.AnalyticsSummaryView.as_view(), name='result-analytics-summary'),
    path('analytics/download/', views.AnalyticsDownloadView.as_view(), name='result-analytics-download'),
    path('public/search/', views.PublicRollSearchView.as_view(), name='result-public-search'),
    path('my/', views.MyResultsView.as_view(), name='result-my'),
]
