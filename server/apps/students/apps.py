"""
Students App Configuration
"""
from django.apps import AppConfig


class StudentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.students'
    verbose_name = 'Students'
    
    def ready(self):
        """Import signals when the app is ready"""
        import apps.students.signals