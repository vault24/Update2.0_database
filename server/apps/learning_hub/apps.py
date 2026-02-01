"""
Learning Hub App Configuration
"""
from django.apps import AppConfig


class LearningHubConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.learning_hub'
    verbose_name = 'Learning Hub'