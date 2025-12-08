"""
Authentication Middleware
"""
from django.http import JsonResponse
from django.urls import resolve


class RoleBasedAccessMiddleware:
    """
    Middleware to enforce role-based access control
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Define role-based access rules
        # Format: {url_pattern: [allowed_roles]}
        self.access_rules = {
            # Admin-only endpoints
            '/api/admissions/': ['registrar', 'institute_head'],
            '/api/teachers/requests/': ['registrar', 'institute_head'],
            '/api/activity-logs/': ['registrar', 'institute_head'],
            '/api/analytics/': ['registrar', 'institute_head'],
            '/api/settings/': ['registrar', 'institute_head'],
            
            # Teacher endpoints
            '/api/attendance/': ['teacher', 'captain', 'registrar', 'institute_head'],
            '/api/marks/': ['teacher', 'registrar', 'institute_head'],
            
            # Student/Captain endpoints
            '/api/applications/': ['student', 'captain', 'registrar', 'institute_head'],
            '/api/correction-requests/': ['student', 'captain', 'registrar', 'institute_head'],
        }
    
    def __call__(self, request):
        # Skip middleware for non-authenticated requests
        if not request.user.is_authenticated:
            return self.get_response(request)
        
        # Skip middleware for superusers
        if request.user.is_superuser:
            return self.get_response(request)
        
        # Check access rules
        path = request.path
        for pattern, allowed_roles in self.access_rules.items():
            if path.startswith(pattern):
                if request.user.role not in allowed_roles:
                    return JsonResponse({
                        'error': 'Access denied',
                        'detail': 'You do not have permission to access this resource'
                    }, status=403)
        
        return self.get_response(request)
