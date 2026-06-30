import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Inbox, Search, Check, X, Eye, Calendar, Mail, Phone, Briefcase, Building2, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { teacherService, type TeacherSignupRequest, type TeacherStats, type Teacher, type TeacherFilters } from '@/services/teacherService';
import { getErrorMessage } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import departmentService from '@/services/departmentService';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

// Shared, token-based status pill so requests + directory read consistently.
const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-success/10 text-success border-success/20',
  active: 'bg-success/10 text-success border-success/20',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  retired: 'bg-destructive/10 text-destructive border-destructive/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

function StatusBadge({ status }: { status?: string }) {
  const value = (status || 'unknown').toLowerCase();
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  return (
    <Badge variant="outline" className={cn('font-medium', STATUS_STYLES[value] || 'bg-muted text-muted-foreground border-border')}>
      {label}
    </Badge>
  );
}

// Compact stat tile reused across both tabs.
function StatTile({ label, value, icon: Icon, tint }: { label: string; value: number; icon: typeof Users; tint: string }) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', tint)}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="mt-3 text-[26px] leading-none font-semibold text-foreground tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

const TeacherRequestsTab = () => {
  const [requests, setRequests] = useState<TeacherSignupRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TeacherSignupRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<TeacherStats | null>(null);

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<TeacherSignupRequest | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Approval form state
  const [joiningDate, setJoiningDate] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  // Rejection form state
  const [rejectionReason, setRejectionReason] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [statusFilter]);

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery]);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters: any = { page_size: 100 };
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const response = await teacherService.getTeacherRequests(filters);
      setRequests(response.results || []);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast({
        title: 'Error',
        description: `Failed to load teacher requests: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await teacherService.getTeacherRequestStats();
      setStats(statsData);
    } catch {
      // Stats are non-critical; the cards simply stay hidden on failure.
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        (req.full_name_english || '').toLowerCase().includes(query) ||
        (req.full_name_bangla || '').toLowerCase().includes(query) ||
        (req.email || '').toLowerCase().includes(query) ||
        (req.designation || '').toLowerCase().includes(query) ||
        (req.department_name || '').toLowerCase().includes(query)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleView = (request: TeacherSignupRequest) => {
    setSelectedRequest(request);
    setViewModalOpen(true);
  };

  const handleApprove = (request: TeacherSignupRequest) => {
    setSelectedRequest(request);
    setJoiningDate('');
    setSubjects([]);
    setSubjectInput('');
    setReviewNotes('');
    setApproveModalOpen(true);
  };

  const handleReject = (request: TeacherSignupRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest) return;

    try {
      setIsProcessing(true);
      await teacherService.approveTeacherRequest(selectedRequest.id, {
        joining_date: joiningDate,
        subjects: subjects,
        review_notes: reviewNotes,
      });

      toast({
        title: 'Request approved',
        description: `${selectedRequest.full_name_english}'s teacher account has been created.`,
      });

      setApproveModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
      fetchStats();
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      await teacherService.rejectTeacherRequest(selectedRequest.id, {
        review_notes: rejectionReason,
      });

      toast({
        title: 'Request rejected',
        description: `${selectedRequest.full_name_english}'s signup request has been rejected.`,
      });

      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
      fetchStats();
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Total requests" value={stats.total} icon={Inbox} tint="bg-primary/10 text-primary" />
          <StatTile label="Pending" value={stats.pending} icon={Clock} tint="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
          <StatTile label="Approved" value={stats.approved} icon={Check} tint="bg-success/10 text-success" />
          <StatTile label="Rejected" value={stats.rejected} icon={X} tint="bg-destructive/10 text-destructive" />
        </div>
      )}

      {/* Filters */}
      <div className="surface p-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, designation…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests list */}
      <div className="surface">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[15px] font-semibold text-foreground">Signup requests</h3>
        </div>
        <div className="p-3 sm:p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={fetchRequests} className="mt-4">Try again</Button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No teacher requests found</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
                  className="rounded-xl border border-border p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground">{request.full_name_english}</h3>
                        <StatusBadge status={request.status} />
                      </div>
                      {request.full_name_bangla && (
                        <p className="text-sm text-muted-foreground mb-3">{request.full_name_bangla}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                          <Briefcase className="w-4 h-4 shrink-0" />
                          <span className="truncate">{request.designation}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                          <Building2 className="w-4 h-4 shrink-0" />
                          <span className="truncate">{request.department_name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                          <Mail className="w-4 h-4 shrink-0" />
                          <span className="truncate">{request.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span className="truncate">{request.mobile_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span className="truncate">Submitted {formatDate(request.submitted_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleView(request)} aria-label="View details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleApprove(request)} aria-label="Approve" className="text-success hover:text-success">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleReject(request)} aria-label="Reject" className="text-destructive hover:text-destructive">
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View details modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRequest.full_name_english}</DialogTitle>
                <DialogDescription>{selectedRequest.full_name_bangla}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Designation</Label>
                    <p className="font-medium text-sm">{selectedRequest.designation}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Department</Label>
                    <p className="font-medium text-sm">{selectedRequest.department_name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium text-sm break-all">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Mobile</Label>
                    <p className="font-medium text-sm">{selectedRequest.mobile_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Office location</Label>
                    <p className="font-medium text-sm">{selectedRequest.office_location || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-0.5"><StatusBadge status={selectedRequest.status} /></div>
                  </div>
                </div>
                {selectedRequest.qualifications && selectedRequest.qualifications.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Qualifications</Label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {selectedRequest.qualifications.map((qual, idx) => (
                        <Badge key={idx} variant="secondary">{qual}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRequest.specializations && selectedRequest.specializations.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Specializations</Label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {selectedRequest.specializations.map((spec, idx) => (
                        <Badge key={idx} variant="outline">{spec}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Submitted at</Label>
                  <p className="font-medium text-sm">{formatDateTime(selectedRequest.submitted_at)}</p>
                </div>
                {selectedRequest.reviewed_at && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Reviewed at</Label>
                    <p className="font-medium text-sm">{formatDateTime(selectedRequest.reviewed_at)}</p>
                  </div>
                )}
                {selectedRequest.review_notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Review notes</Label>
                    <p className="font-medium text-sm">{selectedRequest.review_notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve teacher request</DialogTitle>
            <DialogDescription>
              Approve {selectedRequest?.full_name_english}'s teacher signup request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="joiningDate">Joining date <span className="text-destructive">*</span></Label>
              <Input
                id="joiningDate"
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subjects">Subjects (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="subjects"
                  placeholder="Enter a subject name"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && subjectInput.trim()) {
                      e.preventDefault();
                      setSubjects([...subjects, subjectInput.trim()]);
                      setSubjectInput('');
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (subjectInput.trim()) {
                      setSubjects([...subjects, subjectInput.trim()]);
                      setSubjectInput('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {subjects.map((subject, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {subject}
                      <button
                        onClick={() => setSubjects(subjects.filter((_, i) => i !== idx))}
                        className="ml-0.5 hover:text-destructive"
                        aria-label={`Remove ${subject}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewNotes">Review notes (optional)</Label>
              <Textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this approval…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmApprove} disabled={!joiningDate || isProcessing}>
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving…</>
              ) : (
                'Approve request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject teacher request</DialogTitle>
            <DialogDescription>
              Reject {selectedRequest?.full_name_english}'s teacher signup request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rejectionReason">Reason for rejection <span className="text-destructive">*</span></Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection…"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={!rejectionReason.trim() || isProcessing}>
              {isProcessing ? (
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
};

const TeacherDirectoryTab = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  // Fetch is keyed on the department only. Status is applied client-side so the
  // summary tiles below stay stable when the user toggles the status filter.
  useEffect(() => {
    fetchTeachers();
  }, [departmentFilter]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    filterTeachers();
  }, [teachers, searchQuery, statusFilter]);

  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters: TeacherFilters = { page_size: 100 };
      if (departmentFilter !== 'all') {
        filters.department = departmentFilter;
      }

      const response = await teacherService.getTeachers(filters);
      setTeachers(response.results || []);
      setTotalCount(response.count ?? (response.results || []).length);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast({
        title: 'Error',
        description: `Failed to load teachers: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.getDepartments({ page_size: 100 });
      setDepartments(response.results.map(dept => ({ id: dept.id, name: dept.name })));
    } catch {
      // Department filter just stays empty if this fails; not fatal.
    }
  };

  const filterTeachers = () => {
    let filtered = [...teachers];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(teacher => teacher.employmentStatus === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(teacher =>
        (teacher.fullNameEnglish || '').toLowerCase().includes(query) ||
        (teacher.fullNameBangla || '').toLowerCase().includes(query) ||
        (teacher.email || '').toLowerCase().includes(query) ||
        (teacher.designation || '').toLowerCase().includes(query) ||
        (teacher.departmentName || '').toLowerCase().includes(query)
      );
    }

    setFilteredTeachers(filtered);
  };

  const handleView = (teacher: Teacher) => {
    navigate(`/teachers/${teacher.id}`);
  };

  // Summary tiles derive from the status-agnostic `teachers` set (department-scoped).
  const activeCount = teachers.filter(t => t.employmentStatus === 'active').length;
  const departmentCount = departmentFilter === 'all'
    ? new Set(teachers.map(t => t.department)).size
    : 1;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Total teachers" value={totalCount} icon={Users} tint="bg-primary/10 text-primary" />
        <StatTile label="Active" value={activeCount} icon={Check} tint="bg-success/10 text-success" />
        <StatTile label="Departments" value={departmentCount} icon={Building2} tint="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
      </div>

      {/* Filters */}
      <div className="surface p-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, designation…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Teachers list */}
      <div className="surface">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[15px] font-semibold text-foreground">All teachers ({filteredTeachers.length})</h3>
        </div>
        <div className="p-3 sm:p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={fetchTeachers} className="mt-4">Try again</Button>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No teachers found</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTeachers.map((teacher, index) => (
                <motion.div
                  key={teacher.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
                  className="rounded-xl border border-border p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <Avatar className="w-11 h-11 shrink-0">
                        <AvatarImage src={teacher.profilePhoto} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {teacher.fullNameEnglish?.charAt(0)?.toUpperCase() || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-0.5 flex-wrap">
                          <h3 className="font-semibold text-foreground">{teacher.fullNameEnglish}</h3>
                          <StatusBadge status={teacher.employmentStatus} />
                        </div>
                        {teacher.fullNameBangla && (
                          <p className="text-sm text-muted-foreground mb-2">{teacher.fullNameBangla}</p>
                        )}
                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2 min-w-0">
                            <Briefcase className="w-4 h-4 shrink-0" />
                            <span className="truncate">{teacher.designation}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 shrink-0" />
                            <span className="truncate">{teacher.departmentName || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="w-4 h-4 shrink-0" />
                            <span className="truncate">{teacher.email}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Phone className="w-4 h-4 shrink-0" />
                            <span className="truncate">{teacher.mobileNumber}</span>
                          </div>
                        </div>
                        {teacher.subjects && teacher.subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {teacher.subjects.map((subject, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs font-normal">{subject}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleView(teacher)} aria-label="View profile" className="shrink-0">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Teachers() {
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-foreground">Teachers</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage teacher signup requests and the staff directory.</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <Inbox className="w-4 h-4" />
            Teacher requests
          </TabsTrigger>
          <TabsTrigger value="directory" className="gap-2">
            <Users className="w-4 h-4" />
            All teachers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <TeacherRequestsTab />
        </TabsContent>

        <TabsContent value="directory" className="space-y-6">
          <TeacherDirectoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
