/**
 * Role-Based Access Control (RBAC) configuration
 * ------------------------------------------------
 * Single frontend source of truth for:
 *   - which menu items each role sees (per interface mode)
 *   - which routes each role may open
 *
 * This mirrors the backend policy in
 * `server/apps/authentication/middleware.py`. Hiding a menu item is always
 * backed by a route guard + a server-side API block, so a user can never
 * reach a feature outside their role — even by typing the URL.
 *
 * Interface mode (simple/advanced) only controls *menu visibility*. It never
 * expands a role's permissions: route access is always evaluated against the
 * role's full (advanced) feature set.
 */
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserX,
  GraduationCap,
  Calendar,
  ClipboardCheck,
  Award,
  FileText,
  Inbox,
  FileEdit,
  BarChart3,
  BookOpen,
  UserCheck,
  UserCog,
  Bell,
  Heart,
  MessageSquareWarning,
  FileSearch,
  Globe,
  type LucideIcon,
} from 'lucide-react';

export type AdminRole = 'institute_head' | 'department_head' | 'registrar';
export type InterfaceMode = 'simple' | 'advanced';

export type FeatureId =
  | 'dashboard'
  | 'students_list'
  | 'add_student'
  | 'admissions'
  | 'stipend_eligible'
  | 'departments'
  | 'teachers'
  | 'class_routine'
  | 'attendance_marks'
  | 'board_results'
  | 'discontinued_students'
  | 'alumni'
  | 'alumni_requests'
  | 'documents'
  | 'applications'
  | 'correction_requests'
  | 'signup_requests'
  | 'complaints'
  | 'notices'
  | 'analytics'
  | 'motivation'
  | 'website_manager';

/** "all" means every feature (used by the Principal in Advanced mode). */
type FeatureSet = FeatureId[] | 'all';

