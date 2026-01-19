import { motion } from 'framer-motion';
import { 
  User, 
  Calendar, 
  FolderOpen, 
  ClipboardCheck, 
  FileText, 
  Send,
  BookOpen,
  Video,
  MessageSquare,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const actions = [
  { 
    icon: User, 
    label: 'Profile', 
    path: '/dashboard/profile', 
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50 dark:bg-violet-950/30'
  },
  { 
    icon: Calendar, 
    label: 'Routine', 
    path: '/dashboard/routine', 
    color: 'from-blue-500 to-cyan-600',
    bgLight: 'bg-blue-50 dark:bg-blue-950/30'
  },
  { 
    icon: FolderOpen, 
    label: 'Documents', 
    path: '/dashboard/documents', 
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/30'
  },
  { 
    icon: ClipboardCheck, 
    label: 'Attendance', 
    path: '/dashboard/attendance', 
    color: 'from-orange-500 to-amber-600',
    bgLight: 'bg-orange-50 dark:bg-orange-950/30'
  },
  { 
    icon: FileText, 
    label: 'Marks', 
    path: '/dashboard/marks', 
    color: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-50 dark:bg-pink-950/30'
  },
  { 
    icon: Send, 
    label: 'Applications', 
    path: '/dashboard/applications', 
    color: 'from-indigo-500 to-blue-600',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/30'
  },
  { 
    icon: BookOpen, 
    label: 'Learning Hub', 
    path: '/dashboard/learning', 
    color: 'from-cyan-500 to-teal-600',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/30'
  },
  { 
    icon: Video, 
    label: 'Live Classes', 
    path: '/dashboard/live-classes', 
    color: 'from-red-500 to-orange-600',
    bgLight: 'bg-red-50 dark:bg-red-950/30'
  },
];

const secondaryActions = [
  { 
    icon: MessageSquare, 
    label: 'Messages', 
    path: '/dashboard/messages',
    badge: 3
  },
  { 
    icon: Bell, 
    label: 'Notices', 
    path: '/dashboard/notices',
    badge: 5
  },
];

export function PremiumQuickActions() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring" as const, stiffness: 200, damping: 20 }
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        <div className="flex gap-2">
          {secondaryActions.map((action) => (
            <motion.button
              key={action.path}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(action.path)}
              className="relative p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <action.icon className="w-5 h-5 text-muted-foreground" />
              {action.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {action.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-4 md:grid-cols-8 gap-3"
      >
        {actions.map((action, index) => (
          <motion.button
            key={action.path}
            variants={itemVariants}
            whileHover={{ 
              scale: 1.08, 
              y: -4,
              transition: { type: "spring", stiffness: 400, damping: 15 }
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(action.path)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl",
              "transition-all duration-200 group",
              action.bgLight,
              "hover:shadow-md"
            )}
          >
            <motion.div 
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.4 }}
              className={cn(
                "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center",
                `bg-gradient-to-br ${action.color}`,
                "shadow-md group-hover:shadow-lg transition-shadow"
              )}
            >
              <action.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </motion.div>
            <span className="text-[10px] md:text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
              {action.label}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
