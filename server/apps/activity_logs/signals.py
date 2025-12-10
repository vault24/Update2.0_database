"""
Django signals for automatic activity logging
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ActivityLog


def get_entity_name(instance):
    """Get entity type name from model instance"""
    return instance.__class__.__name__


def log_activity(user, action_type, entity_type, entity_id, description, changes=None, ip_address=None, user_agent=None):
    """Helper function to create activity log entries"""
    ActivityLog.objects.create(
        user=user,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        description=description,
        changes=changes or {},
        ip_address=ip_address,
        user_agent=user_agent
    )


# Generic signal handlers for automatic logging - DISABLED
# These are disabled to prevent issues with automatic logging
# Use manual logging in views instead

# @receiver(post_save)
# def log_model_save(sender, instance, created, **kwargs):
#     """Log create and update operations"""
#     pass

# @receiver(post_delete)
# def log_model_delete(sender, instance, **kwargs):
#     """Log delete operations"""
#     pass
