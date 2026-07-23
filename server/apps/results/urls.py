from django.urls import path

from . import views

urlpatterns = [
    path('imports/', views.ImportListCreateView.as_view(), name='result-imports'),
    path('imports/<uuid:import_id>/', views.ImportDetailView.as_view(), name='result-import-detail'),
    path('imports/<uuid:import_id>/issues/', views.ImportIssuesView.as_view(), name='result-import-issues'),
    path('admin/search/', views.AdminRollSearchView.as_view(), name='result-admin-search'),
    path('analytics/semesters/', views.AnalyticsSemestersView.as_view(), name='result-analytics-semesters'),
    path('analytics/summary/', views.AnalyticsSummaryView.as_view(), name='result-analytics-summary'),
    path('analytics/download/', views.AnalyticsDownloadView.as_view(), name='result-analytics-download'),
    path('subjects/import/', views.SubjectImportView.as_view(), name='result-subject-import'),
    path('subjects/stats/', views.SubjectStatsView.as_view(), name='result-subject-stats'),
    path('subjects/lookup/', views.SubjectLookupView.as_view(), name='result-subject-lookup'),
    path('public/search/', views.PublicRollSearchView.as_view(), name='result-public-search'),
    path('public/exams/', views.PublicRecentExamsView.as_view(), name='result-public-exams'),
    path('public/download/', views.PublicResultPdfView.as_view(), name='result-public-download'),
    path('my/', views.MyResultsView.as_view(), name='result-my'),
    path('classmates/', views.ClassmateResultsView.as_view(), name='result-classmates'),
]
