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


# Student-side roles that own personal academic records (marks/attendance/docs).
STUDENT_ROLES = ('student', 'captain')


class BlockStudentWrite(permissions.BasePermission):
    """
    Read for any authenticated user; block student/captain from any write.

    For admin-managed resources (e.g. teachers) that the RBAC middleware's
    allow-by-default would otherwise let a logged-in student create / edit /
    delete. Teachers (self-service) and admins keep write access; finer
    object-level checks are left to the view.
    """

    message = 'You do not have permission to modify this resource.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(user, 'role', None) not in STUDENT_ROLES


class StudentSelfReadOnly(permissions.BasePermission):
    """
    Guard for student-record endpoints (marks, attendance).

    Students and captains get READ-ONLY access, and only to their OWN rows (row
    scoping is enforced in each view's get_queryset / custom actions via
    `scoped_student_id`). This prevents a logged-in student from creating,
    editing or deleting grade/attendance records, or reading another student's
    data. Teachers, admins and superusers keep full access; per-role endpoint
    limits are still applied by RoleBasedAccessMiddleware.
    """

    message = 'Students can only view their own records.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if getattr(user, 'role', None) in STUDENT_ROLES:
            return request.method in permissions.SAFE_METHODS
        return True


def scoped_student_id(request, requested_id):
    """
    Return the student id a request is allowed to query.

    Students/captains are pinned to their own linked student profile
    (`related_profile_id`) regardless of the id they ask for — this closes the
    IDOR where a logged-in student reads another student's records by passing a
    different id. Everyone else (teachers/admins) gets the id they requested.
    """
    user = request.user
    if getattr(user, 'role', None) in STUDENT_ROLES:
        pid = getattr(user, 'related_profile_id', None)
        return str(pid) if pid else None
    return requested_id
