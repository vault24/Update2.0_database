from django.apps import AppConfig


class SystemReportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.system_reports'
    verbose_name = 'System Reports'

    def ready(self):
        # Connect security / auth signal receivers.
        from . import signals  # noqa: F401
