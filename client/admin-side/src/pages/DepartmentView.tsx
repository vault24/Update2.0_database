import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, GraduationCap, Building2, Search, Eye, Edit, X,
  TrendingUp, Loader2, CheckSquare, Square, ArrowRight, UserCheck,
  Check, Clock, ShieldAlert, Sun, Moon, XCircle, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import captainRequestService, { CaptainRequest } from '@/services/captainRequestService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import departmentService, { DepartmentHead } from '@/services/departmentService';
import { studentService, Student as StudentType } from '@/services/studentService';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Department {
  id: string;
  name: string;
  short_name: string;
  heads?: DepartmentHead[];
  photo_url?: string | null;
  total_students: number;
  active_students: number;
  faculty_count: number;
  established_year: string;
  description: string;
  is_active: boolean;
}

/** Resolve a possibly-relative photo URL against the backend origin. */
const resolvePhotoUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const headShiftShort: Record<string, string> = { '1st_shift': '1st', '2nd_shift': '2nd' };

/** Department photo with a graceful fallback to the code badge. */
function DeptPhoto({ photoUrl, code, name }: { photoUrl: string | null; code: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setFailed(true)}
        className="w-14 h-14 rounded-xl object-cover border border-border shrink-0"
      />
    );
  }
  return (
    <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shrink-0">
      <span className="text-xl font-semibold text-primary-foreground">{code?.slice(0, 3) || '—'}</span>
    </div>
  );
}

type Student = StudentType;

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
// The institute runs Morning and Day shifts only.
const shifts = ['Morning', 'Day'];

// A Department Head account's shift ('1st_shift'/'2nd_shift') expressed in the
// student-side vocabulary used by filters and captain requests.
const headShiftToStudentShift = (shift?: string): string | null =>
  shift === '1st_shift' ? 'Morning' : shift === '2nd_shift' ? 'Day' : null;

