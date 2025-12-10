import { motion } from 'framer-motion';
import { UserPlus, FileEdit, GraduationCap, Award, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const activities = [
  {
    id: 1,
    type: 'admission',
    icon: UserPlus,
    title: 'New admission request',
    description: 'Rakib Hasan applied for Computer Technology',
    time: '2 minutes ago',
    color: 'bg-success/10 text-success',
  },
  {
    id: 2,
    type: 'correction',
    icon: FileEdit,
    title: 'Correction request',
    description: 'Fatima Akter requested name correction',
    time: '15 minutes ago',
    color: 'bg-warning/10 text-warning',
  },
  {
    id: 3,
    type: 'status',
    icon: UserCheck,
    title: 'Status changed',
    description: 'Kamal Uddin moved to Alumni',
    time: '1 hour ago',
    color: 'bg-info/10 text-info',
  },
  {
    id: 4,
    type: 'application',
    icon: GraduationCap,
    title: 'Application submitted',
    description: 'Transfer certificate requested by Sumon Mia',
    time: '2 hours ago',
    color: 'bg-primary/10 text-primary',
  },
  {
    id: 5,
    type: 'alumni',
    icon: Award,
    title: 'Alumni registered',
    description: 'Nasrin Sultana completed registration',
    time: '3 hours ago',
    color: 'bg-accent/10 text-accent',
  },
];

export function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="flex items-start gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', activity.color)}>
              <activity.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{activity.title}</p>
              <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
