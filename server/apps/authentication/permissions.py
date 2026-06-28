"""
Reusable DRF permission classes for role-based access control.
"""
from rest_framework import permissions

from .models import User


class IsAdminRole(permissions.BasePermission):
    """
    Allow access to admin-panel users.

    Unlike DRF's `IsAdminUser` (which only checks `is_staff`), this permission
    accepts any admin role (Principal / Department Head / Registrar) as well as
    Django superusers. Fine-grained, per-role endpoint restrictions are enforced
    separately by `RoleBasedAccessMiddleware`.
    """

    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.is_staff or user.role in User.ADMIN_ROLES)
        )
