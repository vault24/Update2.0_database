"""
URL configuration for slms_core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from apps.documents.file_views import SecureFileView, DocumentThumbnailView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/auth/', include('apps.authentication.urls')),
    path('api/admissions/', include('apps.admissions.urls')),
    path('api/teachers/', include('apps.teachers.urls')),
    path('api/teacher-requests/', include('apps.teacher_requests.urls')),
    path('api/departments/', include('apps.departments.urls')),
    path('api/', include('apps.students.urls')),
    path('api/', include('apps.alumni.urls')),
    path('api/applications/', include('apps.applications.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/', include('apps.notifications.urls')),
    path('api/', include('apps.notices.urls')),
    path('api/class-routines/', include('apps.class_routines.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/marks/', include('apps.marks.urls')),
    path('api/correction-requests/', include('apps.correction_requests.urls')),
    path('api/activity-logs/', include('apps.activity_logs.urls')),
    path('api/settings/', include('apps.system_settings.urls')),
    path('api/motivations/', include('apps.motivations.urls')),
    path('api/stipends/', include('apps.stipends.urls')),
    
    # Secure file serving
    re_path(r'^files/(?P<file_path>.+)$', SecureFileView.as_view(), name='secure-file'),
    path('files/thumbnail/<uuid:document_id>/', DocumentThumbnailView.as_view(), name='document-thumbnail'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
