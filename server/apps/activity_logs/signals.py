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


# Generic signal handlers for automatic logging
@receiver(post_save)
def log_model_save(sender, instance, created, **kwargs):
    """Log create and update operations"""
    # Skip logging for ActivityLog itself to avoid recursion
    if sender.__name__ == 'ActivityLog':
        return
    
    # Skip logging for certain models
    skip_models = ['Session', 'ContentType', 'Permission', 'LogEntry', 'MigrationRecorder']
    if sender.__name__ in skip_models:
        return
    
    # Skip if activity_logs table doesn't exist yet (during migrations)
    from django.db import connection
    if 'activity_logs' not in connection.introspection.table_names():
        return
    
    entity_type = get_entity_name(instance)
    entity_id = getattr(instance, 'id', None) or getattr(instance, 'pk', None)
    
    if created:
        action_type = 'create'
        description = f"Created {entity_type}"
    else:
        action_type = 'update'
        description = f"Updated {entity_type}"
    
    # Try to get user from instance if available
    user = getattr(instance, 'recorded_by', None) or getattr(instance, 'reviewed_by', None)
    
    log_activity(
        user=user,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description
    )


@receiver(post_delete)
def log_model_delete(sender, instance, **kwargs):
    """Log delete operations"""
    # Skip logging for ActivityLog itself
    if sender.__name__ == 'ActivityLog':
        return
    
    # Skip logging for certain models
    skip_models = ['Session', 'ContentType', 'Permission', 'LogEntry']
    if sender.__name__ in skip_models:
        return
    
    entity_type = get_entity_name(instance)
    entity_id = getattr(instance, 'id', None) or getattr(instance, 'pk', None)
    
    # Try to get user from instance if available
    user = getattr(instance, 'recorded_by', None) or getattr(instance, 'reviewed_by', None)
    
    log_activity(
        user=user,
        action_type='delete',
        entity_type=entity_type,
        entity_id=entity_id,
        description=f"Deleted {entity_type}"
    )
