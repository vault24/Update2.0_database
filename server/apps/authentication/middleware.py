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
            '/api/teachers/requests/': ['registrar', 'institute_head'],
            '/api/activity-logs/': ['registrar', 'institute_head'],
            '/api/analytics/': ['registrar', 'institute_head'],
            '/api/settings/': ['registrar', 'institute_head'],
            
            # Teacher and Student endpoints
            '/api/attendance/': ['student', 'teacher', 'captain', 'registrar', 'institute_head'],
            '/api/marks/': ['student', 'teacher', 'captain', 'registrar', 'institute_head'],
            '/api/documents/': ['student', 'teacher', 'captain', 'registrar', 'institute_head'],
            
            # Student/Captain endpoints
            '/api/applications/': ['student', 'captain', 'registrar', 'institute_head'],
            '/api/correction-requests/': ['student', 'teacher', 'captain', 'registrar', 'institute_head'],
        }
    
    def __call__(self, request):
        # Skip middleware for non-authenticated requests
        if not request.user.is_authenticated:
            return self.get_response(request)
        
        # Skip middleware for superusers
        if request.user.is_superuser:
            return self.get_response(request)
        
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Middleware check - Path: {request.path}, Method: {request.method}, User: {request.user.username}, Role: {request.user.role}")
        
        # Special handling for admissions endpoint
        # Allow students/captains to POST (submit) and GET their own admission/draft
        # Allow admins to access all admission endpoints
        if request.path.startswith('/api/admissions/'):
            logger.info(f"Admissions endpoint accessed by {request.user.username} with role {request.user.role}")

            # Allow admins full access
            if request.user.role in ['registrar', 'institute_head']:
                logger.info(f"Admin access granted to {request.user.username}")
                return self.get_response(request)

            # Student/captain access rules
            if request.user.role in ['student', 'captain']:
                # Submit application
                if request.method == 'POST' and request.path == '/api/admissions/':
                    logger.info(f"Student POST access granted to {request.user.username}")
                    return self.get_response(request)

                # View own submitted admission (support both dash and underscore)
                if request.path in ['/api/admissions/my-admission/', '/api/admissions/my_admission/']:
                    logger.info(f"Student my-admission access granted to {request.user.username}")
                    return self.get_response(request)

                # Draft endpoints
                if request.path in [
                    '/api/admissions/save-draft/',
                    '/api/admissions/get-draft/',
                    '/api/admissions/clear-draft/',
                    '/api/admissions/upload-documents/',
                ]:
                    logger.info(f"Student draft access granted to {request.user.username} on {request.method} {request.path}")
                    return self.get_response(request)

            # If none of the above conditions matched, deny access
            logger.warning(f"Access denied to {request.user.username} with role {request.user.role}")
            return JsonResponse({
                'error': 'Access denied',
                'detail': f'You do not have permission to access this resource. Your role: {request.user.role}'
            }, status=403)
        
        # Check access rules for other endpoints
        path = request.path
        for pattern, allowed_roles in self.access_rules.items():
            if path.startswith(pattern):
                if request.user.role not in allowed_roles:
                    return JsonResponse({
                        'error': 'Access denied',
                        'detail': 'You do not have permission to access this resource'
                    }, status=403)
        
        return self.get_response(request)
