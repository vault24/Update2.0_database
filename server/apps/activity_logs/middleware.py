"""
Middleware for capturing request context in activity logs
"""
from threading import local

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
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Store request in thread local storage
        _thread_locals.request = request
        
        response = self.get_response(request)
        
        # Clean up thread local storage
        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request
        
        return response
