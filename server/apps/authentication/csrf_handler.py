"""
Custom CSRF failure handler for API endpoints
Returns JSON instead of HTML for CSRF failures on API routes
"""
from django.http import JsonResponse


def csrf_failure(request, reason=""):
    """
    Custom CSRF failure handler that returns JSON for API endpoints
    
    Django expects this function signature: (request, reason="")
    """
    # Check if this is an API request
    if request.path.startswith('/api/'):
        return JsonResponse(
            {
                'error': 'CSRF verification failed',
                'detail': reason or 'CSRF token missing or incorrect',
                'message': 'Please ensure you have a valid CSRF token. Try calling /api/auth/csrf/ first.'
            },
            status=403
        )
    
    # For non-API requests, return a simple JSON response
    # (Django admin and other HTML views should handle their own CSRF)
    return JsonResponse(
        {
            'error': 'CSRF verification failed',
            'detail': reason or 'CSRF token missing or incorrect'
        },
        status=403
    )

