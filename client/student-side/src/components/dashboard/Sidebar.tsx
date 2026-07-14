import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  ClipboardCheck,
  BarChart3,
  FolderOpen,
  Send,
  LogOut,
  GraduationCap,
  ChevronLeft,
  Menu,
  Users,
  UserCheck,
  Phone,
  BookOpen,
  Bell,
  MessageCircle,
  Video,
  Shield,
  Sparkles,
  ChevronDown,
  X,
  Settings,
  ArrowRightLeft,
  ClipboardList,
  Mail,
} from 'lucide-react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import ProfileAvatar from '@/components/ProfileAvatar';
import { SwitchAccountDialog, canSwitchAccount } from '@/components/account/SwitchAccountDialog';
import { NavBadge } from '@/components/ui/nav-badge';
import { useBadges, PATH_TO_MODULE } from '@/contexts/BadgeContext';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: UserRole[];
}

// Main navigation items
const mainMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['student', 'captain', 'teacher', 'alumni'] },
  { icon: Bell, label: 'Notices & Updates', path: '/dashboard/notices', roles: ['student', 'captain', 'teacher', 'alumni'] },
  { icon: FileText, label: 'Admission', path: '/dashboard/admission', roles: ['student', 'captain'] },
  { icon: Calendar, label: 'Class Routine', path: '/dashboard/routine', roles: ['student', 'captain', 'teacher'] },
  { icon: ClipboardCheck, label: 'Attendance', path: '/dashboard/attendance', roles: ['student', 'captain'] },
  { icon: BarChart3, label: 'Marks', path: '/dashboard/marks', roles: ['student', 'captain'] },
  { icon: FolderOpen, label: 'Documents', path: '/dashboard/documents', roles: ['student', 'captain'] },
  { icon: Shield, label: 'Complaints', path: '/dashboard/complaints', roles: ['student', 'captain', 'teacher'] },
  { icon: Send, label: 'Applications', path: '/dashboard/applications', roles: ['student', 'captain'] },
  // Captain-specific
  { icon: UserCheck, label: 'Add Attendance', path: '/dashboard/add-attendance', roles: ['captain'] },
  { icon: Phone, label: 'Teacher Contacts', path: '/dashboard/teacher-contacts', roles: ['captain'] },
  // Teacher-specific
  { icon: Users, label: 'Student List', path: '/dashboard/students', roles: ['teacher'] },
  { icon: ClipboardCheck, label: 'Manage Attendance', path: '/dashboard/teacher-attendance', roles: ['teacher'] },
  { icon: BookOpen, label: 'Manage Marks', path: '/dashboard/manage-marks', roles: ['teacher'] },
  { icon: Mail, label: 'Class Emails', path: '/dashboard/class-email', roles: ['teacher'] },
  { icon: Shield, label: 'Allegations', path: '/dashboard/allegations', roles: ['teacher'] },
];

// "Upcoming" group items
const upcomingMenuItems: MenuItem[] = [
  { icon: BookOpen, label: 'Learning Hub', path: '/dashboard/learning-hub', roles: ['student', 'captain', 'teacher'] },
  { icon: Video, label: 'Live Classes', path: '/dashboard/live-classes', roles: ['student', 'captain', 'teacher'] },
  { icon: MessageCircle, label: 'Messages', path: '/dashboard/messages', roles: ['student', 'captain', 'teacher'] },
  { icon: Shield, label: 'My Allegations', path: '/dashboard/my-allegations', roles: ['student', 'captain'] },
];

// Dedicated menu for alumni accounts — no Admission / Class Routine / Attendance,
// and no "Explore" section. Everything else an alumnus may need is kept.
const alumniMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['alumni'] },
  { icon: GraduationCap, label: 'Alumni Profile', path: '/dashboard/alumni-profile', roles: ['alumni'] },
  { icon: Users, label: 'Alumni Directory', path: '/dashboard/alumni-directory', roles: ['alumni'] },
  { icon: Bell, label: 'Notices & Updates', path: '/dashboard/notices', roles: ['alumni'] },
  { icon: BarChart3, label: 'Marks', path: '/dashboard/marks', roles: ['alumni'] },
  { icon: FolderOpen, label: 'Documents', path: '/dashboard/documents', roles: ['alumni'] },
  { icon: Send, label: 'Applications', path: '/dashboard/applications', roles: ['alumni'] },
  { icon: Shield, label: 'Complaints', path: '/dashboard/complaints', roles: ['alumni'] },
  { icon: MessageCircle, label: 'Messages', path: '/dashboard/messages', roles: ['alumni'] },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['alumni'] },
];

