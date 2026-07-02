"""
Automatic audit / security reporting via Django signals:

  - failed login attempts (grouped per username)
  - security-relevant changes to user accounts: role, superuser flag,
    active/suspended status, password, 2FA, email
  - user account deletions
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_login_failed
from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver

from .services import record_report

User = get_user_model()

# Fields whose change is a SECURITY event (vs a plain audit entry).
_SECURITY_FIELDS = {
    'role': 'Role',
    'is_superuser': 'Superuser flag',
    'is_staff': 'Staff flag',
    'account_status': 'Account status',
    'is_active': 'Active flag',
    'password': 'Password',
    'two_factor_enabled': 'Two-factor authentication',
}
_AUDIT_FIELDS = {
    'email': 'Email address',
    'email_notifications_enabled': 'Email notification preference',
    'interface_mode': 'Interface mode',
}


@receiver(user_login_failed)
def report_login_failure(sender, credentials, request=None, **kwargs):
    username = (credentials or {}).get('username') or (credentials or {}).get('email') or 'unknown'
    ip = None
    if request is not None:
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR')
    record_report(
        category='auth_failure',
        severity='low',
        title=f"Failed login attempt for '{username}'",
        message=f"One or more failed login attempts for account '{username}'.",
        ip_address=ip,
        extra={'username': str(username)[:150]},
        source='auto_signal',
        fingerprint_parts=['login_failed', str(username)[:150]],
    )


@receiver(pre_save, sender=User)
def report_user_security_changes(sender, instance, **kwargs):
    """Record security/audit reports when sensitive account fields change."""
    if not instance.pk:
        return
    try:
        old = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    security_changes, audit_changes = [], []
    for field, label in _SECURITY_FIELDS.items():
        old_val, new_val = getattr(old, field, None), getattr(instance, field, None)
        if old_val != new_val:
            if field == 'password':
                security_changes.append(f"{label} was changed")
            else:
                security_changes.append(f"{label}: {old_val!r} → {new_val!r}")
    for field, label in _AUDIT_FIELDS.items():
        old_val, new_val = getattr(old, field, None), getattr(instance, field, None)
        if old_val != new_val:
            audit_changes.append(f"{label}: {old_val!r} → {new_val!r}")

    if security_changes:
        record_report(
            category='security_alert',
            severity='medium' if any(f in c for c in security_changes for f in ('Role', 'Superuser', 'Staff')) else 'low',
            title=f"Security change on account '{instance.username}'",
            message='; '.join(security_changes),
            user=instance,
            extra={'changes': security_changes},
            source='auto_signal',
            # One grouped report per account per change-set signature.
            fingerprint_parts=['user_security', instance.pk, '; '.join(sorted(security_changes))[:200]],
        )
    if audit_changes:
        record_report(
            category='audit',
            severity='info',
            title=f"Account settings changed for '{instance.username}'",
            message='; '.join(audit_changes),
            user=instance,
            extra={'changes': audit_changes},
            source='auto_signal',
            fingerprint_parts=['user_audit', instance.pk, '; '.join(sorted(audit_changes))[:200]],
        )


@receiver(post_delete, sender=User)
def report_user_deleted(sender, instance, **kwargs):
    record_report(
        category='security_alert',
        severity='medium',
        title=f"User account deleted: '{instance.username}'",
        message=f"Account '{instance.username}' (role: {instance.role}) was deleted from the system.",
        extra={'username': instance.username, 'role': instance.role,
               'email': instance.email},
        source='auto_signal',
        fingerprint_parts=['user_deleted', instance.username, str(instance.pk)],
    )
