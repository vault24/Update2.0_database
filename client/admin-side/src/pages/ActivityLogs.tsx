import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Activity,
  Filter,
  User,
  FileText,
  Users,
  GraduationCap,
  Settings,
  Check,
  X,
  Edit,
  Trash2,
  Plus,
  Eye,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { activityLogService, ActivityLog } from '@/services/activityLogService';
import { getErrorMessage } from '@/lib/api';

const actionFilters = ['All Actions', 'create', 'update', 'approve', 'reject', 'delete', 'login', 'logout'];
const targetFilters = ['All Targets', 'Student', 'Application', 'Admission', 'Document', 'Settings', 'Attendance', 'Marks'];

const getActionColor = (action: string) => {
  if (!action) return 'bg-muted text-muted-foreground';
  
  switch (action.toLowerCase()) {
    case 'create':
      return 'bg-info/20 text-info border-info/30';
    case 'update':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'approve':
      return 'bg-success/20 text-success border-success/30';
    case 'reject':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'delete':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'login':
      return 'bg-muted text-muted-foreground border-muted';
    case 'logout':
      return 'bg-muted text-muted-foreground border-muted';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getActionIcon = (action: string) => {
  if (!action) return Activity;
  
  switch (action.toLowerCase()) {
    case 'create':
      return Plus;
    case 'update':
      return Edit;
    case 'approve':
      return Check;
    case 'reject':
      return X;
    case 'delete':
      return Trash2;
    case 'login':
      return User;
    case 'logout':
      return User;
    default:
      return Activity;
  }
};

const getActionIconColor = (action: string) => {
  if (!action) return 'text-muted-foreground';
  
  switch (action.toLowerCase()) {
    case 'create':
      return 'text-info';
    case 'update':
      return 'text-primary';
    case 'approve':
      return 'text-success';
    case 'reject':
      return 'text-destructive';
    case 'delete':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
};

export default function ActivityLogs() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All Actions');
  const [targetFilter, setTargetFilter] = useState('All Targets');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, targetFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        page_size: 100,
        ordering: '-timestamp',
      };

      if (actionFilter !== 'All Actions') {
        filters.action_type = actionFilter;
      }

      if (targetFilter !== 'All Targets') {
        filters.entity_type = targetFilter;
      }

      const response = await activityLogService.getActivityLogs(filters);
      setLogs(response.results);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const searchText = search.toLowerCase();
    const matchesSearch =
      (log.description && log.description.toLowerCase().includes(searchText)) ||
      (log.entityType && log.entityType.toLowerCase().includes(searchText)) ||
      (log.userName && log.userName.toLowerCase().includes(searchText));
    return matchesSearch;
  });

  // Group logs by date
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const todayLogs = filteredLogs.filter((log) => log.timestamp.startsWith(today));
  const yesterdayLogs = filteredLogs.filter((log) => log.timestamp.startsWith(yesterday));
  const olderLogs = filteredLogs.filter(
    (log) => !log.timestamp.startsWith(today) && !log.timestamp.startsWith(yesterday),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground">View audit logs and track all system activities</p>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{logs.length}</p>
                <p className="text-xs text-muted-foreground">Total Activities</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-success">
                  {logs.filter((l) => l.actionType && l.actionType.toLowerCase() === 'approve').length}
                </p>
                <p className="text-xs text-muted-foreground">Approvals</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {logs.filter((l) => l.actionType && l.actionType.toLowerCase() === 'update').length}
                </p>
                <p className="text-xs text-muted-foreground">Updates</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-info">
                  {logs.filter((l) => l.actionType && l.actionType.toLowerCase() === 'create').length}
                </p>
                <p className="text-xs text-muted-foreground">Creations</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actionFilters.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetFilters.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading activity logs...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="glass-card border-destructive">
          <CardContent className="p-8 text-center">
            <X className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-semibold mb-2">Error Loading Logs</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      )}

      {/* Logs Timeline */}
      {!loading && !error && (
        <div className="space-y-6">
          {/* Today */}
          {todayLogs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Today
              </h3>
              <Card className="glass-card">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {todayLogs.map((log, index) => {
                      const Icon = getActionIcon(log.actionType);
                      const iconColor = getActionIconColor(log.actionType);
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50 ${iconColor}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">{log.userName || 'System'}</span>
                              <Badge variant="outline" className={getActionColor(log.actionType)}>
                                {log.actionType}
                              </Badge>
                              <span className="text-muted-foreground">{log.entityType}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{log.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Yesterday */}
          {yesterdayLogs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Yesterday
              </h3>
              <Card className="glass-card">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {yesterdayLogs.map((log, index) => {
                      const Icon = getActionIcon(log.actionType);
                      const iconColor = getActionIconColor(log.actionType);
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50 ${iconColor}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">{log.userName || 'System'}</span>
                              <Badge variant="outline" className={getActionColor(log.actionType)}>
                                {log.actionType}
                              </Badge>
                              <span className="text-muted-foreground">{log.entityType}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{log.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Older */}
          {olderLogs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Older
              </h3>
              <Card className="glass-card">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {olderLogs.map((log, index) => {
                      const Icon = getActionIcon(log.actionType);
                      const iconColor = getActionIconColor(log.actionType);
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50 ${iconColor}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">{log.userName || 'System'}</span>
                              <Badge variant="outline" className={getActionColor(log.actionType)}>
                                {log.actionType}
                              </Badge>
                              <span className="text-muted-foreground">{log.entityType}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{log.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {filteredLogs.length === 0 && (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold mb-1">No activity logs found</p>
                <p className="text-muted-foreground text-sm">
                  Try changing the filters or search term to see more activities.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
