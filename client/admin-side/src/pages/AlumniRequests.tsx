import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Clock, Loader2, AlertCircle, RefreshCw, X, Check, ShieldAlert,
  Building2, CheckCircle2, XCircle, GraduationCap, Briefcase, Users,
  CalendarDays, RotateCcw, Mail, UserPlus, FileSpreadsheet, BookOpen,
} from 'lucide-react';
import { AlumniReminderDialog } from '@/components/alumni/AlumniReminderDialog';
import { AlumniImportDialog } from '@/components/alumni/AlumniImportDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { alumniService, Alumni as AlumniType } from '@/services/alumniService';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { API_BASE_URL } from '@/config/api';

// Backend origin that serves uploaded files (strip the trailing "/api").
const FILE_BASE = API_BASE_URL.replace(/\/api\/?$/, '');

const resolveFileUrl = (path?: string): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${FILE_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

const ALL = 'all';

interface RequestItem {
  id: string;
  name: string;
  roll: string;
  department: string;
  graduationYear: string;
  currentJob: string;
  company: string;
  avatar: string;
  registeredAt: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  rejectionNotes: string;
}

const formatDate = (iso: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

/**
 * Alumni Requests — the review queue for self-registered alumni.
 * Approve / reject pending requests; revisit (and re-approve) rejected ones.
 * Approved alumni are managed on the Alumni Directory page.
 */
export default function AlumniRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'rejected'>('pending');
  const [department, setDepartment] = useState(ALL);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Review actions
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RequestItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchRequests();
    // Department Heads land on their own department's queue by default.
    if (user?.role === 'department_head' && user.department_name) {
      setDepartment(user.department_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await alumniService.getAlumni({ page_size: 1000 });
      const transformed: RequestItem[] = response.results.map((a: AlumniType) => ({
        id: a.student.id,
        name: a.student.fullNameEnglish || 'Unknown',
        roll: a.student.currentRollNumber || 'N/A',
        department: a.student.department?.name || 'Unknown',
        graduationYear: a.graduationYear?.toString() || 'N/A',
        currentJob: a.currentPosition?.positionTitle || '',
        company: a.currentPosition?.organizationName || '',
        avatar: resolveFileUrl(a.student.profilePhoto),
        registeredAt: a.createdAt || '',
        reviewStatus: (a.reviewStatus || 'approved') as RequestItem['reviewStatus'],
        rejectionNotes: a.verificationNotes || '',
      }));
      setRequests(transformed.filter((r) => r.reviewStatus !== 'approved'));
      setApprovedCount(transformed.filter((r) => r.reviewStatus === 'approved').length);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(
    () => Array.from(new Set(requests.map((r) => r.department).filter(Boolean))).sort(),
    [requests],
  );

  const pending = useMemo(
    () => requests.filter((r) => r.reviewStatus === 'pending' && (department === ALL || r.department === department)),
    [requests, department],
  );
  const rejected = useMemo(
    () => requests.filter((r) => r.reviewStatus === 'rejected' && (department === ALL || r.department === department)),
    [requests, department],
  );

  const totalPending = useMemo(() => requests.filter((r) => r.reviewStatus === 'pending').length, [requests]);
  const totalRejected = useMemo(() => requests.filter((r) => r.reviewStatus === 'rejected').length, [requests]);

  const handleApprove = async (request: RequestItem) => {
    setActionId(request.id);
    try {
      await alumniService.reviewAlumni(request.id, 'approve');
      toast.success(`${request.name} is now an approved alumnus.`);
      await fetchRequests();
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to approve the request.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await alumniService.reviewAlumni(rejectTarget.id, 'reject', rejectNotes.trim());
      toast.success(`${rejectTarget.name}'s alumni request was rejected.`);
      setRejectTarget(null);
      setRejectNotes('');
      await fetchRequests();
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to reject the request.');
    } finally {
      setRejecting(false);
    }
  };

  // Skeleton rather than a spinner: the page keeps its shape while loading,
  // so nothing jumps when the data lands (matches Dashboard).
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-52 rounded-md bg-muted animate-pulse" />
          <div className="mt-2 h-4 w-80 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface p-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
              </div>
              <div className="mt-3 h-7 w-12 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-44 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-72 max-w-full rounded bg-muted animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface max-w-md mx-auto mt-12 p-8 text-center">
        <div className="inline-flex w-12 h-12 items-center justify-center rounded-lg bg-destructive/10 mb-3">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <h3 className="text-[15px] font-semibold mb-1">Could not load requests</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchRequests} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header — flat, enterprise; primary action stands alone, the
          rest are quiet secondaries (matches Teachers / Dashboard). */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Alumni requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review self-registered alumni — they have no alumni access until approved.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchRequests} className="gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/alumni')} className="gap-2">
            <Users className="w-4 h-4" /> Directory
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReminderOpen(true)} className="gap-2">
            <Mail className="w-4 h-4" /> Reminders
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/alumni-requests/import-guide')} className="gap-2">
            <BookOpen className="w-4 h-4" /> গাইড
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Import
          </Button>
          <Button size="sm" onClick={() => navigate('/alumni/add')} className="gap-2">
            <UserPlus className="w-4 h-4" /> Add alumni
          </Button>
        </div>
      </div>

      {/* Queue stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile
          icon={Clock}
          label="Pending review"
          value={totalPending}
          // amber-600/400 rather than the raw --warning token: amber-500 as
          // text fails contrast on a light surface. Same convention as
          // Teachers / Dashboard.
          tint="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          hint={totalPending > 0 ? 'Awaiting your decision' : 'Nothing waiting'}
        />
        <StatTile
          icon={XCircle}
          label="Rejected"
          value={totalRejected}
          tint="bg-destructive/10 text-destructive"
          hint="Can be re-approved"
        />
        <StatTile
          icon={CheckCircle2}
          label="Approved alumni"
          value={approvedCount}
          tint="bg-success/10 text-success"
          hint="Open directory"
          onClick={() => navigate('/alumni')}
        />
      </div>

      {/* Tabs + department filter */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'pending' | 'rejected')}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" /> Pending
              {totalPending > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] justify-center px-1.5 tabular-nums">
                  {totalPending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="w-4 h-4" /> Rejected
              {totalRejected > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] justify-center px-1.5 tabular-nums">
                  {totalRejected}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="h-9 w-full sm:w-[220px]">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up!"
              message={department !== ALL
                ? `No pending alumni requests for ${department}.`
                : 'There are no pending alumni requests right now.'}
            />
          ) : (
            pending.map((request, index) => (
              <RequestCard key={request.id} request={request} index={index}>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/alumni/${request.id}`)} className="gap-1.5">
                  <Eye className="w-4 h-4" /> Review
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => handleApprove(request)}
                  disabled={actionId === request.id}
                >
                  {actionId === request.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => { setRejectTarget(request); setRejectNotes(''); }}
                  disabled={actionId === request.id}
                >
                  <X className="w-4 h-4" /> Reject
                </Button>
              </RequestCard>
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-3">
          {rejected.length === 0 ? (
            <EmptyState
              icon={XCircle}
              title="No rejected requests"
              message={department !== ALL
                ? `No rejected alumni requests for ${department}.`
                : 'Rejected requests will appear here for reference and can be re-approved.'}
            />
          ) : (
            rejected.map((request, index) => (
              <RequestCard key={request.id} request={request} index={index} rejected>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/alumni/${request.id}`)} className="gap-1.5">
                  <Eye className="w-4 h-4" /> View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-success border-success/30 hover:bg-success/10 hover:text-success"
                  onClick={() => handleApprove(request)}
                  disabled={actionId === request.id}
                >
                  {actionId === request.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RotateCcw className="w-4 h-4" />}
                  Re-approve
                </Button>
              </RequestCard>
            ))
          )}
        </TabsContent>
      </Tabs>

      <AlumniReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} />
      <AlumniImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={fetchRequests} />

      {/* Reject dialog (with notes shared with the applicant) */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectNotes(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Reject alumni request
            </DialogTitle>
            <DialogDescription>
              {rejectTarget ? `${rejectTarget.name} will not receive alumni access.` : ''}
              {' '}You can add a note explaining the decision — it is shared with the applicant.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Reason / notes (optional)…"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rejecting…</>
                : 'Reject request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------------- sub-components ----------------------------- */

/**
 * Queue stat tile — label above the number, tinted icon tile, tabular numbers.
 * Same shape as the Teachers / Dashboard tiles so the admin panel reads as one
 * system rather than a per-page palette.
 */
function StatTile({
  icon: Icon, label, value, tint, hint, onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tint: string;
  hint?: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'surface p-4 text-left w-full',
        onClick && 'transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', tint)}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums leading-none">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </Wrapper>
  );
}