export interface MenuItem {
  feature: FeatureId;
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

/**
 * Master menu — every admin module in the app. Roles/modes filter this list.
 */
export const MENU_GROUPS: MenuGroup[] = [
  {
    label: 'Main',
    items: [{ feature: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Students',
    items: [
      { feature: 'students_list', label: 'Students List', path: '/students', icon: Users },
      { feature: 'add_student', label: 'Add Student', path: '/add-student', icon: UserPlus },
      { feature: 'admissions', label: 'Admissions', path: '/admissions', icon: GraduationCap },
      { feature: 'stipend_eligible', label: 'Stipend Eligible', path: '/stipend-eligible', icon: Award },
    ],
  },
  {
    label: 'Academics',
    items: [
      { feature: 'departments', label: 'Departments', path: '/departments', icon: BookOpen },
      { feature: 'teachers', label: 'Teachers', path: '/teachers', icon: UserCheck },
      { feature: 'class_routine', label: 'Class Routine', path: '/class-routine', icon: Calendar },
      { feature: 'attendance_marks', label: 'Attendance & Marks', path: '/attendance-marks', icon: ClipboardCheck },
      { feature: 'board_results', label: 'Board Results', path: '/results', icon: FileSearch },
      { feature: 'notices', label: 'Notices', path: '/notices', icon: Bell },
    ],
  },
  {
    label: 'Profiles & Records',
    items: [
      { feature: 'discontinued_students', label: 'Discontinued Students', path: '/discontinued-students', icon: UserX },
      { feature: 'alumni', label: 'Alumni Directory', path: '/alumni', icon: Award },
      { feature: 'documents', label: 'Documents', path: '/documents', icon: FileText },
    ],
  },
  {
    label: 'Requests',
    items: [
      { feature: 'applications', label: 'Applications', path: '/applications', icon: Inbox },
      { feature: 'alumni_requests', label: 'Alumni Requests', path: '/alumni-requests', icon: GraduationCap },
      { feature: 'correction_requests', label: 'Correction Requests', path: '/correction-requests', icon: FileEdit },
      { feature: 'signup_requests', label: 'Signup Requests', path: '/signup-requests', icon: UserCog },
      { feature: 'complaints', label: 'Complaints', path: '/complaints', icon: MessageSquareWarning },
    ],
  },
  {
    label: 'System',
    items: [
      { feature: 'analytics', label: 'System Reports', path: '/analytics', icon: BarChart3 },
      { feature: 'motivation', label: 'Motivation', path: '/motivation-management', icon: Heart },
    ],
  },
  {
    // Public-website content management. Advanced-mode only (no role lists it
    // in `simple`), and limited to Principal / Department Head / superusers.
    label: 'Website',
    items: [
      { feature: 'website_manager', label: 'Website Manager', path: '/website-manager', icon: Globe },
    ],
  },
];

/** Map each feature to the route prefix(es) that belong to it. */
const FEATURE_ROUTES: Record<FeatureId, string[]> = {
  dashboard: ['/'],
  students_list: ['/students'],
  add_student: ['/add-student'],
  admissions: ['/admissions'],
  stipend_eligible: ['/stipend-eligible'],
  departments: ['/departments'],
  teachers: ['/teachers'],
  class_routine: ['/class-routine'],
  attendance_marks: ['/attendance-marks'],
  board_results: ['/results'],
  discontinued_students: ['/discontinued-students'],
  alumni: ['/alumni'],
  alumni_requests: ['/alumni-requests'],
  documents: ['/documents'],
  applications: ['/applications'],
  correction_requests: ['/correction-requests'],
  signup_requests: ['/signup-requests'],
  complaints: ['/complaints'],
  notices: ['/notices'],
  analytics: ['/analytics'],
  motivation: ['/motivation-management'],
  website_manager: ['/website-manager'],
};

/** Routes that any authenticated admin may open regardless of role. */
const ALWAYS_ALLOWED_ROUTES = ['/settings'];

interface RolePermission {
  label: string;
  simple: FeatureSet;
  advanced: FeatureSet;
}

export const ROLE_PERMISSIONS: Record<AdminRole, RolePermission> = {
  // Principal — super user. Advanced mode unlocks every feature.
  institute_head: {
    label: 'Principal',
    simple: ['dashboard', 'students_list', 'departments', 'teachers', 'applications', 'signup_requests', 'complaints'],
    advanced: 'all',
  },

  department_head: {
    label: 'Department Head',
    simple: ['dashboard', 'departments', 'applications', 'stipend_eligible', 'class_routine', 'discontinued_students', 'notices'],
    advanced: [
      'dashboard',
      'students_list',
      'add_student',
      'admissions',
      'stipend_eligible',
      'departments',
      'teachers',
      'class_routine',
      'board_results',
      'discontinued_students',
      'alumni',
      'alumni_requests',
      'applications',
      'correction_requests',
      'complaints',
      'notices',
      'website_manager',
    ],
  },

  registrar: {
    label: 'Registrar',
    simple: ['dashboard', 'students_list', 'add_student', 'admissions', 'documents', 'applications', 'correction_requests'],
    advanced: [
      'dashboard',
      'students_list',
      'add_student',
      'admissions',
      'notices',
      'board_results',
      'discontinued_students',
      'alumni',
      'alumni_requests',
      'documents',
      'applications',
      'correction_requests',
    ],
  },
};

const ALL_FEATURES: FeatureId[] = MENU_GROUPS.flatMap((g) => g.items.map((i) => i.feature));

/**
 * Normalize an arbitrary backend role/user into a known admin role.
 * Django superusers are treated as the Principal.
 */
export function resolveAdminRole(user?: { role?: string; is_superuser?: boolean } | null): AdminRole {
  if (!user) return 'registrar';
  if (user.is_superuser) return 'institute_head';
  if (user.role === 'institute_head' || user.role === 'department_head' || user.role === 'registrar') {
    return user.role;
  }
  // Unknown/legacy admin role — fall back to the most restrictive admin role.
  return 'registrar';
}

function resolveFeatureSet(set: FeatureSet): FeatureId[] {
  return set === 'all' ? ALL_FEATURES : set;
}

/** Features visible in the sidebar for a role in the given mode. */
export function getVisibleFeatures(role: AdminRole, mode: InterfaceMode): Set<FeatureId> {
  return new Set(resolveFeatureSet(ROLE_PERMISSIONS[role][mode]));
}

/** A role's full permission set (always the Advanced set), mode-independent. */
export function getRoleFeatures(role: AdminRole): Set<FeatureId> {
  return new Set(resolveFeatureSet(ROLE_PERMISSIONS[role].advanced));
}

/** Features whose sidebar visibility is governed by the user's "Alumni" toggle
 *  (Settings -> Appearance) INDEPENDENTLY of simple/advanced mode. */
const ALUMNI_FEATURES: FeatureId[] = ['alumni', 'alumni_requests'];

/** Menu groups filtered for the given role + mode (empty groups removed).
 *
 *  `opts.alumniVisible` controls the Alumni pages on its own: when true they
 *  are shown in BOTH simple and advanced mode (role permitting); when false
 *  they are hidden in both. Interface mode never affects them.
 */
export function getVisibleMenu(
  role: AdminRole,
  mode: InterfaceMode,
  opts?: { alumniVisible?: boolean },
): MenuGroup[] {
  const visible = getVisibleFeatures(role, mode);
  const alumniVisible = opts?.alumniVisible ?? true;
  const roleFeatures = getRoleFeatures(role); // full set, mode-independent
  return MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (ALUMNI_FEATURES.includes(item.feature)) {
        return alumniVisible && roleFeatures.has(item.feature);
      }
      return visible.has(item.feature);
    }),
  })).filter((group) => group.items.length > 0);
}

export function getRoleLabel(role: AdminRole): string {
  return ROLE_PERMISSIONS[role]?.label ?? 'Admin';
}

/**
 * Can this role open the given pathname? Evaluated against the role's full
 * (advanced) feature set — interface mode does not restrict routing.
 */
export function canAccessRoute(role: AdminRole, pathname: string): boolean {
  // Account settings is always reachable (needed to switch interface mode).
  if (ALWAYS_ALLOWED_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true;
  }

  const features = getRoleFeatures(role);

  // Find the feature that owns this route (longest matching prefix wins).
  let matched: { feature: FeatureId; prefix: string } | null = null;
  for (const feature of ALL_FEATURES) {
    for (const prefix of FEATURE_ROUTES[feature]) {
      const isMatch =
        prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(prefix + '/');
      if (isMatch && (!matched || prefix.length > matched.prefix.length)) {
        matched = { feature, prefix };
      }
    }
  }

  // Unknown route (e.g. a 404) — let the router render NotFound.
  if (!matched) return true;

  return features.has(matched.feature);
}
