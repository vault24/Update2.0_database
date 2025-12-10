import { motion } from 'framer-motion';
import { User, Calendar, FolderOpen, ClipboardCheck, FileText, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const actions = [
  { icon: User, label: 'Profile', path: '/dashboard/profile', color: 'from-violet-500 to-purple-600' },
  { icon: Calendar, label: 'Routine', path: '/dashboard/routine', color: 'from-blue-500 to-cyan-600' },
  { icon: FolderOpen, label: 'Documents', path: '/dashboard/documents', color: 'from-emerald-500 to-teal-600' },
  { icon: ClipboardCheck, label: 'Attendance', path: '/dashboard/attendance', color: 'from-orange-500 to-amber-600' },
  { icon: FileText, label: 'Marks', path: '/dashboard/marks', color: 'from-pink-500 to-rose-600' },
  { icon: Send, label: 'Applications', path: '/dashboard/applications', color: 'from-indigo-500 to-blue-600' },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-card rounded-2xl border border-border p-6 shadow-card"
    >
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.path}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
              <action.icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
