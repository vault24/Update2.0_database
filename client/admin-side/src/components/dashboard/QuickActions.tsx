import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { UserPlus, Users, GraduationCap, Inbox, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  {
    icon: UserPlus,
    label: 'Add Student',
    path: '/add-student',
    color: 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground',
  },
  {
    icon: Users,
    label: 'View Students',
    path: '/students',
    color: 'bg-info/10 text-info hover:bg-info hover:text-info-foreground',
  },
  {
    icon: GraduationCap,
    label: 'Admissions',
    path: '/admissions',
    color: 'bg-success/10 text-success hover:bg-success hover:text-success-foreground',
  },
  {
    icon: Inbox,
    label: 'Applications',
    path: '/applications',
    color: 'bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground',
  },
  {
    icon: UserX,
    label: 'Discontinued',
    path: '/discontinued-students',
    color: 'bg-warning/10 text-warning hover:bg-warning hover:text-warning-foreground',
  },
];

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-6"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.path}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          >
            <Link
              to={action.path}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300',
                action.color
              )}
            >
              <action.icon className="w-6 h-6" />
              <span className="text-xs font-medium text-center">{action.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
