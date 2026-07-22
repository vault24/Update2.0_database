"""
Authentication Middleware
"""
from django.http import JsonResponse


# ---------------------------------------------------------------------------
# Role-Based Access Control (RBAC) policy
#
# This is the single backend source of truth for which API endpoints each admin
# role may reach. It mirrors the frontend permission config so that hiding a
# menu item is always backed by a real server-side block: a user can never
# access a feature outside their role by typing a URL or calling the API
# directly.
#
# `institute_head` is the Principal (super user) and has unrestricted access.
# Interface mode (simple/advanced) is purely a UI preference and is NOT enforced
# here -- the backend always allows a role's full (advanced) permission set.
# ---------------------------------------------------------------------------

# Endpoints every authenticated admin may reach (own account, dashboard,
# notifications and read-only reference data needed to render allowed pages).
SHARED_ADMIN_PREFIXES = (
    '/api/auth/',
    '/api/dashboard/',
    '/api/notifications/',
    '/api/badges/',        # per-user sidebar unread badges (see notifications.badge_views)
)

# Reference endpoints all admins may READ (GET) but not modify.
SHARED_ADMIN_READONLY_PREFIXES = (
    '/api/settings/',      # institute info shown on Settings page
    '/api/departments/',   # needed for student/admission form dropdowns
)

# Per-role allowed prefixes (a role's full / advanced permission set).
# `full`      -> any HTTP method allowed
# `read_only` -> only safe (GET/HEAD/OPTIONS) methods allowed
ROLE_API_POLICY = {
    'registrar': {
        'full': (
            '/api/students/',
            '/api/admissions/',
            '/api/applications/',
            '/api/document-templates/',
            '/api/alumni/',
            '/api/documents/',
            '/api/correction-requests/',
            '/api/admin/notices/',
            # Full attendance + marks access (row scoping in the views is a
            # no-op for this role — registrar/Principal see everything).
            '/api/attendance/',
            '/api/marks/',
            # Board result imports + roll search (apps.results).
            '/api/results/',
            # Exam routine imports (apps.routines).
            '/api/routines/',
        ),
        'read_only': (),
    },
    'department_head': {
        'full': (
            '/api/students/',
            '/api/admissions/',
            '/api/applications/',
            '/api/document-templates/',
            '/api/documents/',       # view/manage student documents in profiles
            '/api/alumni/',
            '/api/teachers/',
            '/api/teacher-requests/',
            '/api/departments/',
            '/api/class-routines/',
            '/api/stipends/',
            '/api/complaints/',
            '/api/correction-requests/',
            '/api/admin/notices/',
        ),
        # Read-only oversight of their own department's attendance and marks.
        # The Attendance/Marks viewsets scope rows to the head's department.
        # Board results: heads may search rolls and review import history,
        # but only the registrar/Principal may import or delete.
        'read_only': (
            '/api/attendance/',
            '/api/marks/',
            '/api/results/',
            '/api/routines/',
        ),
    },
}

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')


class RoleBasedAccessMiddleware:
    """
    Middleware to enforce role-based access control
    """

    def __init__(self, get_response):
        self.get_response = get_response

        # Legacy access rules for non-admin roles (student / teacher / captain).
        # Format: {url_pattern: [allowed_roles]}
        self.access_rules = {
            # Teacher and Student endpoints
            '/api/attendance/': ['student', 'teacher', 'captain'],
            '/api/marks/': ['student', 'teacher', 'captain'],
            '/api/documents/': ['student', 'teacher', 'captain'],

            # Student/Captain endpoints
            '/api/applications/': ['student', 'captain'],
            '/api/correction-requests/': ['student', 'teacher', 'captain'],
        }

    def __call__(self, request):
        path = request.path

        # Allow public GET to settings (institute info shown before login).
        public_get_endpoints = ['/api/settings/']
        if (not request.user.is_authenticated and path in public_get_endpoints
                and request.method == 'GET'):
            return self.get_response(request)

        # Skip middleware for non-authenticated requests.
        if not request.user.is_authenticated:
            return self.get_response(request)

        # Principal / Django superuser -> unrestricted access.
        if request.user.is_superuser or request.user.role == 'institute_head':
            return self.get_response(request)

        role = request.user.role

        # ------------------------------------------------------------------
        # Admin roles (registrar, department_head): deny-by-default policy.
        # ------------------------------------------------------------------
        if role in ROLE_API_POLICY:
            return self._handle_admin_request(request, role, path)

        # ------------------------------------------------------------------
        # Non-admin roles (student / teacher / captain): legacy rules.
        # ------------------------------------------------------------------
        return self._handle_non_admin_request(request, path)

    def _denied(self, role):
        return JsonResponse({
            'error': 'Access denied',
            'detail': f'You do not have permission to access this resource. '
                      f'Your role: {role}'
        }, status=403)

    def _handle_admin_request(self, request, role, path):
        # Only guard API routes; let everything else (e.g. /files/) through.
        if not path.startswith('/api/'):
            return self.get_response(request)

        policy = ROLE_API_POLICY[role]

        # Always-allowed shared endpoints.
        if path.startswith(SHARED_ADMIN_PREFIXES):
            return self.get_response(request)

        # Shared read-only reference endpoints.
        if path.startswith(SHARED_ADMIN_READONLY_PREFIXES):
            if request.method in SAFE_METHODS:
                return self.get_response(request)
            return self._denied(role)

        # Role's full-access prefixes.
        if path.startswith(policy['full']):
            return self.get_response(request)

        # Role's read-only prefixes.
        if path.startswith(policy['read_only']):
            if request.method in SAFE_METHODS:
                return self.get_response(request)
            return self._denied(role)

        # Anything else under /api/ is outside this role's permissions.
        return self._denied(role)

    def _handle_non_admin_request(self, request, path):
        role = request.user.role

        # Special handling for admissions endpoint for students/captains.
        if path.startswith('/api/admissions/'):
            # Admission module settings (enabled flag + document requirements)
            # are readable by every authenticated user: the student sidebar and
            # the admission form both need them (writes stay admin-only, which
            # the DRF view enforces).
            if path == '/api/admissions/settings/' and request.method in ('GET', 'HEAD', 'OPTIONS'):
                return self.get_response(request)

            if role in ['student', 'captain']:
                # Submit application
                if request.method == 'POST' and path == '/api/admissions/':
                    return self.get_response(request)

                # View own submitted admission (dash or underscore form)
                if path in ['/api/admissions/my-admission/',
                            '/api/admissions/my_admission/']:
                    return self.get_response(request)

                # Draft endpoints and reapply
                if path in [
                    '/api/admissions/save-draft/',
                    '/api/admissions/get-draft/',
                    '/api/admissions/clear-draft/',
                    '/api/admissions/upload-documents/',
                    '/api/admissions/reapply/',
                    '/api/admissions/check-existing/',
                ]:
                    return self.get_response(request)

            return self._denied(role)

        # Check legacy access rules for other endpoints.
        for pattern, allowed_roles in self.access_rules.items():
            if path.startswith(pattern):
                if role not in allowed_roles:
                    return JsonResponse({
                        'error': 'Access denied',
                        'detail': 'You do not have permission to access this resource'
                    }, status=403)

        return self.get_response(request)
