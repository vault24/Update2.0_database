"""
Lightweight system health snapshot: database, cache, realtime (Redis), CPU,
memory and disk. Uses psutil when available and degrades gracefully when not.
Sampling also raises resource_alert / network reports when thresholds are hit.
"""
import shutil
import time

from django.conf import settings

from .services import record_report

CPU_ALERT_PERCENT = getattr(settings, 'SYSTEM_REPORTS_CPU_ALERT_PERCENT', 90)
MEMORY_ALERT_PERCENT = getattr(settings, 'SYSTEM_REPORTS_MEMORY_ALERT_PERCENT', 90)
DISK_ALERT_PERCENT = getattr(settings, 'SYSTEM_REPORTS_DISK_ALERT_PERCENT', 90)

try:
    import psutil
except ImportError:  # pragma: no cover - optional dependency
    psutil = None


def _check_database():
    from django.db import connection
    start = time.monotonic()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        return {'ok': True, 'latency_ms': round((time.monotonic() - start) * 1000, 1)}
    except Exception as exc:  # noqa: BLE001
        record_report(
            category='database_error', severity='critical',
            title='Database connectivity check failed',
            message=str(exc), source='health_monitor',
            fingerprint_parts=['health', 'database'],
        )
        return {'ok': False, 'error': str(exc)[:300]}


def _check_cache():
    from django.core.cache import cache
    try:
        cache.set('system_reports_health', '1', 10)
        return {'ok': cache.get('system_reports_health') == '1'}
    except Exception as exc:  # noqa: BLE001
        return {'ok': False, 'error': str(exc)[:300]}


def _check_realtime():
    """Redis channel layer used for websocket notifications."""
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        layer = get_channel_layer()
        if layer is None:
            return {'ok': False, 'error': 'No channel layer configured'}
        async_to_sync(layer.send)('system-reports-health', {'type': 'health.ping'})
        return {'ok': True}
    except Exception as exc:  # noqa: BLE001
        record_report(
            category='network', severity='medium',
            title='Realtime (Redis) channel layer unreachable',
            message=str(exc), source='health_monitor',
            fingerprint_parts=['health', 'redis'],
        )
        return {'ok': False, 'error': str(exc)[:300]}


def _resources():
    info = {}
    if psutil is not None:
        try:
            info['cpu_percent'] = psutil.cpu_percent(interval=0.3)
            mem = psutil.virtual_memory()
            info['memory_percent'] = mem.percent
            info['memory_used_mb'] = round(mem.used / (1024 * 1024))
            info['memory_total_mb'] = round(mem.total / (1024 * 1024))
        except Exception:  # noqa: BLE001
            pass
    try:
        usage = shutil.disk_usage(str(getattr(settings, 'BASE_DIR', '.')))
        info['disk_percent'] = round(usage.used / usage.total * 100, 1)
        info['disk_free_gb'] = round(usage.free / (1024 ** 3), 1)
        info['disk_total_gb'] = round(usage.total / (1024 ** 3), 1)
    except Exception:  # noqa: BLE001
        pass

    # Raise grouped alerts when thresholds are crossed.
    if info.get('cpu_percent', 0) >= CPU_ALERT_PERCENT:
        record_report(
            category='resource_alert', severity='high',
            title=f"High CPU usage: {info['cpu_percent']:.0f}%",
            message=f"CPU usage measured at {info['cpu_percent']:.0f}% (alert threshold {CPU_ALERT_PERCENT}%).",
            extra={'cpu_percent': info['cpu_percent']}, source='health_monitor',
            fingerprint_parts=['resource', 'cpu'],
        )
    if info.get('memory_percent', 0) >= MEMORY_ALERT_PERCENT:
        record_report(
            category='resource_alert', severity='high',
            title=f"High memory usage: {info['memory_percent']:.0f}%",
            message=f"Memory usage measured at {info['memory_percent']:.0f}% (alert threshold {MEMORY_ALERT_PERCENT}%).",
            extra={'memory_percent': info['memory_percent']}, source='health_monitor',
            fingerprint_parts=['resource', 'memory'],
        )
    if info.get('disk_percent', 0) >= DISK_ALERT_PERCENT:
        record_report(
            category='resource_alert', severity='high',
            title=f"Low disk space: {info['disk_percent']:.0f}% used",
            message=f"Disk usage measured at {info['disk_percent']:.0f}% (alert threshold {DISK_ALERT_PERCENT}%).",
            extra={'disk_percent': info['disk_percent']}, source='health_monitor',
            fingerprint_parts=['resource', 'disk'],
        )
    return info


def health_snapshot():
    """Full health snapshot dict for the dashboard."""
    return {
        'database': _check_database(),
        'cache': _check_cache(),
        'realtime': _check_realtime(),
        'resources': _resources(),
        'psutil_available': psutil is not None,
        'checked_at': time.time(),
    }