function RequestCard({
  request, index, rejected, children,
}: {
  request: RequestItem;
  index: number;
  rejected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.24) }}
    >
      {/* Flat surface + a single status accent bar down the left edge: state is
          legible at a glance without tinting the whole card. */}
      <div className="surface relative overflow-hidden p-4 transition-colors hover:bg-accent/40">
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-0 left-0 w-1',
            rejected ? 'bg-destructive/40' : 'bg-amber-500',
          )}
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pl-2">
          <Avatar className="w-11 h-11 border border-border shrink-0">
            <AvatarImage src={request.avatar} />
            <AvatarFallback
              className={cn(
                'text-xs font-semibold',
                rejected ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
              )}
            >
              {request.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-foreground truncate">{request.name}</p>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">{request.roll}</span>
              <Badge
                variant="outline"
                className={cn(
                  'font-medium',
                  rejected
                    ? 'border-destructive/20 bg-destructive/10 text-destructive'
                    : 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
                )}
              >
                {rejected ? 'Rejected' : 'Pending'}
              </Badge>
            </div>
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {request.department}</span>
              {request.graduationYear !== 'N/A' && (
                <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Class of {request.graduationYear}</span>
              )}
              {request.currentJob && (
                <span className="flex items-center gap-1 truncate">
                  <Briefcase className="w-3.5 h-3.5" /> {request.currentJob}{request.company ? ` @ ${request.company}` : ''}
                </span>
              )}
              <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {formatDate(request.registeredAt)}</span>
            </div>
            {rejected && request.rejectionNotes && (
              <p className="mt-2 inline-block rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1 text-xs text-destructive">
                Rejection note: {request.rejectionNotes}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ icon: Icon, title, message }: { icon: React.ElementType; title: string; message: string }) {
  return (
    <div className="surface border-dashed p-12 text-center">
      <div className="inline-flex w-12 h-12 items-center justify-center rounded-lg bg-muted mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-[15px] font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
