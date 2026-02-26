import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Check, Download, Edit, Loader2, Plus, RefreshCw, Search, Shield, Trash2, User, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { activityLogService, ActivityLog, ActivityLogFilters } from '@/services/activityLogService';
import { getErrorMessage } from '@/lib/api';

const ACTION_FILTERS = ['All Actions', 'create', 'update', 'approve', 'reject', 'delete', 'login', 'logout'];
const RANGE_FILTERS = [
  { label: 'Last 24 Hours', value: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: 'Last 7 Days', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Last 30 Days', value: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
];

const getActionColor = (action: string) => {
  const value = action?.toLowerCase();
  if (value === 'create') return 'bg-info/20 text-info border-info/30';
  if (value === 'update') return 'bg-primary/20 text-primary border-primary/30';
  if (value === 'approve' || value === 'login') return 'bg-success/20 text-success border-success/30';
  if (value === 'reject' || value === 'delete') return 'bg-destructive/20 text-destructive border-destructive/30';
  return 'bg-muted text-muted-foreground border-muted';
};

const getActionIcon = (action: string) => {
  const value = action?.toLowerCase();
  if (value === 'create') return Plus;
  if (value === 'update') return Edit;
  if (value === 'approve') return Check;
  if (value === 'delete') return Trash2;
  if (value === 'login' || value === 'logout') return User;
  return Activity;
};

export default function SystemActivityReports() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All Actions');
  const [rangeFilter, setRangeFilter] = useState('7d');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await activityLogService.getActivityLogs({ page_size: 500, ordering: '-timestamp' });
      setLogs(response.results || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const range = RANGE_FILTERS.find((item) => item.value === rangeFilter) || RANGE_FILTERS[1];
    const cutoff = Date.now() - range.ms;
    const query = search.trim().toLowerCase();
    return logs
      .filter((log) => (actionFilter === 'All Actions' ? true : log.actionType === actionFilter))
      .filter((log) => new Date(log.timestamp).getTime() >= cutoff)
      .filter((log) => {
        if (!query) return true;
        return [log.description, log.entityType, log.userName].some((value) => value?.toLowerCase().includes(query));
      });
  }, [actionFilter, logs, rangeFilter, search]);

  const actionReport = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach((log) => {
      counts[log.actionType] = (counts[log.actionType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredLogs]);

  const accountReport = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach((log) => {
      const key = log.userName || 'System';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filteredLogs]);

  const changeCount = filteredLogs.filter((log) => ['create', 'update', 'delete'].includes(log.actionType)).length;
  const securityCount = filteredLogs.filter((log) => ['login', 'logout'].includes(log.actionType)).length;
  const activeAccounts = new Set(filteredLogs.map((log) => log.userName || 'System')).size;

  const handleExport = async () => {
    try {
      setExporting(true);
      const filters: ActivityLogFilters = { ordering: '-timestamp' };
      if (actionFilter !== 'All Actions') filters.action_type = actionFilter;
      const blob = await activityLogService.exportActivityLogs(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-activity-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Activity & Reports</h1>
          <p className="text-muted-foreground">One page for system changes, account operations, and audit reporting.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={loading}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          <Button className="gradient-primary text-primary-foreground" onClick={handleExport} disabled={loading || exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}Export
          </Button>
        </div>
      </div>

      <Card className="glass-card border-info/40"><CardContent className="p-4 flex items-start gap-3"><Shield className="w-5 h-5 text-info mt-0.5" /><p className="text-sm text-muted-foreground">This page shows all admin-side activities, including admissions decisions, department changes, teacher approvals, and routine updates.</p></CardContent></Card>

      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card"><CardContent className="p-4"><p className="text-2xl font-bold">{filteredLogs.length}</p><p className="text-xs text-muted-foreground">System Events</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4"><p className="text-2xl font-bold text-primary">{changeCount}</p><p className="text-xs text-muted-foreground">Change Actions</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4"><p className="text-2xl font-bold text-success">{activeAccounts}</p><p className="text-xs text-muted-foreground">Active Accounts</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4"><p className="text-2xl font-bold text-warning">{securityCount}</p><p className="text-xs text-muted-foreground">Security Events</p></CardContent></Card>
        </div>
      )}

      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search system activity..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
            <Select value={actionFilter} onValueChange={setActionFilter}><SelectTrigger className="w-full lg:w-[180px]"><SelectValue /></SelectTrigger><SelectContent>{ACTION_FILTERS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Select value={rangeFilter} onValueChange={setRangeFilter}><SelectTrigger className="w-full lg:w-[180px]"><SelectValue /></SelectTrigger><SelectContent>{RANGE_FILTERS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      {loading && <Card className="glass-card"><CardContent className="p-8 text-center"><Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" /><p className="text-muted-foreground">Loading system activity...</p></CardContent></Card>}
      {error && <Card className="glass-card border-destructive"><CardContent className="p-8 text-center"><X className="w-12 h-12 text-destructive mx-auto mb-4" /><p className="text-destructive font-semibold mb-2">Error Loading System Activity</p><p className="text-muted-foreground mb-4">{error}</p><Button onClick={fetchLogs}><RefreshCw className="w-4 h-4 mr-2" />Try Again</Button></CardContent></Card>}

      {!loading && !error && filteredLogs.length > 0 && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card"><CardHeader><CardTitle className="text-sm font-medium">Action Report</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={actionReport}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="name" className="text-xs" /><YAxis className="text-xs" /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass-card"><CardHeader><CardTitle className="text-sm font-medium">Most Active Accounts</CardTitle></CardHeader><CardContent><div className="space-y-3">{accountReport.map((item) => <div key={item.name} className="flex items-center justify-between"><span className="text-sm text-foreground truncate">{item.name}</span><Badge variant="outline">{item.count} events</Badge></div>)}</div></CardContent></Card>
            </motion.div>
          </div>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-sm font-medium">Recent System Events</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filteredLogs.slice(0, 80).map((log, index) => {
                  const Icon = getActionIcon(log.actionType);
                  return (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.015 }} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.userName || 'System'}</span>
                          <Badge variant="outline" className={getActionColor(log.actionType)}>{log.actionType}</Badge>
                          <span className="text-muted-foreground">{log.entityType || 'System'}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{log.description || 'No description'}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</span>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
