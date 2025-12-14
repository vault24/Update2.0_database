import { motion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  ClipboardCheck,
  BarChart3,
  FolderOpen,
  Send,
  Settings,
  LogOut,
  GraduationCap,
  ChevronLeft,
  Menu,
  Users,
  UserCheck,
  Phone,
  BookOpen,
  Bell,
  User,
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

// Menu items with role-based access
const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['student', 'captain', 'teacher'] },
  { icon: Bell, label: 'Notices & Updates', path: '/dashboard/notices', roles: ['student', 'captain', 'teacher'] },
  { icon: User, label: 'Profile', path: '/dashboard/profile', roles: ['student', 'captain'] },
  { icon: FileText, label: 'Admission', path: '/dashboard/admission', roles: ['student', 'captain'] },
  { icon: Calendar, label: 'Class Routine', path: '/dashboard/routine', roles: ['student', 'captain', 'teacher'] },
  { icon: ClipboardCheck, label: 'Attendance', path: '/dashboard/attendance', roles: ['student', 'captain', 'teacher'] },
  { icon: BarChart3, label: 'Marks', path: '/dashboard/marks', roles: ['student', 'captain'] },
  { icon: FolderOpen, label: 'Documents', path: '/dashboard/documents', roles: ['student', 'captain'] },
  { icon: Send, label: 'Applications', path: '/dashboard/applications', roles: ['student', 'captain'] },
  // Captain-specific items
  { icon: UserCheck, label: 'Add Attendance', path: '/dashboard/add-attendance', roles: ['captain'] },
  { icon: Phone, label: 'Teacher Contacts', path: '/dashboard/teacher-contacts', roles: ['captain'] },
  // Teacher-specific items
  { icon: Users, label: 'Student List', path: '/dashboard/students', roles: ['teacher'] },
  { icon: BookOpen, label: 'Manage Marks', path: '/dashboard/manage-marks', roles: ['teacher'] },
];

const bottomMenuItems: MenuItem[] = [
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['student', 'captain', 'teacher'] },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const userRole = user?.role || 'student';

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));
  const filteredBottomItems = bottomMenuItems.filter(item => item.roles.includes(userRole));

  const getRoleBadge = () => {
    switch (userRole) {
      case 'captain':
        return { label: 'Captain', color: 'bg-warning text-warning-foreground' };
      case 'teacher':
        return { label: 'Teacher', color: 'bg-success text-white' };
      default:
        return { label: 'Student', color: 'bg-primary text-primary-foreground' };
    }
  };

  const roleBadge = getRoleBadge();

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
          "lg:relative lg:translate-x-0"
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
                <img 
                  src="/spi-logo.png" 
                  alt="SPI Logo" 
                  className="w-full h-full object-contain"
                />
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
                if (isMobileOpen) {
                  setIsMobileOpen(false);
                } else {
                  setIsCollapsed(!isCollapsed);
                }
              }}
              className="flex-shrink-0"
            >
              <ChevronLeft className={cn(
                "w-5 h-5 transition-transform",
                isCollapsed && "rotate-180"
              )} />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {filteredMenuItems.map((item) => {
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
            })}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-border">
          <ul className="space-y-1">
            {filteredBottomItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <motion.span
                      animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  </NavLink>
                </li>
              );
            })}
            <li>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <motion.span
                  animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  Logout
                </motion.span>
              </button>
            </li>
          </ul>

          {/* User Info */}
          <motion.div
            animate={{ opacity: isCollapsed ? 0 : 1, height: isCollapsed ? 0 : 'auto' }}
            className="mt-4 p-3 bg-secondary rounded-lg overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {user?.name.charAt(0)}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.studentId}</p>
              </div>
            </div>
            <div className="mt-2">
              <span className={cn("text-xs px-2 py-1 rounded-full font-medium", roleBadge.color)}>
                {roleBadge.label}
              </span>
            </div>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
}
