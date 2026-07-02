"""
Central API for recording system reports.

Every auto-capture path (middleware, logging handler, signals, health monitor)
funnels into `record_report`, which groups identical events by fingerprint so
repeated errors never flood the table. Recording is guarded against recursion
(a failure while recording must never trigger another recording) and never
raises into the caller.
"""
import hashlib
import logging
import threading

from django.utils import timezone

logger = logging.getLogger(__name__)

# Recursion guard: while a report is being written, any nested attempt to
# record (e.g. a DB error triggered by the write itself) is dropped.
_guard = threading.local()

MAX_STACK_TRACE = 20000
MAX_MESSAGE = 8000

# Severity ranking used when a recurring report escalates.
_SEVERITY_RANK = {'info': 0, 'low': 1, 'medium': 2, 'high': 3, 'critical': 4}


def make_fingerprint(*parts):
    """Stable fingerprint from the identifying parts of an event."""
    raw = '||'.join(str(p) for p in parts if p is not None)
    return hashlib.sha256(raw.encode('utf-8', errors='replace')).hexdigest()[:64]


def record_report(
    *,
    category,
    title,
    severity='medium',
    message='',
    exception_type='',
    stack_trace='',
    path='',
    method='',
    status_code=None,
    user=None,
    ip_address=None,
    extra=None,
    source='auto_middleware',
    fingerprint=None,
    fingerprint_parts=None,
):
    """
    Create a new SystemReport or bump the existing grouped one.

    Returns the SystemReport instance, or None when recording was skipped
    (recursion guard) or failed.
    """
    if getattr(_guard, 'active', False):
        return None
    _guard.active = True
    try:
        from .models import SystemReport

        if not fingerprint:
            parts = fingerprint_parts or [category, exception_type or title, path]
            fingerprint = make_fingerprint(*parts)

        # Anonymous / non-persisted users can't be linked.
        if user is not None and (not getattr(user, 'is_authenticated', False) or not getattr(user, 'pk', None)):
            user = None

        defaults = {
            'category': category,
            'severity': severity if severity in _SEVERITY_RANK else 'medium',
            'title': str(title)[:255],
            'message': str(message or '')[:MAX_MESSAGE],
            'exception_type': str(exception_type or '')[:255],
            'stack_trace': str(stack_trace or '')[:MAX_STACK_TRACE],
            'path': str(path or '')[:500],
            'method': str(method or '')[:10],
            'status_code': status_code,
            'ip_address': ip_address or None,
            'user': user,
            'user_display': (getattr(user, 'username', '') or '')[:150],
            'extra': extra or {},
            'source': source,
        }

        report, created = SystemReport.objects.get_or_create(
            fingerprint=fingerprint, defaults=defaults,
        )
        if not created:
            report.occurrence_count += 1
            report.last_seen = timezone.now()
            # Keep the most recent context.
            report.message = defaults['message'] or report.message
            report.stack_trace = defaults['stack_trace'] or report.stack_trace
            if status_code is not None:
                report.status_code = status_code
            if user is not None:
                report.user = user
                report.user_display = defaults['user_display']
            if extra:
                merged = dict(report.extra or {})
                merged.update(extra)
                report.extra = merged
            # A resolved/ignored issue that happens again is a regression.
            if report.status == 'resolved':
                report.status = 'open'
                report.resolved_by = None
                report.resolved_at = None
            # Never downgrade severity on recurrence.
            if _SEVERITY_RANK.get(defaults['severity'], 0) > _SEVERITY_RANK.get(report.severity, 0):
                report.severity = defaults['severity']
            report.save(update_fields=[
                'occurrence_count', 'last_seen', 'message', 'stack_trace',
                'status_code', 'user', 'user_display', 'extra', 'status',
                'resolved_by', 'resolved_at', 'severity', 'updated_at',
            ])
        return report
    except Exception as exc:  # noqa: BLE001 - reporting must never break the app
        try:
            logger.debug("system_reports: failed to record report: %s", exc)
        except Exception:  # noqa: BLE001
            pass
        return None
    finally:
        _guard.active = False


def categorize_exception(exc, path=''):
    """Best-effort (category, severity) for an unhandled exception."""
    from django.db import DatabaseError
    from django.core.exceptions import PermissionDenied, SuspiciousOperation

    if isinstance(exc, DatabaseError):
        return 'database_error', 'critical'
    if isinstance(exc, SuspiciousOperation):
        return 'security_alert', 'high'
    if isinstance(exc, PermissionDenied):
        return 'auth_failure', 'low'
    if isinstance(exc, (ConnectionError, TimeoutError, OSError)):
        return 'network', 'high'
    if isinstance(exc, MemoryError):
        return 'resource_alert', 'critical'
    if isinstance(exc, (TypeError, ValueError, KeyError, AttributeError, IndexError)):
        category = 'api_error' if str(path).startswith('/api') else 'runtime_error'
        return category, 'high'
    category = 'api_error' if str(path).startswith('/api') else 'exception'
    return category, 'high'


def categorize_log_record(record):
    """
    Map a logging record (ERROR/CRITICAL) to (category, severity).
    Used by the log handler for errors that never surface as HTTP 5xx.
    """
    name = (record.name or '').lower()
    message = str(record.getMessage()).lower()

    if 'email' in name or 'mail' in message:
        return 'email_failure', 'high'
    if 'django.security' in name:
        return 'security_alert', 'high'
    if 'django.db' in name or 'database' in message:
        return 'database_error', 'high'
    if any(k in message for k in ('redis', 'connect call failed', 'connection refused', 'timed out', 'unreachable')):
        return 'network', 'medium'
    if any(k in name for k in ('storage', 'file')) or 'upload' in message:
        return 'file_storage', 'high'
    if any(k in message for k in ('task', 'job', 'cron', 'schedule')):
        return 'background_job', 'high'
    if record.levelno >= logging.CRITICAL:
        return 'crash', 'critical'
    return 'runtime_error', 'high'
