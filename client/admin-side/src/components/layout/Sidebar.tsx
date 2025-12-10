import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserX,
  GraduationCap,
  Calendar,
  ClipboardCheck,
  UserCircle,
  Award,
  FileText,
  Inbox,
  FileEdit,
  BarChart3,
  Settings,
  Activity,
  X,
  BookOpen,
  UserCheck,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  onClose: () => void;
  isMobile?: boolean;
}

const menuItems = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    ],
  },
  {
    label: 'Students',
    items: [
      { icon: Users, label: 'Students List', path: '/students' },
      { icon: UserPlus, label: 'Add Student', path: '/add-student' },
      { icon: UserX, label: 'Discontinued Students', path: '/discontinued-students' },
      { icon: GraduationCap, label: 'Admissions', path: '/admissions' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { icon: BookOpen, label: 'Departments', path: '/departments' },
      { icon: UserCheck, label: 'Teachers', path: '/teachers' },
      { icon: Calendar, label: 'Class Routine', path: '/class-routine' },
      { icon: ClipboardCheck, label: 'Attendance & Marks', path: '/attendance-marks' },
    ],
  },
  {
    label: 'Profiles & Records',
    items: [
      { icon: UserCircle, label: 'Student Profiles', path: '/student-profiles' },
      { icon: Award, label: 'Alumni', path: '/alumni' },
      { icon: FileText, label: 'Documents', path: '/documents' },
    ],
  },
  {
    label: 'Requests',
    items: [
      { icon: Inbox, label: 'Applications', path: '/applications' },
      { icon: FileEdit, label: 'Correction Requests', path: '/correction-requests' },
      { icon: UserCog, label: 'Signup Requests', path: '/signup-requests' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: BarChart3, label: 'Analytics & Reports', path: '/analytics' },
      { icon: Settings, label: 'Settings', path: '/settings' },
      { icon: Activity, label: 'Activity Logs', path: '/activity-logs' },
    ],
  },
];

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const location = useLocation();

  return (
    <div className="h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">Sirajganj Polytechnic</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {menuItems.map((group, groupIndex) => (
          <motion.div
            key={group.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={isMobile ? onClose : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className={cn('w-5 h-5', isActive && 'animate-scale-in')} />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground"
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center">
              <span className="text-sm font-bold text-accent-foreground">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
