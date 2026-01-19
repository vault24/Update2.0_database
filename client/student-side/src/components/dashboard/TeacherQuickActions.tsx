import { motion } from 'framer-motion';
import { 
  ClipboardCheck, Users, FileText, BookOpen, 
  Calendar, Shield, PenTool, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const actions = [
  { 
    icon: ClipboardCheck, 
    label: 'Take Attendance', 
    path: '/dashboard/teacher-attendance',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-500/10',
    description: 'Mark student attendance'
  },
  { 
    icon: Users, 
    label: 'Student List', 
    path: '/dashboard/students',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-500/10',
    description: 'View all students'
  },
  { 
    icon: PenTool, 
    label: 'Manage Marks', 
    path: '/dashboard/manage-marks',
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-500/10',
    description: 'Update student marks'
  },
  { 
    icon: BookOpen, 
    label: 'Learning Hub', 
    path: '/dashboard/learning-hub',
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-500/10',
    description: 'Manage materials'
  },
  { 
    icon: Calendar, 
    label: 'Live Classes', 
    path: '/dashboard/live-classes',
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-500/10',
    description: 'Schedule classes'
  },
  { 
    icon: Shield, 
    label: 'Allegations', 
    path: '/dashboard/allegations',
    color: 'from-red-500 to-orange-600',
    bgColor: 'bg-red-500/10',
    description: 'Report issues'
  },
];

export function TeacherQuickActions() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-sm md:text-base lg:text-lg font-semibold">Quick Actions</h2>
        <span className="text-[10px] md:text-xs text-muted-foreground">Manage your class</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
            onClick={() => navigate(action.path)}
            className={cn(
              "group relative flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl",
              "border border-border/50 hover:border-border",
              "transition-all duration-300 hover:shadow-md",
              action.bgColor
            )}
          >
            <div className={cn(
              "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br flex items-center justify-center",
              "group-hover:scale-110 transition-transform shadow-lg",
              action.color
            )}>
              <action.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm font-medium">{action.label}</p>
              <p className="text-[9px] md:text-[10px] text-muted-foreground hidden md:block">
                {action.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