// Minimal menu for alumni accounts that have not been approved yet: the
// registration wizard (before submitting) or the application-status page
// (while pending / rejected), plus Settings for account switching / deletion.
const pendingAlumniMenuItems = (submitted: boolean): MenuItem[] => [
  submitted
    ? { icon: ClipboardList, label: 'Application Status', path: '/dashboard/alumni-application-status', roles: ['alumni'] }
    : { icon: GraduationCap, label: 'Alumni Registration', path: '/dashboard/alumni-registration', roles: ['alumni'] },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['alumni'] },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { countFor } = useBadges();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);

  // Always close the mobile drawer when the route changes. Covers the per-item
  // onClick, the logo/back/forward navigations, and guarantees the dimming
  // overlay never lingers over the new page.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  // Alumni accounts have backend role 'student' + an alumni flag, so detect via
  // the flags rather than the raw role.
  const isAlumni = !!(user?.isAlumni || user?.isAlumniAccount);
  const userRole: UserRole = isAlumni ? 'alumni' : (user?.role || 'student');
  const portalLabel = userRole === 'teacher' ? 'Teacher Portal' : userRole === 'alumni' ? 'Alumni Portal' : 'Student Portal';

  // Self-registered alumni only unlock the full alumni menu after an admin
  // approves their application; until then they get a minimal holding menu.
  const isApprovedAlumni =
    isAlumni && (!user?.isAlumniAccount || user?.alumniReviewStatus === 'approved');

  // Once admission is approved the Admission section is no longer relevant —
  // admitted students only see items that apply to them.
  const isAdmitted = user?.admissionStatus === 'approved';

  // Alumni get a dedicated menu and no "Explore" group.
  const filteredMainItems = isAlumni
    ? (isApprovedAlumni ? alumniMenuItems : pendingAlumniMenuItems(!!user?.isAlumni))
    : mainMenuItems.filter(
        (item) =>
          item.roles.includes(userRole) &&
          !(item.path === '/dashboard/admission' && isAdmitted)
      );
  const filteredUpcomingItems = isAlumni
    ? []
    : upcomingMenuItems.filter((item) => item.roles.includes(userRole));

  // "Switch Account" stays easily reachable while the account is still
  // switchable (alumni not yet approved / student not yet admitted).
  const showSwitchAccount = canSwitchAccount(user);

  const renderNavItem = (item: MenuItem) => {
    const isActive = location.pathname === item.path;
    // Unread badge count for this nav item (0 when the route isn't tracked).
    const badgeCount = countFor(PATH_TO_MODULE[item.path]);
    return (
      <li key={item.path}>
        <NavLink
          to={item.path}
          onClick={() => setIsMobileOpen(false)}
          title={isCollapsed ? item.label : undefined}
          className={cn(
            'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
            isCollapsed && 'justify-center px-0',
            isActive
              ? 'text-primary-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary',
          )}
        >
          {isActive && (
            <motion.div
              layoutId="activeNavPill"
              className="absolute inset-0 rounded-xl gradient-primary shadow-sm"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <item.icon
            className={cn(
              'relative z-10 h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
              isActive && 'text-primary-foreground',
            )}
          />
          {!isCollapsed && (
            <span className="relative z-10 truncate">{item.label}</span>
          )}
          {/* Unread badge: number pill when expanded, dot on the icon when collapsed */}
          {!isCollapsed
            ? <NavBadge count={badgeCount} className="relative z-10 ml-auto" />
            : <NavBadge count={badgeCount} dot />}
        </NavLink>
      </li>
    );
  };

  return (
    <>
      {/* Mobile menu trigger */}
      <button
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open menu"
        className="fixed left-4 top-3.5 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-card lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            /* Plain dim, NO backdrop-blur: backdrop-filter on a transient fixed
               overlay leaves a blurred compositing "ghost" on many mobile GPUs
               after it unmounts — that was the page-stays-blurred bug. */
            className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 84 : 280,
          x: isMobileOpen ? 0 : typeof window !== 'undefined' && window.innerWidth < 1024 ? -300 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar',
          'lg:sticky lg:top-0 lg:translate-x-0',
        )}
      >
        {/* Brand header — click logo/name to go to the dashboard */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <button
            type="button"
            onClick={() => {
              navigate('/dashboard');
              setIsMobileOpen(false);
            }}
            title="Go to Dashboard"
            aria-label="Go to Dashboard"
            className={cn(
              'flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              isCollapsed && 'justify-center',
            )}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <img src="/spi-logo.png" alt="SPI Logo" className="h-7 w-7 object-contain" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-sm font-bold leading-tight text-foreground">
                  Sirajganj Polytechnic
                </h2>
                <p className="truncate text-xs text-muted-foreground">{portalLabel}</p>
              </div>
            )}
          </button>
          {/* Mobile close */}
          <button
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {!isCollapsed && (
            <p className="mb-2 px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Menu
            </p>
          )}
          <ul className="space-y-1">{filteredMainItems.map(renderNavItem)}</ul>

          {filteredUpcomingItems.length > 0 && (
            <div className="mt-5 border-t border-sidebar-border pt-4">
              <button
                onClick={() => !isCollapsed && setIsUpcomingOpen(!isUpcomingOpen)}
                className={cn(
                  'mb-2 flex w-full items-center gap-1.5 px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-opacity hover:opacity-80',
                  isCollapsed && 'justify-center px-0',
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                {!isCollapsed && (
                  <>
                    <span>Explore</span>
                    <ChevronDown
                      className={cn('ml-auto h-3.5 w-3.5 transition-transform duration-200', !isUpcomingOpen && '-rotate-90')}
                    />
                  </>
                )}
              </button>
              <AnimatePresence initial={false}>
                {(isUpcomingOpen || isCollapsed) && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {filteredUpcomingItems.map(renderNavItem)}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        {/* Footer: switch account + profile + logout */}
        <div className="border-t border-sidebar-border p-3">
          {showSwitchAccount && (
            <button
              onClick={() => setIsSwitchOpen(true)}
              title="Switch Account"
              aria-label="Switch Account"
              className={cn(
                'mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                'text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors',
                isCollapsed && 'justify-center px-0',
              )}
            >
              <ArrowRightLeft className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">Switch Account</span>}
            </button>
          )}
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl p-2',
              !isCollapsed && 'bg-sidebar-accent/60',
            )}
          >
            <ProfileAvatar size="sm" />
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{user?.name || 'User'}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.studentId || user?.email}</p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
          {isCollapsed && (
            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              className="mt-2 flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-20 hidden h-7 w-7 rounded-full bg-card shadow-card lg:flex"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', isCollapsed && 'rotate-180')} />
        </Button>
      </motion.aside>

      <SwitchAccountDialog open={isSwitchOpen} onOpenChange={setIsSwitchOpen} />
    </>
  );
}
