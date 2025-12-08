"""
Teacher Requests App Configuration
"""
from django.apps import AppConfig


class TeacherRequestsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.teacher_requests'
    verbose_name = 'Teacher Requests'
