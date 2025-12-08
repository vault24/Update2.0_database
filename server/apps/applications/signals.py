"""
Signals for Application model to trigger notifications
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Application


@receiver(post_save, sender=Application)
def application_status_changed(sender, instance, created, **kwargs):
    """
    Signal handler for when application status changes
    """
    if not created:  # Only on update, not on creation
        try:
            from apps.notifications.integration import notify_application_status_change
            notify_application_status_change(instance, instance.status)
        except Exception as e:
            print(f"Error in application_status_changed signal: {e}")
