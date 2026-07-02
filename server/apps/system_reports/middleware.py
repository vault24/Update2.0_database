"""
Automatic capture of request-level problems:

  - unhandled exceptions (with full stack trace)
  - 5xx server/API errors
  - repeated 401/403 authentication & authorization failures
  - slow requests (performance issues)
  - slow database queries (per-query timing via execute_wrapper)

Everything is grouped by fingerprint and recorded best-effort — capture can
never affect the response returned to the user.
"""
import time
import traceback

from django.conf import settings
from django.db import connection

from .services import record_report, categorize_exception, make_fingerprint

# Thresholds (seconds); overridable from settings.
SLOW_REQUEST_SECONDS = getattr(settings, 'SYSTEM_REPORTS_SLOW_REQUEST_SECONDS', 3.0)
SLOW_QUERY_SECONDS = getattr(settings, 'SYSTEM_REPORTS_SLOW_QUERY_SECONDS', 1.0)

# Paths never captured (self-reporting loops, static assets, health polling).
_IGNORED_PREFIXES = (
    '/api/system-reports',
    '/static/', '/media/', '/files/', '/favicon',
)

# 401s on these auth endpoints are everyday noise (wrong password already gets
# a dedicated login-failure report from signals).
_AUTH_NOISE_PATHS = ('/api/auth/login', '/api/auth/token')


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class SystemReportMiddleware:
    """Records request problems into SystemReport rows."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if any(request.path.startswith(p) for p in _IGNORED_PREFIXES):
            return self.get_response(request)

        slow_queries = []

        def timing_wrapper(execute, sql, params, many, context):
            start = time.monotonic()
            try:
                return execute(sql, params, many, context)
            finally:
                elapsed = time.monotonic() - start
                if elapsed >= SLOW_QUERY_SECONDS and len(slow_queries) < 5:
                    slow_queries.append((sql, elapsed))

        started = time.monotonic()
        with connection.execute_wrapper(timing_wrapper):
            response = self.get_response(request)
        duration = time.monotonic() - started

        try:
            self._capture_response(request, response, duration, slow_queries)
        except Exception:  # noqa: BLE001 - capture must never break the response
            pass
        return response

    # ------------------------------------------------------------------
    def _capture_response(self, request, response, duration, slow_queries):
        status = getattr(response, 'status_code', 200)
        user = getattr(request, 'user', None)
        ip = _client_ip(request)

        # 5xx — server / API errors (unhandled exceptions are also recorded by
        # process_exception with a stack trace; this catches handled 500s).
        if status >= 500:
            category = 'api_error' if request.path.startswith('/api') else 'server_error'
            record_report(
                category=category,
                severity='critical' if status == 500 else 'high',
                title=f"HTTP {status} on {request.method} {request.path}",
                message=f"The server responded with status {status}.",
                path=request.path, method=request.method, status_code=status,
                user=user, ip_address=ip,
                source='auto_middleware',
                fingerprint_parts=['http5xx', status, request.method, request.path],
            )

        # 401 / 403 — authentication & authorization failures (grouped per path).
        elif status in (401, 403) and request.path.startswith('/api') \
                and not any(request.path.startswith(p) for p in _AUTH_NOISE_PATHS):
            record_report(
                category='auth_failure',
                severity='low',
                title=f"HTTP {status} {'unauthorized' if status == 401 else 'forbidden'} on {request.path}",
                message=f"Requests to {request.method} {request.path} were denied with status {status}.",
                path=request.path, method=request.method, status_code=status,
                user=user, ip_address=ip,
                source='auto_middleware',
                fingerprint_parts=['auth', status, request.path],
            )

        # Slow request — performance issue.
        if duration >= SLOW_REQUEST_SECONDS:
            record_report(
                category='performance',
                severity='medium' if duration < SLOW_REQUEST_SECONDS * 2 else 'high',
                title=f"Slow request: {request.method} {request.path}",
                message=f"Request took {duration:.2f}s (threshold {SLOW_REQUEST_SECONDS:.1f}s).",
                path=request.path, method=request.method, status_code=status,
                user=user, ip_address=ip,
                extra={'duration_seconds': round(duration, 3)},
                source='auto_middleware',
                fingerprint_parts=['slow_request', request.method, request.path],
            )

        # Slow database queries.
        for sql, elapsed in slow_queries:
            sql_head = ' '.join(str(sql).split())[:300]
            record_report(
                category='slow_query',
                severity='medium' if elapsed < SLOW_QUERY_SECONDS * 3 else 'high',
                title=f"Slow query ({elapsed:.2f}s) during {request.method} {request.path}",
                message=sql_head,
                path=request.path, method=request.method,
                user=user, ip_address=ip,
                extra={'query_seconds': round(elapsed, 3), 'sql': sql_head},
                source='auto_middleware',
                fingerprint_parts=['slow_query', sql_head[:150]],
            )

    # ------------------------------------------------------------------
    def process_exception(self, request, exception):
        """Unhandled exception — record with full stack trace, then let
        Django's normal 500 handling continue (return None)."""
        try:
            if any(request.path.startswith(p) for p in _IGNORED_PREFIXES):
                return None
            category, severity = categorize_exception(exception, request.path)
            stack = traceback.format_exc()
            record_report(
                category=category,
                severity=severity,
                title=f"{type(exception).__name__}: {str(exception)[:160] or 'Unhandled exception'}",
                message=str(exception),
                exception_type=type(exception).__name__,
                stack_trace=stack,
                path=request.path, method=request.method, status_code=500,
                user=getattr(request, 'user', None),
                ip_address=_client_ip(request),
                source='auto_middleware',
                fingerprint=make_fingerprint(
                    'exception', type(exception).__name__, request.path,
                    # group by the deepest frame of our own code when possible
                    next((f"{f.filename}:{f.lineno}" for f in
                          reversed(traceback.extract_tb(exception.__traceback__))
                          if 'site-packages' not in f.filename.replace('\\', '/')), ''),
                ),
            )
        except Exception:  # noqa: BLE001
            pass
        return None
