from django.urls import path

from . import views

urlpatterns = [
    path('imports/', views.RoutineImportListCreateView.as_view(), name='routine-imports'),
    path('imports/<uuid:import_id>/', views.RoutineImportDetailView.as_view(), name='routine-import-detail'),
    path('imports/<uuid:import_id>/issues/', views.RoutineImportIssuesView.as_view(), name='routine-import-issues'),
    path('my/', views.MyRoutineView.as_view(), name='routine-my'),
    path('public/my/', views.PublicRoutineView.as_view(), name='routine-public-my'),
]
