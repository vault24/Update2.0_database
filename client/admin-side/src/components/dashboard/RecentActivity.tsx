import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, FileEdit, GraduationCap, Award, UserCheck, Activity, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { activityLogService, ActivityLog } from '@/services/activityLogService';
import { getErrorMessage } from '@/lib/api';

const getActionIcon = (action: string) => {
  const value = action?.toLowerCase();
  if (value === 'create') return UserPlus;
  if (value === 'update') return FileEdit;
  if (value === 'approve') return UserCheck;
  if (value === 'login' || value === 'logout') return UserCheck;
  return Activity;
};

const getActionColor = (action: string) => {
  const value = action?.toLowerCase();
  if (value === 'create') return 'bg-info/10 text-info';
  if (value === 'update') return 'bg-primary/10 text-primary';
  if (value === 'approve') return 'bg-success/10 text-success';
  if (value === 'reject' || value === 'delete') return 'bg-destructive/10 text-destructive';
  return 'bg-accent/10 text-accent';
};

const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await activityLogService.getActivityLogs({ 
        page_size: 5, 
        ordering: '-timestamp' 
      });
      setActivities(response.results || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <a href="/analytics" className="text-sm text-primary hover:underline">View all</a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = getActionIcon(activity.actionType);
            const colorClass = getActionColor(activity.actionType);
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-start gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize">{activity.actionType} - {activity.entityType}</p>
                  <p className="text-sm text-muted-foreground truncate">{activity.description || 'No description'}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatTimeAgo(activity.timestamp)}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
