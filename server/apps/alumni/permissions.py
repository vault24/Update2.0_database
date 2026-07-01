"""
Alumni permissions.
"""
from rest_framework.permissions import BasePermission


def user_can_manage_alumni(user):
    """
    True when `user` is allowed to perform admin alumni tasks. Shared by the
    DRF permission class and the inline checks so every alumni admin action
    enforces exactly the same rule.
    """
    if not (user and getattr(user, 'is_authenticated', False)):
        return False
    if user.is_superuser or getattr(user, 'is_staff', False):
        return True
    can_admin = getattr(user, 'can_access_admin_portal', None)
    if callable(can_admin):
        return bool(can_admin())
    admin_roles = getattr(user, 'ADMIN_ROLES', ('registrar', 'department_head', 'institute_head'))
    return getattr(user, 'role', None) in admin_roles


class CanManageAlumni(BasePermission):
    """
    Allow full alumni management to anyone who can operate the admin portal.

    This is the single source of truth for "who may manage alumni" so every
    admin-only alumni endpoint behaves identically. It intentionally accepts:
      - Django superusers,
      - staff accounts (`is_staff`), and
      - the admin-portal roles (registrar / department_head / institute_head),
    which is exactly the set the admin panel itself admits (principal =
    institute_head, plus department heads and registrars).
    """
    message = 'Alumni management requires an admin-portal account (principal, department head or registrar).'

    def has_permission(self, request, view):
        return user_can_manage_alumni(request.user)

    # Object-level checks reuse the same rule.
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