export default function DepartmentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isDeptHead = user?.role === 'department_head';

  // Always fetch fresh from the API — router state from the list page has a
  // different shape (code/established vs short_name/established_year), which
  // used to break the header badge, photo and head display.
  const [department, setDepartment] = useState<Department | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  // Department Heads start with their own shift pre-selected.
  const [selectedShift, setSelectedShift] = useState<string | null>(
    isDeptHead ? headShiftToStudentShift(user?.shift) : null
  );

  // Captain account requests for this department (all statuses) — reviewed
  // from a popup dialog instead of an inline card.
  const [captainRequests, setCaptainRequests] = useState<CaptainRequest[]>([]);
  const [captainLoading, setCaptainLoading] = useState(true);
  const [captainOpen, setCaptainOpen] = useState(false);
  const [captainTab, setCaptainTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  // Shift filter inside the dialog — defaults to the head's own shift.
  const [captainShift, setCaptainShift] = useState<string>(
    (isDeptHead && headShiftToStudentShift(user?.shift)) || 'all'
  );
  const [captainActionId, setCaptainActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CaptainRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Bulk semester promotion (no result entry required)
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteSemester, setPromoteSemester] = useState<number | null>(null);
  const [promoteStudents, setPromoteStudents] = useState<Student[]>([]);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const openPromoteDialog = () => {
    setPromoteSemester(selectedSemester ?? null);
    setExcludedIds(new Set());
    setPromoteStudents([]);
    setPromoteOpen(true);
  };

  // Load the active students of the chosen semester whenever it changes.
  useEffect(() => {
    const loadPromoteStudents = async () => {
      if (!promoteOpen || !id || promoteSemester === null) return;
      setPromoteLoading(true);
      try {
        const response = await studentService.getStudents({
          department: id,
          semester: promoteSemester,
          status: 'active',
          page_size: 1000,
        } as any);
        setPromoteStudents(response.results || []);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load students for promotion',
          variant: 'destructive',
        });
        setPromoteStudents([]);
      } finally {
        setPromoteLoading(false);
      }
    };
    loadPromoteStudents();
  }, [promoteOpen, promoteSemester, id, toast]);

  const toggleExcluded = (studentId: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handlePromote = async () => {
    if (!id || promoteSemester === null) return;
    setPromoting(true);
    try {
      const result = await departmentService.promoteStudents(
        id,
        promoteSemester,
        Array.from(excludedIds)
      );
      toast({
        title: 'Students promoted',
        description: `${result.promoted} student(s) promoted to semester ${result.toSemester}` +
          (result.excluded > 0 ? ` (${result.excluded} excluded).` : '.'),
      });
      setPromoteOpen(false);
      // Refresh the table so the new semesters show everywhere.
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast({
        title: 'Promotion failed',
        description: err?.response?.data?.error || err?.message || 'Failed to promote students',
        variant: 'destructive',
      });
    } finally {
      setPromoting(false);
    }
  };

  // Load ALL captain account requests for this department (any status). The
  // backend additionally scopes Department Heads to their own dept + shift.
  const fetchCaptainRequests = async () => {
    if (!id) return;
    setCaptainLoading(true);
    try {
      const response = await captainRequestService.getRequests({ department: id });
      setCaptainRequests(response.results || []);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load captain account requests',
        variant: 'destructive',
      });
      setCaptainRequests([]);
    } finally {
      setCaptainLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptainRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pendingCaptainCount = captainRequests.filter((r) => r.status === 'pending').length;

  // Requests shown in the dialog for the active tab + shift filter.
  const visibleCaptainRequests = captainRequests.filter(
    (r) => r.status === captainTab && (captainShift === 'all' || r.shift === captainShift)
  );

  const handleApproveCaptain = async (request: CaptainRequest) => {
    setCaptainActionId(request.id);
    try {
      await captainRequestService.review(request.id, 'approve');
      toast({
        title: 'Captain request approved',
        description: `${request.name} is now a Class Captain.`,
      });
      await fetchCaptainRequests();
    } catch (err: any) {
      toast({
        title: 'Approval failed',
        description: err?.detail || err?.message || 'Failed to approve the request.',
        variant: 'destructive',
      });
    } finally {
      setCaptainActionId(null);
    }
  };

  const handleRejectCaptain = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await captainRequestService.review(rejectTarget.id, 'reject', rejectReason.trim());
      toast({
        title: 'Captain request rejected',
        description: `${rejectTarget.name}'s account continues as a regular student.`,
      });
      setRejectTarget(null);
      setRejectReason('');
      await fetchCaptainRequests();
    } catch (err: any) {
      toast({
        title: 'Rejection failed',
        description: err?.detail || err?.message || 'Failed to reject the request.',
        variant: 'destructive',
      });
    } finally {
      setRejecting(false);
    }
  };

  // Fetch department details (always fresh — see the state comment above).
  useEffect(() => {
    const fetchDepartment = async () => {
      if (!id) return;
      try {
        const data = await departmentService.getDepartment(id);
        setDepartment(data as unknown as Department);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load department details',
          variant: 'destructive',
        });
        navigate('/departments');
      }
    };

    fetchDepartment();
  }, [id, navigate, toast]);

  // Fetch students based on filters
  useEffect(() => {
    const fetchStudents = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const filters: any = {
          department: id,
          // The department page lists currently-enrolled students only —
          // graduated/alumni belong on the Alumni page, not here.
          status: 'active',
          page_size: 1000, // Get all students for this department
        };

        if (selectedSemester !== null) {
          filters.semester = selectedSemester;
        }

        if (selectedShift !== null) {
          filters.shift = selectedShift;
        }

        if (search.trim()) {
          filters.search = search.trim();
        }

        const response = await studentService.getStudents(filters);
        setStudents(response.results || []);
      } catch {
        setError('Failed to load students');
        toast({
          title: 'Error',
          description: 'Failed to load students',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [id, selectedSemester, selectedShift, search, toast, refreshKey]);

  if (!department) {
    return <LoadingState />;
  }

  if (error && !loading) {
    return <ErrorState error={error} />;
  }

  const handleStudentClick = (studentId: string) => {
    navigate(`/students/${studentId}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'graduated':
        return 'outline';
      case 'discontinued':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const hasFilters = selectedSemester !== null || selectedShift !== null || !!search;
  const clearFilters = () => {
    setSelectedSemester(null);
    setSelectedShift(null);
    setSearch('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/departments')} className="shrink-0" aria-label="Back to departments">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4 min-w-0">
            {/* Department photo (falls back to the code badge) */}
            <DeptPhoto photoUrl={resolvePhotoUrl(department.photo_url)} code={department.short_name} name={department.name} />
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate">{department.name}</h1>
              <p className="text-sm text-muted-foreground">
                {department.short_name}
                {department.established_year ? ` · Established ${department.established_year}` : ''}
              </p>
              {/* Real assigned Department Heads (max 2, newest first) */}
              {(department.heads?.length ?? 0) > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {department.heads!.slice(0, 2).map((h) => (
                    <Badge key={h.id} variant="secondary" className="gap-1 font-normal">
                      <UserCheck className="w-3 h-3" />
                      {h.name}
                      {h.shift && (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          · {headShiftShort[h.shift] || h.shift}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => setCaptainOpen(true)} className="relative">
            <UserCheck className="w-4 h-4 mr-1.5" />
            Captain Requests
            {pendingCaptainCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
                {pendingCaptainCount}
              </span>
            )}
          </Button>
          <Button onClick={openPromoteDialog}>
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Promote students
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Active students</p>
            <div className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center"><Users className="w-[18px] h-[18px]" /></div>
          </div>
          <p className="mt-3 text-[26px] leading-none font-semibold text-foreground tabular-nums">{department.active_students || 0}</p>
        </div>
        <div className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Faculty members</p>
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center"><GraduationCap className="w-[18px] h-[18px]" /></div>
          </div>
          <p className="mt-3 text-[26px] leading-none font-semibold text-foreground tabular-nums">{department.faculty_count || 0}</p>
        </div>
        <button
          className="surface p-4 text-left transition-colors hover:border-primary/40 cursor-pointer"
          onClick={() => setCaptainOpen(true)}
        >
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Captain requests</p>
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><UserCheck className="w-[18px] h-[18px]" /></div>
          </div>
          <p className="mt-3 text-[26px] leading-none font-semibold text-foreground tabular-nums">{pendingCaptainCount}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">pending · click to review</p>
        </button>
      </div>

      {/* Filters — semester + shift + search in one box */}
      <div className="surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground">Filters</h3>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-muted-foreground">
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-x-6 gap-y-4">
          {/* Semester */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Semester</p>
            <div className="flex flex-wrap gap-1.5">
              {semesters.map((semester) => (
                <button
                  key={semester}
                  onClick={() => setSelectedSemester(selectedSemester === semester ? null : semester)}
                  className={cn(
                    'h-9 w-9 rounded-md border text-sm font-medium transition-colors',
                    selectedSemester === semester
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-accent hover:border-primary/40'
                  )}
                >
                  {semester}
                </button>
              ))}
            </div>
          </div>

          {/* Shift */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Shift</p>
            <div className="flex flex-wrap gap-1.5">
              {shifts.map((shift) => (
                <button
                  key={shift}
                  onClick={() => setSelectedShift(selectedShift === shift ? null : shift)}
                  className={cn(
                    'h-9 px-4 rounded-md border text-sm font-medium transition-colors',
                    selectedShift === shift
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-accent hover:border-primary/40'
                  )}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name or roll number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Students table */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground">Students</h3>
          <span className="text-sm text-muted-foreground">{students.length} shown</span>
        </div>
        {loading ? (
          <div className="p-12"><LoadingState /></div>
        ) : students.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Semester</TableHead>
                <TableHead className="text-center">Shift</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow
                  key={student.id}
                  className="hover:bg-accent cursor-pointer"
                  onClick={() => handleStudentClick(student.id)}
                >
                  <TableCell className="font-medium">{student.currentRollNumber}</TableCell>
                  <TableCell>{student.fullNameEnglish}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{student.semester}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{student.shift}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusBadgeVariant(student.status)}>
                      {getStatusLabel(student.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="View student" onClick={(e) => { e.stopPropagation(); handleStudentClick(student.id); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Edit student" onClick={(e) => { e.stopPropagation(); navigate(`/students/${student.id}/edit`); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">No students found</p>
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? 'No students match the selected filters. Try adjusting your selection.'
                : 'No students found in this department.'}
            </p>
          </div>
        )}
      </div>

      {/* Bulk semester promotion dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Bulk semester promotion
            </DialogTitle>
            <DialogDescription>
              Promote all active students of a semester to the next semester — no result entry
              required. Untick any students you want to exclude.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Semester picker */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Promote from semester</p>
              <div className="flex flex-wrap gap-1.5">
                {semesters.filter((s) => s < 8).map((semester) => (
                  <button
                    key={semester}
                    onClick={() => { setPromoteSemester(semester); setExcludedIds(new Set()); }}
                    className={cn(
                      'h-9 w-9 rounded-md border text-sm font-medium transition-colors',
                      promoteSemester === semester
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:bg-accent hover:border-primary/40'
                    )}
                  >
                    {semester}
                  </button>
                ))}
              </div>
              {promoteSemester !== null && (
                <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5">
                  Semester {promoteSemester}
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground">Semester {promoteSemester + 1}</span>
                </p>
              )}
            </div>

            {/* Student list */}
            {promoteSemester === null ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                Select a semester to load its students.
              </div>
            ) : promoteLoading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading students…
              </div>
            ) : promoteStudents.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                No active students found in semester {promoteSemester}.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {promoteStudents.length - excludedIds.size} of {promoteStudents.length} students
                    will be promoted
                  </span>
                  {excludedIds.size > 0 && (
                    <button
                      className="text-primary hover:underline"
                      onClick={() => setExcludedIds(new Set())}
                    >
                      Include all
                    </button>
                  )}
                </div>
                <div className="border border-border rounded-lg overflow-y-auto max-h-[320px] divide-y divide-border">
                  {promoteStudents.map((student) => {
                    const excluded = excludedIds.has(student.id);
                    return (
                      <button
                        key={student.id}
                        onClick={() => toggleExcluded(student.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent',
                          excluded && 'opacity-50'
                        )}
                      >
                        {excluded ? (
                          <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <span className="font-mono text-sm text-muted-foreground w-32 shrink-0 truncate">
                          {student.currentRollNumber}
                        </span>
                        <span className="text-sm font-medium truncate flex-1">{student.fullNameEnglish}</span>
                        {excluded && <Badge variant="outline" className="shrink-0">Excluded</Badge>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)} disabled={promoting}>
              Cancel
            </Button>
            <Button
              onClick={handlePromote}
              disabled={
                promoting ||
                promoteSemester === null ||
                promoteLoading ||
                promoteStudents.length === 0 ||
                promoteStudents.length - excludedIds.size === 0
              }
            >
              {promoting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Promoting…</>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Promote {promoteSemester !== null ? promoteStudents.length - excludedIds.size : ''} student{promoteStudents.length - excludedIds.size === 1 ? '' : 's'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Captain account requests dialog — review the queue in a popup */}
      <Dialog open={captainOpen} onOpenChange={setCaptainOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Captain account requests
            </DialogTitle>
            <DialogDescription>
              Requests are routed here by department and shift. Approving upgrades the student to a
              Class Captain account.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={captainTab} onValueChange={(v) => setCaptainTab(v as typeof captainTab)} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <TabsList>
                <TabsTrigger value="pending" className="gap-1.5">
                  <Clock className="w-4 h-4" /> Pending
                  {pendingCaptainCount > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                      {pendingCaptainCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-1.5"><CheckCircle2 className="w-4 h-4" /> Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="gap-1.5"><XCircle className="w-4 h-4" /> Rejected</TabsTrigger>
              </TabsList>

              {/* Shift filter — defaults to the head's own shift */}
              <div className="flex items-center gap-1.5">
                {([['all', 'All'], ['Morning', '1st (Morning)'], ['Day', '2nd (Day)']] as [string, string][]).map(([value, label]) => {
                  const Icon = value === 'Morning' ? Sun : value === 'Day' ? Moon : Users;
                  return (
                    <button
                      key={value}
                      onClick={() => setCaptainShift(value)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all',
                        captainShift === value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      <Icon className="w-3 h-3" /> {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <TabsContent value={captainTab} forceMount className="mt-3 flex-1 overflow-y-auto">
              {captainLoading ? (
                <div className="p-8 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading requests…
                </div>
              ) : visibleCaptainRequests.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-10 text-center">
                  <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No {captainTab} captain requests{captainShift !== 'all' ? ` for the ${captainShift} shift` : ''}.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {visibleCaptainRequests.map((request) => (
                    <div key={request.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground truncate">{request.name}</p>
                          <Badge variant="secondary">{request.shift === 'Morning' ? '1st Shift (Morning)' : '2nd Shift (Day)'}</Badge>
                          {request.student_id && <Badge variant="outline" className="font-mono">{request.student_id}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {request.email}
                          {request.mobile_number ? ` • ${request.mobile_number}` : ''}
                          {' • '}Requested {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        {request.status === 'rejected' && request.rejection_reason && (
                          <p className="mt-1.5 text-xs text-destructive/90 bg-destructive/5 border border-destructive/20 rounded-md px-2 py-1 inline-block">
                            Reason: {request.rejection_reason}
                          </p>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleApproveCaptain(request)}
                            disabled={captainActionId === request.id}
                          >
                            {captainActionId === request.id ? (
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-1.5" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => { setRejectTarget(request); setRejectReason(''); }}
                            disabled={captainActionId === request.id}
                          >
                            <X className="w-4 h-4 mr-1.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {request.status === 'approved' && (
                        <Badge className="shrink-0 bg-success/15 text-success border-0">Approved</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCaptainOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject captain request dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Reject captain request
            </DialogTitle>
            <DialogDescription>
              {rejectTarget ? `${rejectTarget.name}'s account will continue as a regular student.` : ''}
              {' '}You can optionally include a reason — it is shared with the requester.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional)…"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectCaptain} disabled={rejecting}>
              {rejecting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rejecting…</>
              ) : (
                'Reject request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
