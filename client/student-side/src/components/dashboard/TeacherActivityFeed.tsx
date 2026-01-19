import { motion } from 'framer-motion';
import { 
  ClipboardCheck, FileText, MessageSquare, Bell, 
  Users, BookOpen, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'attendance' | 'marks' | 'assignment' | 'notification' | 'allegation' | 'material';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'info';
}

// Mock activity data
const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'attendance',
    title: 'Attendance Submitted',
    description: 'CSE Semester 4 - Database Systems',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    status: 'success',
  },
  {
    id: '2',
    type: 'marks',
    title: 'Marks Updated',
    description: 'CT-2 marks for 45 students',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'success',
  },
  {
    id: '3',
    type: 'allegation',
    title: 'New Allegation Filed',
    description: 'Student behavior report submitted',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: 'warning',
  },
  {
    id: '4',
    type: 'material',
    title: 'Study Material Uploaded',
    description: 'Week 8 lecture notes added',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    status: 'info',
  },
  {
    id: '5',
    type: 'assignment',
    title: 'Assignment Created',
    description: 'New programming task assigned',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'info',
  },
];

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'attendance': return ClipboardCheck;
    case 'marks': return FileText;
    case 'assignment': return BookOpen;
    case 'notification': return Bell;
    case 'allegation': return AlertTriangle;
    case 'material': return BookOpen;
    default: return Bell;
  }
};

const getStatusColor = (status?: Activity['status']) => {
  switch (status) {
    case 'success': return 'bg-emerald-500';
    case 'warning': return 'bg-amber-500';
    case 'info': return 'bg-blue-500';
    default: return 'bg-muted-foreground';
  }
};

export function TeacherActivityFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-sm md:text-base lg:text-lg font-semibold">Recent Activity</h2>
        <span className="text-[10px] md:text-xs text-muted-foreground">Last 24 hours</span>
      </div>

      <div className="space-y-3 md:space-y-4">
        {mockActivities.map((activity, index) => {
          const Icon = getActivityIcon(activity.type);
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-start gap-3 group"
            >
              {/* Icon with status indicator */}
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center",
                  "bg-muted group-hover:bg-muted/80 transition-colors"
                )}>
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                </div>
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                  getStatusColor(activity.status)
                )} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs md:text-sm font-medium">{activity.title}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-[9px] md:text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full mt-4 py-2 text-xs md:text-sm text-primary hover:text-primary/80 font-medium transition-colors"
      >
        View All Activity →
      </motion.button>
    </motion.div>
  );
}
