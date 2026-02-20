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
  Activity,
  Video,
  AlertTriangle,
  Shield,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

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
  { icon: AlertTriangle, label: 'Complaints', path: '/dashboard/complaints', roles: ['student', 'captain', 'teacher'] },
  { icon: Send, label: 'Applications', path: '/dashboard/applications', roles: ['student', 'captain'] },
  // Captain-specific
  { icon: UserCheck, label: 'Add Attendance', path: '/dashboard/add-attendance', roles: ['captain'] },
  { icon: Phone, label: 'Teacher Contacts', path: '/dashboard/teacher-contacts', roles: ['captain'] },
  // Teacher-specific
  { icon: Users, label: 'Student List', path: '/dashboard/students', roles: ['teacher'] },
  { icon: ClipboardCheck, label: 'Take Attendance', path: '/dashboard/teacher-attendance', roles: ['teacher'] },
  { icon: BookOpen, label: 'Manage Marks', path: '/dashboard/manage-marks', roles: ['teacher'] },
  { icon: Shield, label: 'Allegations', path: '/dashboard/allegations', roles: ['teacher'] },
];

// "Upcoming" group items
const upcomingMenuItems: MenuItem[] = [
  { icon: BookOpen, label: 'Learning Hub', path: '/dashboard/learning-hub', roles: ['student', 'captain', 'teacher'] },
  { icon: Video, label: 'Live Classes', path: '/dashboard/live-classes', roles: ['student', 'captain', 'teacher'] },
  { icon: MessageCircle, label: 'Messages', path: '/dashboard/messages', roles: ['student', 'captain', 'teacher', 'alumni'] },
  { icon: Shield, label: 'My Allegations', path: '/dashboard/my-allegations', roles: ['student', 'captain'] },
  { icon: GraduationCap, label: 'Alumni Profile', path: '/dashboard/alumni-profile', roles: ['alumni'] },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const userRole = user?.role || 'student';
  const isGraduatedOrAlumni = userRole === 'alumni' || user?.isAlumni === true;

  const filteredMainItems = mainMenuItems.filter(item => item.roles.includes(userRole));
  const filteredUpcomingItems = upcomingMenuItems.filter(item => item.roles.includes(userRole));

  const renderNavItem = (item: MenuItem) => {
    const isActive = location.pathname === item.path;
    return (
      <li key={item.path}>
        <NavLink
          to={item.path}
          onClick={() => setIsMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {isActive && (
            <motion.div
              layoutId="activeNavItem"
              className="absolute inset-0 gradient-primary rounded-lg"
              transition={{ type: "spring", duration: 0.5 }}
            />
          )}
          <item.icon className={cn(
            "w-5 h-5 flex-shrink-0 relative z-10",
            isActive && "text-primary-foreground"
          )} />
          <motion.span
            animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden relative z-10"
          >
            {item.label}
          </motion.span>
        </NavLink>
      </li>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card shadow-card"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 280,
          x: isMobileOpen ? 0 : typeof window !== 'undefined' && window.innerWidth < 1024 ? -280 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          "fixed left-0 top-0 h-screen bg-card border-r border-border z-50 flex flex-col",
          "lg:sticky lg:top-0 lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <motion.div
              animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
              className="flex items-center gap-3 overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src="/spi-logo.png" alt="SPI Logo" className="w-full h-full object-contain" />
              </div>
              <div className="whitespace-nowrap">
                <h2 className="font-bold text-sm">Sirajganj Polytechnic</h2>
                <p className="text-xs text-muted-foreground">
                  {userRole === 'teacher' ? 'Teacher Portal' : 'Student Portal'}
                </p>
              </div>
            </motion.div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isMobileOpen) setIsMobileOpen(false);
                else setIsCollapsed(!isCollapsed);
              }}
              className="flex-shrink-0"
            >
              <ChevronLeft className={cn("w-5 h-5 transition-transform", isCollapsed && "rotate-180")} />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {/* Main group */}
          <ul className="space-y-1 px-3">
            {filteredMainItems.map(renderNavItem)}
          </ul>

          {/* Upcoming group */}
          {filteredUpcomingItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => !isCollapsed && setIsUpcomingOpen(!isUpcomingOpen)}
                className={cn(
                  "w-full px-4 mb-2 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity",
                  isCollapsed && "justify-center"
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {!isCollapsed && "Upcoming"}
                </span>
                {!isCollapsed && (
                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                    !isUpcomingOpen && "-rotate-90"
                  )} />
                )}
              </button>
              <AnimatePresence initial={false}>
                {(isUpcomingOpen || isCollapsed) && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1 px-3 overflow-hidden"
                  >
                    {filteredUpcomingItems.map(renderNavItem)}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

      </motion.aside>
    </>
  );
}
