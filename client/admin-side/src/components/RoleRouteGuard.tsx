import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute, resolveAdminRole } from '@/config/permissions';

/**
 * Blocks routes that fall outside the current user's role permissions, even if
 * the URL is entered manually. Evaluated against the role's full permission set
 * (interface mode only affects menu visibility, not routing).
 */
export function RoleRouteGuard() {
  const { user } = useAuth();
  const location = useLocation();
  const role = resolveAdminRole(user);

  if (!canAccessRoute(role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
