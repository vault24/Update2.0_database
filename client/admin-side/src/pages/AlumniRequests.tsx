import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Clock, Loader2, AlertCircle, RefreshCw, X, Check, ShieldAlert,
  Inbox, Building2, CheckCircle2, XCircle, GraduationCap, Briefcase,
  CalendarDays, ArrowLeft, RotateCcw, Mail, UserPlus, FileSpreadsheet, BookOpen,
} from 'lucide-react';
import { AlumniReminderDialog } from '@/components/alumni/AlumniReminderDialog';
import { AlumniImportDialog } from '@/components/alumni/AlumniImportDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading alumni requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Requests</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchRequests}><RefreshCw className="w-4 h-4 mr-2" /> Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 p-6 text-white shadow-lg"
      >
        <div className="absolute -right-8 -top-8 opacity-10">
          <Inbox className="w-44 h-44" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Alumni Requests</h1>
            <p className="text-white/85">
              Review self-registered alumni — they have no alumni access until approved.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={fetchRequests} className="bg-white/15 hover:bg-white/25 text-white border-0">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setReminderOpen(true)} className="bg-white/15 hover:bg-white/25 text-white border-0">
              <Mail className="w-4 h-4 mr-2" /> Completion Reminders
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/alumni')} className="bg-white/15 hover:bg-white/25 text-white border-0">
              <ArrowLeft className="w-4 h-4 mr-2" /> Alumni Directory
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/alumni-requests/import-guide')} className="bg-white/15 hover:bg-white/25 text-white border-0">
              <BookOpen className="w-4 h-4 mr-2" /> ইম্পোর্ট গাইড
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)} className="bg-white/15 hover:bg-white/25 text-white border-0">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Import
            </Button>
            <Button size="sm" onClick={() => navigate('/alumni/add')} className="bg-white text-orange-600 hover:bg-white/90">
              <UserPlus className="w-4 h-4 mr-2" /> Create New Alumni
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Queue stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Clock} label="Pending Review" value={totalPending} tone="orange" />
        <StatCard icon={XCircle} label="Rejected" value={totalRejected} tone="red" />
        <StatCard icon={CheckCircle2} label="Approved Alumni" value={approvedCount} tone="green" onClick={() => navigate('/alumni')} />
      </div>

      {/* Tabs + department filter */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'pending' | 'rejected')}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="w-4 h-4" /> Pending
              {totalPending > 0 && <Badge className="bg-orange-500 text-white ml-1 h-5 min-w-[20px] px-1.5">{totalPending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5">
              <XCircle className="w-4 h-4" /> Rejected
              {totalRejected > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">{totalRejected}</Badge>}
            </TabsTrigger>
          </TabsList>

          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="h-9 w-full sm:w-[220px]">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
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
                <Button size="sm" variant="ghost" onClick={() => navigate(`/alumni/${request.id}`)}>
                  <Eye className="w-4 h-4 mr-1.5" /> Review
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(request)}
                  disabled={actionId === request.id}
                >
                  {actionId === request.id
                    ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    : <Check className="w-4 h-4 mr-1.5" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => { setRejectTarget(request); setRejectNotes(''); }}
                  disabled={actionId === request.id}
                >
                  <X className="w-4 h-4 mr-1.5" /> Reject
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
                <Button size="sm" variant="ghost" onClick={() => navigate(`/alumni/${request.id}`)}>
                  <Eye className="w-4 h-4 mr-1.5" /> View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-700 border-green-600/40 hover:bg-green-600/10 hover:text-green-700"
                  onClick={() => handleApprove(request)}
                  disabled={actionId === request.id}
                >
                  {actionId === request.id
                    ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    : <RotateCcw className="w-4 h-4 mr-1.5" />}
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

function StatCard({
  icon: Icon, label, value, tone, onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: 'orange' | 'red' | 'green';
  onClick?: () => void;
}) {
  const tones = {
    orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
    red: 'bg-red-500/15 text-red-600 dark:text-red-300',
    green: 'bg-green-500/15 text-green-600 dark:text-green-300',
  } as const;
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:bg-muted/50 hover:shadow-sm transition-all' : ''}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
          <p className="text-[11px] text-muted-foreground truncate font-medium">{label}</p>
        </div>
      </CardContent>
    </Card>
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className={`border-2 ${rejected ? 'border-border/50' : 'border-orange-500/30'}`}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Avatar className="w-12 h-12 border border-border shrink-0">
              <AvatarImage src={request.avatar} />
              <AvatarFallback className={`text-sm font-bold ${
                rejected
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
              }`}>
                {request.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground truncate">{request.name}</p>
                <span className="text-xs text-muted-foreground font-mono">{request.roll}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {request.department}</span>
                {request.graduationYear !== 'N/A' && (
                  <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Class of {request.graduationYear}</span>
                )}
                {request.currentJob && (
                  <span className="flex items-center gap-1 truncate">
                    <Briefcase className="w-3 h-3" /> {request.currentJob}{request.company ? ` @ ${request.company}` : ''}
                  </span>
                )}
                <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(request.registeredAt)}</span>
              </div>
              {rejected && request.rejectionNotes && (
                <p className="mt-1.5 text-xs text-destructive/90 bg-destructive/5 border border-destructive/20 rounded-md px-2 py-1 inline-block">
                  Rejection note: {request.rejectionNotes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {children}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState({ icon: Icon, title, message }: { icon: React.ElementType; title: string; message: string }) {
  return (
    <Card className="border-2 border-dashed border-border">
      <CardContent className="p-12 text-center">
        <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
          <Icon className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
