/**
 * System Reports — centralized monitoring dashboard.
 *
 * Overview   : health snapshot, severity summary, 14-day trend, category mix.
 * Reports    : searchable/filterable grouped reports with workflow actions,
 *              expandable technical details and CSV / Excel / PDF export.
 * Timeline   : chronological feed of significant system events.
 * Activity   : classic admin activity / audit log.
 *
 * Reports are captured automatically (exceptions, 5xx, auth failures, slow
 * requests/queries, error logs, security changes) and grouped by fingerprint.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertOctagon, AlertTriangle, ArrowUpDown, Bug, Check, CheckCircle2,
  ChevronDown, Circle, Clipboard, ClipboardCheck, Clock, Cpu, Database,
  Download, EyeOff, FileDown, FileSpreadsheet, FileText, Filter, Flame,
  HardDrive, HeartPulse, Info, Loader2, MemoryStick, Pause, Plus,
  RefreshCw, Search, Shield, Wifi, X, Zap,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip as ReTooltip,
  XAxis, YAxis,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api';
import {
  HealthSnapshot, ReportFilters, ReportStats, SystemReport, systemReportService,
} from '@/services/systemReportService';
import { activityLogService, ActivityLog } from '@/services/activityLogService';

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

const SEVERITIES = [
  { value: 'critical', label: 'Critical', icon: Flame, color: 'text-red-600 dark:text-red-400', chip: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', bar: '#dc2626' },
  { value: 'high', label: 'High', icon: AlertOctagon, color: 'text-orange-600 dark:text-orange-400', chip: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30', bar: '#ea580c' },
  { value: 'medium', label: 'Medium', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', bar: '#d97706' },
  { value: 'low', label: 'Low', icon: Info, color: 'text-blue-600 dark:text-blue-400', chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30', bar: '#2563eb' },
  { value: 'info', label: 'Info', icon: Circle, color: 'text-slate-500', chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30', bar: '#64748b' },
] as const;

const STATUSES = [
  { value: 'open', label: 'Open', chip: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
  { value: 'investigating', label: 'Investigating', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { value: 'resolved', label: 'Resolved', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { value: 'ignored', label: 'Ignored', chip: 'bg-slate-500/10 text-slate-500 border-slate-500/30' },
] as const;

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'bug', label: 'System Bugs' },
  { value: 'runtime_error', label: 'Runtime Errors' },
  { value: 'exception', label: 'Application Exceptions' },
  { value: 'server_error', label: 'Server Errors' },
  { value: 'database_error', label: 'Database Errors' },
  { value: 'api_error', label: 'API Errors' },
  { value: 'background_job', label: 'Background Job Failures' },
  { value: 'scheduled_task', label: 'Scheduled Task Failures' },
  { value: 'email_failure', label: 'Email Delivery Failures' },
  { value: 'file_storage', label: 'File Upload / Storage Errors' },
  { value: 'auth_failure', label: 'Auth & Authorization Failures' },
  { value: 'performance', label: 'Performance Issues' },
  { value: 'resource_alert', label: 'High Memory / CPU Alerts' },
  { value: 'slow_query', label: 'Slow Database Queries' },
  { value: 'network', label: 'Network Connectivity' },
  { value: 'downtime', label: 'Service Downtime' },
  { value: 'outage', label: 'System Outages' },
  { value: 'maintenance', label: 'Maintenance Logs' },
  { value: 'security_alert', label: 'Security Alerts' },
  { value: 'audit', label: 'Audit Logs' },
  { value: 'crash', label: 'Crash Reports' },
];

const POLL_INTERVAL_MS = 30_000;

const sevMeta = (value: string) => SEVERITIES.find((s) => s.value === value) || SEVERITIES[4];
const statusMeta = (value: string) => STATUSES.find((s) => s.value === value) || STATUSES[0];

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString();
const fmtAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: string }) {
  const meta = sevMeta(severity);
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', meta.chip)}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return <Badge variant="outline" className={cn('font-medium', meta.chip)}>{meta.label}</Badge>;
}

function SummaryCard({ icon: Icon, label, value, tone, sub }: {
  icon: React.ElementType; label: string; value: number | string; tone: string; sub?: string;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', tone)}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
        </div>
        <p className="mt-2 text-[26px] leading-none font-semibold tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function HealthItem({ ok, icon: Icon, label, detail }: {
  ok: boolean | undefined; icon: React.ElementType; label: string; detail?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
        ok === undefined ? 'bg-muted text-muted-foreground'
          : ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 text-red-600 dark:text-red-400',
      )}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className={cn('text-xs truncate', ok === false ? 'text-red-500' : 'text-muted-foreground')}>
          {detail || (ok === undefined ? 'Unknown' : ok ? 'Operational' : 'Problem detected')}
        </p>
      </div>
    </div>
  );
}

function ResourceGauge({ icon: Icon, label, percent, detail }: {
  icon: React.ElementType; label: string; percent?: number; detail?: string;
}) {
  const value = percent ?? null;
  const tone = value === null ? 'bg-muted-foreground'
    : value >= 90 ? 'bg-red-500' : value >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="w-4 h-4 text-muted-foreground" /> {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">{value === null ? '—' : `${value}%`}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(value ?? 0, 100)}%` }} />
      </div>
      {detail && <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report row (expandable)
// ---------------------------------------------------------------------------

function ReportRow({ report, selected, onToggleSelect, onAction, actionBusy }: {
  report: SystemReport;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onAction: (report: SystemReport, action: 'resolve' | 'ignore' | 'investigate' | 'reopen') => void;
  actionBusy: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<SystemReport | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const meta = sevMeta(report.severity);
  const Icon = meta.icon;
  const busy = actionBusy === report.id;

  const toggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) {
      try {
        setLoadingDetail(true);
        setDetail(await systemReportService.getReport(report.id));
      } catch {
        // details stay collapsed-quality; row data is still shown
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const copyTechnical = async () => {
    const d = detail || report;
    const text = [
      `Title: ${d.title}`,
      `Category: ${d.category_display}  Severity: ${d.severity_display}  Status: ${d.status_display}`,
      `Occurrences: ${d.occurrence_count}  First: ${d.first_seen}  Last: ${d.last_seen}`,
      d.path && `Request: ${d.method} ${d.path} → ${d.status_code ?? ''}`,
      d.user_display && `User: ${d.user_display}`,
      d.exception_type && `Exception: ${d.exception_type}`,
      d.message && `\nMessage:\n${d.message}`,
      d.stack_trace && `\nStack trace:\n${d.stack_trace}`,
      d.extra && Object.keys(d.extra).length > 0 && `\nExtra:\n${JSON.stringify(d.extra, null, 2)}`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard is unavailable in this browser.', variant: 'destructive' });
    }
  };

  const full = detail || report;

  return (
    <div className={cn('border-b border-border last:border-b-0', selected && 'bg-primary/[0.04]')}>
      <div className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors">
        <button onClick={() => onToggleSelect(report.id)} className="mt-1 shrink-0" aria-label="Select report">
          <div className={cn(
            'w-4 h-4 rounded border flex items-center justify-center',
            selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border',
          )}>
            {selected && <Check className="w-3 h-3" />}
          </div>
        </button>

        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', meta.chip)}>
          <Icon className="w-[18px] h-[18px]" />
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={toggleExpand}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate max-w-[520px]">{report.title}</span>
            <SeverityBadge severity={report.severity} />
            <StatusBadge status={report.status} />
            {report.occurrence_count > 1 && (
              <Badge variant="secondary" className="tabular-nums">×{report.occurrence_count}</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{report.category_display}</span>
            {report.path && <span className="font-mono truncate max-w-[280px]">{report.method} {report.path}</span>}
            {report.user_display && <span>by {report.user_display}</span>}
            <span title={fmtDateTime(report.last_seen)}>{fmtAgo(report.last_seen)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-2" />
          ) : (
            <>
              {report.status !== 'resolved' && (
                <Button variant="ghost" size="icon" title="Mark resolved"
                        onClick={() => onAction(report, 'resolve')}
                        className="text-emerald-600 hover:text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              )}
              {report.status === 'open' && (
                <Button variant="ghost" size="icon" title="Mark investigating"
                        onClick={() => onAction(report, 'investigate')}
                        className="text-amber-600 hover:text-amber-600">
                  <Search className="w-4 h-4" />
                </Button>
              )}
              {report.status !== 'ignored' && report.status !== 'resolved' && (
                <Button variant="ghost" size="icon" title="Ignore"
                        onClick={() => onAction(report, 'ignore')}
                        className="text-muted-foreground">
                  <EyeOff className="w-4 h-4" />
                </Button>
              )}
              {(report.status === 'resolved' || report.status === 'ignored') && (
                <Button variant="ghost" size="icon" title="Reopen"
                        onClick={() => onAction(report, 'reopen')}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" size="icon" onClick={toggleExpand} aria-label="Toggle details">
            <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-[76px] space-y-3">
              {loadingDetail ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading details…
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">First seen</p><p>{fmtDateTime(full.first_seen)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Last seen</p><p>{fmtDateTime(full.last_seen)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Occurrences</p><p className="tabular-nums">{full.occurrence_count}</p></div>
                    <div><p className="text-xs text-muted-foreground">Source</p><p>{String(full.source).replace(/_/g, ' ')}</p></div>
                  </div>

                  {full.message && (
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Message</p>
                      <p className="text-sm whitespace-pre-wrap break-words">{full.message}</p>
                    </div>
                  )}

                  {full.stack_trace && (
                    <div className="rounded-lg border border-border bg-slate-950 p-3 overflow-x-auto">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Stack trace</p>
                      <pre className="text-xs text-slate-200 whitespace-pre-wrap break-words max-h-72 overflow-y-auto">{full.stack_trace}</pre>
                    </div>
                  )}

                  {full.extra && Object.keys(full.extra).length > 0 && (
                    <div className="rounded-lg border border-border bg-muted/40 p-3 overflow-x-auto">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Technical details</p>
                      <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(full.extra, null, 2)}</pre>
                    </div>
                  )}

                  {full.resolution_note && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <p className="text-xs font-semibold text-emerald-600 mb-1">Resolution note</p>
                      <p className="text-sm">{full.resolution_note}</p>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="gap-1.5" onClick={copyTechnical}>
                    {copied ? <ClipboardCheck className="w-4 h-4 text-emerald-600" /> : <Clipboard className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy technical details'}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SystemActivityReports() {
  const { toast } = useToast();

  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [reports, setReports] = useState<SystemReport[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [timeline, setTimeline] = useState<SystemReport[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Reports tab filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ordering, setOrdering] = useState('-last_seen');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Manual entry dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ category: 'maintenance', severity: 'info', title: '', message: '' });
  const [creating, setCreating] = useState(false);

  const overviewRef = useRef<HTMLDivElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => searchDebounce.current && clearTimeout(searchDebounce.current);
  }, [search]);

  const currentFilters: ReportFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    category: category !== 'all' ? category : undefined,
    severity: severity !== 'all' ? severity : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    ordering,
  }), [debouncedSearch, category, severity, statusFilter, dateFrom, dateTo, ordering]);

  // ----- data loading ------------------------------------------------------
  const loadOverview = useCallback(async () => {
    const [statsData, healthData] = await Promise.all([
      systemReportService.getStats(),
      systemReportService.getHealth().catch(() => null),
    ]);
    setStats(statsData);
    if (healthData) setHealth(healthData);
  }, []);

  const loadReports = useCallback(async () => {
    const data = await systemReportService.getReports({
      ...currentFilters, page, page_size: PAGE_SIZE,
    });
    setReports(data.results || []);
    setReportCount(data.count ?? (data.results || []).length);
  }, [currentFilters, page]);

  const loadTimeline = useCallback(async () => {
    setTimeline(await systemReportService.getTimeline());
  }, []);

  const loadActivity = useCallback(async () => {
    const response = await activityLogService.getActivityLogs({ page_size: 200, ordering: '-timestamp' });
    setActivityLogs(response.results || []);
  }, []);

  const refreshAll = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      setError(null);
      await Promise.all([loadOverview(), loadReports(), loadTimeline()]);
      if (initial) await loadActivity().catch(() => undefined);
      setLastUpdated(new Date());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (initial) setLoading(false);
    }
  }, [loadOverview, loadReports, loadTimeline, loadActivity]);

  useEffect(() => { refreshAll(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload reports when filters/page change.
  useEffect(() => {
    if (!loading) loadReports().catch((err) => setError(getErrorMessage(err)));
  }, [currentFilters, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time polling.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => { refreshAll(false); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [live, refreshAll]);

  // ----- actions -----------------------------------------------------------
  const applyAction = async (report: SystemReport, action: 'resolve' | 'ignore' | 'investigate' | 'reopen') => {
    try {
      setActionBusy(report.id);
      await systemReportService.applyAction(report.id, action);
      toast({ title: `Report ${action === 'reopen' ? 'reopened' : action + (action.endsWith('e') ? 'd' : 'ed')}`, description: report.title });
      await Promise.all([loadReports(), loadOverview(), loadTimeline()]);
    } catch (err) {
      toast({ title: 'Action failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setActionBusy(null);
    }
  };

  const applyBulk = async (action: 'resolve' | 'ignore' | 'investigate' | 'reopen') => {
    if (selected.size === 0) return;
    try {
      setBulkBusy(true);
      const { updated } = await systemReportService.bulkAction(Array.from(selected), action);
      toast({ title: `${updated} report(s) updated` });
      setSelected(new Set());
      await Promise.all([loadReports(), loadOverview()]);
    } catch (err) {
      toast({ title: 'Bulk action failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportCsv = async (excel = false) => {
    try {
      setExporting(true);
      const blob = await systemReportService.exportCsv(currentFilters);
      const stamp = new Date().toISOString().split('T')[0];
      downloadBlob(blob, `system-reports-${stamp}.csv`);
      toast({ title: excel ? 'Excel-compatible CSV downloaded' : 'CSV downloaded' });
    } catch (err) {
      toast({ title: 'Export failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    const node = overviewRef.current;
    if (!node) return;
    try {
      setExporting(true);
      const canvas = await html2canvas(node, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 16;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 8;
      let remaining = imgHeight;
      const img = canvas.toDataURL('image/png');
      pdf.addImage(img, 'PNG', 8, position, imgWidth, imgHeight);
      remaining -= pageHeight - 16;
      while (remaining > 0) {
        position -= pageHeight - 16;
        pdf.addPage();
        pdf.addImage(img, 'PNG', 8, position, imgWidth, imgHeight);
        remaining -= pageHeight - 16;
      }
      pdf.save(`system-reports-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: 'PDF downloaded' });
    } catch (err) {
      toast({ title: 'PDF export failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const createManualEntry = async () => {
    if (!newEntry.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    try {
      setCreating(true);
      await systemReportService.createReport(newEntry as any);
      toast({ title: 'Entry recorded', description: newEntry.title });
      setNewOpen(false);
      setNewEntry({ category: 'maintenance', severity: 'info', title: '', message: '' });
      await refreshAll(false);
    } catch (err) {
      toast({ title: 'Failed to record entry', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const clearFilters = () => {
    setSearch(''); setCategory('all'); setSeverity('all'); setStatusFilter('all');
    setDateFrom(''); setDateTo(''); setOrdering('-last_seen'); setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(reportCount / PAGE_SIZE));
  const hasFilters = !!(search || category !== 'all' || severity !== 'all' || statusFilter !== 'all' || dateFrom || dateTo);

  // ----- render ------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading system reports…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HeartPulse className="w-7 h-7 text-primary" />
            System Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Centralized monitoring — errors, security events, performance and audit logs.
            {lastUpdated && <span className="ml-1">Updated {fmtAgo(lastUpdated.toISOString())}.</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setLive((v) => !v)}
            className={cn(live && 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400')}
          >
            {live ? <><span className="relative flex h-2 w-2 mr-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>Live</> : <><Pause className="w-4 h-4 mr-1.5" />Paused</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refreshAll(false)}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Log entry
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCsv(false)}>
                <FileText className="w-4 h-4 mr-2" /> CSV (filtered reports)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCsv(true)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel (CSV, opens in Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf}>
                <FileDown className="w-4 h-4 mr-2" /> PDF (overview snapshot)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <Card className="glass-card border-destructive/40">
          <CardContent className="p-4 flex items-center gap-3">
            <X className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button variant="outline" size="sm" onClick={() => refreshAll(true)}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview" className="gap-1.5"><Zap className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <Bug className="w-4 h-4" /> Reports
            {stats && stats.totals.open > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 tabular-nums">{stats.totals.open}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5"><Clock className="w-4 h-4" /> Timeline</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-4 h-4" /> Activity Log</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <div ref={overviewRef} className="space-y-6">
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard icon={Bug} label="Open reports" value={stats.totals.open}
                             tone="bg-red-500/10 text-red-600 dark:text-red-400"
                             sub={`${stats.totals.investigating} under investigation`} />
                <SummaryCard icon={Flame} label="Critical / High active"
                             value={stats.totals.critical_active + stats.totals.high_active}
                             tone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
                             sub={`${stats.totals.critical_active} critical`} />
                <SummaryCard icon={Clock} label="Events (24h)" value={stats.totals.last_24h}
                             tone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                             sub={`${stats.totals.all} total on record`} />
                <SummaryCard icon={CheckCircle2} label="Resolved (7 days)" value={stats.totals.resolved_7d}
                             tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                             sub={`${stats.totals.resolved} resolved all-time`} />
              </div>
            )}

            {/* Health */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-primary" /> System health
                  {health && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      checked {fmtAgo(new Date(health.checked_at * 1000).toISOString())}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {health ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <HealthItem ok={health.database.ok} icon={Database} label="Database"
                                detail={health.database.ok ? `Connected • ${health.database.latency_ms}ms` : health.database.error} />
                    <HealthItem ok={health.cache.ok} icon={Zap} label="Cache" detail={health.cache.ok ? 'Operational' : health.cache.error} />
                    <HealthItem ok={health.realtime.ok} icon={Wifi} label="Realtime (Redis)"
                                detail={health.realtime.ok ? 'Operational' : health.realtime.error} />
                    <ResourceGauge icon={Cpu} label="CPU" percent={health.resources.cpu_percent} />
                    <ResourceGauge icon={MemoryStick} label="Memory" percent={health.resources.memory_percent}
                                   detail={health.resources.memory_total_mb ? `${health.resources.memory_used_mb} / ${health.resources.memory_total_mb} MB` : undefined} />
                    <ResourceGauge icon={HardDrive} label="Disk" percent={health.resources.disk_percent}
                                   detail={health.resources.disk_free_gb != null ? `${health.resources.disk_free_gb} GB free of ${health.resources.disk_total_gb} GB` : undefined} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Health data unavailable.</p>
                )}
              </CardContent>
            </Card>

            {/* Charts */}
            {stats && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="glass-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Events — last 14 days (by severity)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.trend}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-[10px]" tickFormatter={(d: string) => d.slice(5)} />
                          <YAxis allowDecimals={false} className="text-xs" />
                          <ReTooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {SEVERITIES.map((s) => (
                            <Bar key={s.value} dataKey={s.value} stackId="sev" name={s.label} fill={s.bar}
                                 radius={s.value === 'critical' ? [3, 3, 0, 0] : undefined} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Active reports by category</CardTitle></CardHeader>
                  <CardContent>
                    {stats.by_category.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                        <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" /> No active reports — all clear!
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.by_category.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} className="text-xs" />
                            <YAxis type="category" dataKey="label" width={170} className="text-[11px]" />
                            <ReTooltip />
                            <Bar dataKey="count" name="Active" radius={[0, 4, 4, 0]}>
                              {stats.by_category.slice(0, 8).map((entry, i) => (
                                <Cell key={entry.category} fill={['#dc2626', '#ea580c', '#d97706', '#2563eb', '#0891b2', '#7c3aed', '#64748b', '#16a34a'][i % 8]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top recurring */}
            {stats && stats.top_recurring.length > 0 && (
              <Card className="glass-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Most frequent active issues</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {stats.top_recurring.map((r) => (
                    <button key={r.id}
                            onClick={() => { setTab('reports'); setSearch(r.title.slice(0, 40)); }}
                            className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/40 transition-colors">
                      <SeverityBadge severity={r.severity} />
                      <span className="flex-1 min-w-0 truncate text-sm">{r.title}</span>
                      <Badge variant="secondary" className="tabular-nums shrink-0">×{r.occurrence_count}</Badge>
                      <span className="text-xs text-muted-foreground shrink-0">{fmtAgo(r.last_seen)}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── REPORTS ──────────────────────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-4">
          {/* Filters */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search title, message, exception, path or user…"
                         value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
                </div>
                <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                  <SelectTrigger className="w-full lg:w-[220px]"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
                  <SelectTrigger className="w-full lg:w-[150px]"><SelectValue placeholder="Severity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-[150px]" />
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-[150px]" />
                </div>
                <Select value={ordering} onValueChange={setOrdering}>
                  <SelectTrigger className="w-full md:w-[210px]">
                    <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-muted-foreground" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-last_seen">Newest activity first</SelectItem>
                    <SelectItem value="last_seen">Oldest activity first</SelectItem>
                    <SelectItem value="-occurrence_count">Most occurrences</SelectItem>
                    <SelectItem value="-first_seen">Recently discovered</SelectItem>
                    <SelectItem value="title">Title A→Z</SelectItem>
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground md:ml-auto">
                    <Filter className="w-3.5 h-3.5 mr-1.5" /> Clear filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bulk actions bar */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                <Card className="glass-card border-primary/30">
                  <CardContent className="p-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium mr-2">{selected.size} selected</span>
                    <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => applyBulk('resolve')} className="text-emerald-600">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Resolve
                    </Button>
                    <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => applyBulk('investigate')} className="text-amber-600">
                      <Search className="w-4 h-4 mr-1.5" /> Investigate
                    </Button>
                    <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => applyBulk('ignore')}>
                      <EyeOff className="w-4 h-4 mr-1.5" /> Ignore
                    </Button>
                    <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => applyBulk('reopen')}>
                      <RefreshCw className="w-4 h-4 mr-1.5" /> Reopen
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground">
                      Clear
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List */}
          <Card className="glass-card">
            <CardHeader className="py-4 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                {reportCount} report{reportCount === 1 ? '' : 's'}
                {hasFilters && <span className="text-muted-foreground font-normal"> (filtered)</span>}
              </CardTitle>
              {reports.length > 0 && (
                <button
                  onClick={() => setSelected(selected.size === reports.length ? new Set() : new Set(reports.map((r) => r.id)))}
                  className="text-sm text-primary hover:underline"
                >
                  {selected.size === reports.length ? 'Deselect all' : 'Select page'}
                </button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {reports.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-70" />
                  <p className="font-medium mb-1">No reports found</p>
                  <p className="text-sm text-muted-foreground">
                    {hasFilters ? 'Try adjusting your filters.' : 'The system has not recorded any problems — all clear!'}
                  </p>
                </div>
              ) : (
                reports.map((report) => (
                  <ReportRow key={report.id} report={report} selected={selected.has(report.id)}
                             onToggleSelect={toggleSelect} onAction={applyAction} actionBusy={actionBusy} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TIMELINE ─────────────────────────────────────────────────── */}
        <TabsContent value="timeline">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-sm font-semibold">Significant system events</CardTitle></CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No significant events recorded yet.</p>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
                  <div className="space-y-5">
                    {timeline.map((event) => {
                      const meta = sevMeta(event.severity);
                      const Icon = meta.icon;
                      return (
                        <div key={event.id} className="relative">
                          <div className={cn(
                            'absolute -left-6 top-0.5 w-[19px] h-[19px] rounded-full border-2 border-background flex items-center justify-center',
                            meta.chip.replace('border-', 'ring-'),
                          )}>
                            <Icon className={cn('w-3 h-3', meta.color)} />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{event.title}</span>
                            <SeverityBadge severity={event.severity} />
                            <StatusBadge status={event.status} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.category_display} • {fmtDateTime(event.last_seen)}
                            {event.occurrence_count > 1 && ` • ${event.occurrence_count} occurrences`}
                            {event.user_display && ` • ${event.user_display}`}
                          </p>
                          {event.message && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.message}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACTIVITY LOG ─────────────────────────────────────────────── */}
        <TabsContent value="activity">
          <Card className="glass-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Admin activity & audit log
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => loadActivity()}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> Reload
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground p-8 text-center">No admin activity recorded.</p>
              ) : (
                <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-4 p-3.5 hover:bg-muted/40">
                      <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{log.userName || 'System'}</span>
                          <Badge variant="outline" className="text-xs">{log.actionType}</Badge>
                          <span className="text-xs text-muted-foreground">{log.entityType || 'System'}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{log.description || 'No description'}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual entry dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> Log a system entry
            </DialogTitle>
            <DialogDescription>
              Record maintenance work, downtime, outages or known bugs so they appear in the system history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newEntry.category} onValueChange={(v) => setNewEntry({ ...newEntry, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance Log</SelectItem>
                    <SelectItem value="downtime">Service Downtime</SelectItem>
                    <SelectItem value="outage">System Outage</SelectItem>
                    <SelectItem value="bug">System Bug</SelectItem>
                    <SelectItem value="network">Network Issue</SelectItem>
                    <SelectItem value="security_alert">Security Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select value={newEntry.severity} onValueChange={(v) => setNewEntry({ ...newEntry, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={newEntry.title} onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                     placeholder="e.g. Scheduled database maintenance" />
            </div>
            <div className="space-y-1.5">
              <Label>Details (optional)</Label>
              <Textarea rows={4} value={newEntry.message}
                        onChange={(e) => setNewEntry({ ...newEntry, message: e.target.value })}
                        placeholder="What happened, when, and what was done…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={createManualEntry} disabled={creating}>
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Record entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
