"""
Middleware for capturing request context in activity logs
"""
from threading import local
from typing import Any
import uuid

from .models import ActivityLog

_thread_locals = local()


def get_current_request():
    """Get the current request from thread local storage"""
    return getattr(_thread_locals, 'request', None)


def get_current_user():
    """Get the current user from thread local storage"""
    request = get_current_request()
    if request and hasattr(request, 'user'):
        return request.user
    return None


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class ActivityLogMiddleware:
    """Middleware to capture request context for activity logging"""

    WRITE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
    ACTION_SEGMENTS = {'approve', 'reject', 'login', 'logout'}
    EXCLUDED_PATH_PREFIXES = (
        '/admin/',
        '/api/activity-logs/',
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def _sanitize_for_json(self, value: Any):
        """Convert arbitrary request payload values to JSON-safe types."""
        if value is None or isinstance(value, (str, int, float, bool)):
            return value

        if isinstance(value, (list, tuple, set)):
            return [self._sanitize_for_json(item) for item in value]

        if isinstance(value, dict):
            return {str(key): self._sanitize_for_json(val) for key, val in value.items()}

        # Uploaded files and objects
        if hasattr(value, 'name'):
            return str(value.name)

        return str(value)

    def _get_request_data(self, request):
        """Safely extract request body data for audit context."""
        try:
            data = getattr(request, 'data', None)
        except Exception:
            data = None

        if data is None:
            return {}

        try:
            # QueryDict style payloads
            if hasattr(data, 'lists'):
                normalized = {}
                for key, values in data.lists():
                    if len(values) == 1:
                        normalized[key] = values[0]
                    else:
                        normalized[key] = values
                data = normalized
            elif hasattr(data, 'dict') and not isinstance(data, dict):
                data = data.dict()
        except Exception:
            return {}

        if not isinstance(data, dict):
            return {}

        sanitized = {}
        for key, value in data.items():
            key_lower = str(key).lower()
            if 'password' in key_lower:
                sanitized[str(key)] = '***'
            else:
                sanitized[str(key)] = self._sanitize_for_json(value)

        return sanitized

    def _split_path(self, request):
        return [segment for segment in request.path.strip('/').split('/') if segment]

    def _infer_action(self, request, segments):
        lower_segments = [segment.lower() for segment in segments]
        if 'approve' in lower_segments:
            return 'approve'
        if 'reject' in lower_segments:
            return 'reject'
        if 'login' in lower_segments:
            return 'login'
        if 'logout' in lower_segments:
            return 'logout'

        method = request.method.upper()
        if method == 'POST':
            return 'create'
        if method in {'PUT', 'PATCH'}:
            return 'update'
        if method == 'DELETE':
            return 'delete'
        return None

    def _to_entity_type(self, segment):
        """Convert url segment to readable entity label."""
        if not segment:
            return 'System'
        normalized = segment.replace('-', ' ').replace('_', ' ').strip()
        words = [word.capitalize() for word in normalized.split() if word]
        if not words:
            return 'System'
        entity = ''.join(words)
        if entity.endswith('s') and len(entity) > 1:
            entity = entity[:-1]
        return entity

    def _is_identifier(self, segment):
        if not segment:
            return False
        try:
            uuid.UUID(str(segment))
            return True
        except (ValueError, TypeError):
            pass

        return str(segment).isdigit()

    def _extract_entity(self, request, segments):
        """
        Determine entity type and entity id from request route.
        Supports routes such as:
        - /api/admissions/{id}/approve/
        - /api/teacher-requests/signup-requests/{id}/approve/
        - /api/class-routines/bulk-update/
        """
        lower_segments = [segment.lower() for segment in segments]

        # Drop leading API segment if present.
        if lower_segments and lower_segments[0] == 'api':
            segments = segments[1:]
            lower_segments = lower_segments[1:]

        if not segments:
            return 'System', 'global'

        excluded_tokens = self.ACTION_SEGMENTS.union({
            'bulk-update',
            'my-routine',
            'search',
            'export',
            'csrf',
        })

        # Prefer a specific nested resource name when available.
        candidates = [segment for segment in segments if segment.lower() not in excluded_tokens]
        non_identifier_candidates = [segment for segment in candidates if not self._is_identifier(segment)]
        if not candidates:
            entity_type = 'System'
        elif len(non_identifier_candidates) >= 2 and non_identifier_candidates[0].lower() == 'auth':
            entity_type = self._to_entity_type(non_identifier_candidates[-1])
        else:
            base_segment = non_identifier_candidates[0] if non_identifier_candidates else candidates[0]
            entity_type = self._to_entity_type(base_segment)

        # Try to resolve entity id from router kwargs.
        entity_id = None
        resolver_match = getattr(request, 'resolver_match', None)
        if resolver_match and getattr(resolver_match, 'kwargs', None):
            for key in ('pk', 'id', 'request_id'):
                value = resolver_match.kwargs.get(key)
                if value:
                    entity_id = str(value)
                    break

        # Fallback: pick uuid-like segment in path.
        if not entity_id:
            for segment in segments:
                if segment.lower() in excluded_tokens:
                    continue
                try:
                    uuid.UUID(str(segment))
                    entity_id = segment
                    break
                except (ValueError, TypeError):
                    continue

        if not entity_id:
            entity_id = 'bulk'

        return entity_type, entity_id

    def _extract_response_id(self, response):
        """Try reading object id from API response payload."""
        data = getattr(response, 'data', None)
        if not isinstance(data, dict):
            return None

        direct_keys = ('id', 'uuid', 'pk', 'student_id', 'teacher_id', 'application_id')
        for key in direct_keys:
            value = data.get(key)
            if value:
                return str(value)

        for parent_key in ('admission', 'request', 'user', 'data'):
            nested = data.get(parent_key)
            if isinstance(nested, dict):
                for key in direct_keys:
                    value = nested.get(key)
                    if value:
                        return str(value)

        return None

    def _should_log(self, request, response, actor_user):
        if request.method.upper() not in self.WRITE_METHODS:
            return False

        if not request.path.startswith('/api/'):
            return False

        if any(request.path.startswith(prefix) for prefix in self.EXCLUDED_PATH_PREFIXES):
            return False

        if response.status_code < 200 or response.status_code >= 300:
            return False

        if not actor_user or not actor_user.is_authenticated:
            return False

        return True

    def __call__(self, request):
        # Store request in thread local storage
        _thread_locals.request = request
        actor_user = getattr(request, 'user', None)
        if not actor_user or not actor_user.is_authenticated:
            actor_user = None

        response = self.get_response(request)

        try:
            if self._should_log(request, response, actor_user):
                segments = self._split_path(request)
                action_type = self._infer_action(request, segments)
                if action_type:
                    entity_type, entity_id = self._extract_entity(request, segments)
                    response_entity_id = self._extract_response_id(response)
                    if response_entity_id and entity_id == 'bulk':
                        entity_id = response_entity_id

                    request_data = self._get_request_data(request)
                    description = (
                        f"{actor_user.username} performed {action_type} on "
                        f"{entity_type} via {request.method.upper()} {request.path}"
                    )
                    ActivityLog.objects.create(
                        user=actor_user,
                        action_type=action_type,
                        entity_type=entity_type,
                        entity_id=str(entity_id),
                        description=description,
                        changes={
                            'path': request.path,
                            'method': request.method.upper(),
                            'status_code': response.status_code,
                            'request_data': request_data,
                        },
                        ip_address=get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT'),
                    )
        except Exception:
            # Activity logging should never break user-facing API responses.
            pass

        # Clean up thread local storage
        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request

        return response
