"""
Logging handler that turns ERROR/CRITICAL log records into System Reports.

This catches problems that never surface as a failed HTTP response: email
delivery failures, background/thread errors, realtime-push failures, storage
problems, etc. Attached via the LOGGING setting in slms_core/settings.py.
"""
import logging
import traceback


class SystemReportLogHandler(logging.Handler):
    """Persist ERROR+ log records as grouped SystemReport rows."""

    # Loggers that are already captured elsewhere (request middleware) or that
    # would cause feedback loops.
    SKIP_PREFIXES = (
        'apps.system_reports',
        'django.request',       # covered by the middleware 5xx capture
        'django.server',
        'django.channels.server',
    )

    def emit(self, record):
        try:
            if record.levelno < logging.ERROR:
                return
            name = record.name or ''
            if any(name.startswith(p) for p in self.SKIP_PREFIXES):
                return

            # Import late: logging is configured before apps are loaded.
            from django.apps import apps as django_apps
            if not django_apps.ready:
                return
            from .services import record_report, categorize_log_record

            message = record.getMessage()
            category, severity = categorize_log_record(record)

            exception_type = ''
            stack = ''
            if record.exc_info and record.exc_info[0] is not None:
                exception_type = record.exc_info[0].__name__
                stack = ''.join(traceback.format_exception(*record.exc_info))

            record_report(
                category=category,
                severity='critical' if record.levelno >= logging.CRITICAL else severity,
                title=(message.splitlines() or ['Logged error'])[0][:255],
                message=message,
                exception_type=exception_type,
                stack_trace=stack,
                extra={'logger': name, 'level': record.levelname,
                       'module': record.module, 'line': record.lineno},
                source='auto_logging',
                fingerprint_parts=['log', name, record.module, record.lineno,
                                   exception_type or (message[:120])],
            )
        except Exception:  # noqa: BLE001 - a log handler must never raise
            pass
