import { useState, useEffect, useRef, Fragment } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Eye, CheckCircle, XCircle, Clock, FileText,
  Calendar, User, Inbox, Download, MoreVertical, ArrowRight, Printer, History
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import applicationService, { Application, ApplicationStats } from '@/services/applicationService';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const applicationTypes = ['All Types', 'Testimonial', 'Certificate', 'Transcript', 'Stipend', 'Transfer', 'Other'];
const statusOptions = ['All Status', 'Pending', 'Approved', 'Rejected'];

interface DeptOption { id: string; name: string; code?: string }

function Applications() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Forward-to-second-approver UI state
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTarget, setForwardTarget] = useState<'institute_head' | 'department_head'>('institute_head');
  const [forwardDeptId, setForwardDeptId] = useState('');
  const [onlyAssignedToMe, setOnlyAssignedToMe] = useState(false);

  // The Principal defaults to their "Assigned to me" inbox (forwarded requests),
  // and can switch to "All" when they want the full list.
  const isPrincipal = !!user && (user.is_superuser || user.role === 'institute_head');
  const didDefaultView = useRef(false);
  useEffect(() => {
    if (user && !didDefaultView.current) {
      didDefaultView.current = true;
      if (isPrincipal) setOnlyAssignedToMe(true);
    }
  }, [user, isPrincipal]);

  useEffect(() => {
    apiClient.get<{ results?: DeptOption[] } | DeptOption[]>('departments/')
      .then((res: any) => setDepartments(res?.results || res || []))
      .catch(() => setDepartments([]));
  }, []);

  // Whether the logged-in admin is the current approver for this application.
  const canActOn = (app: Application | null): boolean => {
    if (!app || app.status !== 'pending' || !user) return false;
    const role = user.role;
    const target = app.current_approver_role;
    if (target === 'registrar') return role === 'registrar';
    if (target === 'institute_head') return role === 'institute_head' || !!user.is_superuser;
    if (target === 'department_head') {
      if (role !== 'department_head') return false;
      return !app.current_department || app.current_department === user.department;
    }
    return false;
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationService.getApplications({
        status: statusFilter,
        applicationType: typeFilter,
        search,
      });
      setApplications(response.results || []);
      
      const allApps = response.results || [];
      setStats({
        total: allApps.length,
        pending: allApps.filter(a => a.status === 'pending').length,
        approved: allApps.filter(a => a.status === 'approved').length,
        rejected: allApps.filter(a => a.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, typeFilter]);

  const assignedToMeCount = applications.filter((a) => canActOn(a)).length;

  const filteredApplications = applications.filter(a => {
    if (onlyAssignedToMe && !canActOn(a)) return false;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      a.fullNameEnglish.toLowerCase().includes(searchLower) ||
      a.rollNumber.includes(search) ||
      a.id.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/20 text-success border-success/30';
      case 'rejected': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'pending': return 'bg-warning/20 text-warning border-warning/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  // Compact horizontal progress steps shown inline under each application row,
  // so the workflow can be read at a glance without opening the detail.
  const trackerSteps = (app: Application): { label: string; dot: string; muted?: boolean }[] => {
    const steps: { label: string; dot: string; muted?: boolean }[] = [
      { label: 'Submitted', dot: 'bg-primary' },
    ];
    (app.approvals || []).forEach((ap) => {
      if (ap.action === 'forwarded') {
        steps.push({ label: `${ap.approver_role_label} → ${ap.forwarded_to_name}`, dot: 'bg-blue-500' });
      } else if (ap.action === 'rejected') {
        steps.push({ label: `${ap.approver_role_label} rejected`, dot: 'bg-destructive' });
      } else {
        steps.push({ label: `${ap.approver_role_label} approved`, dot: 'bg-success' });
      }
    });
    if (app.status === 'pending') {
      steps.push({ label: `With ${app.current_holder || '—'}`, dot: 'bg-warning animate-pulse' });
    } else if (app.status === 'approved') {
      steps.push({ label: 'Approved', dot: 'bg-success' });
    } else if (app.status === 'rejected') {
      steps.push({ label: 'Rejected', dot: 'bg-destructive' });
    }
    return steps;
  };

  const handleView = (app: Application) => {
    setSelectedApp(app);
    setAdminRemarks('');
    setForwardOpen(false);
    setForwardTarget('institute_head');
    setForwardDeptId('');
    setIsDetailOpen(true);
  };

  const handlePrintDocument = (app: Application) => {
    window.open(applicationService.getDocumentUrl(app.id), '_blank', 'noopener');
  };

  const handleForward = async () => {
    if (!selectedApp) return;
    if (forwardTarget === 'department_head' && !forwardDeptId) {
      toast({ title: 'Select a department', description: 'Choose which Department Head should receive this.', variant: 'destructive' });
      return;
    }
    try {
      setProcessing(true);
      await applicationService.forwardApplication(selectedApp.id, forwardTarget, {
        departmentId: forwardTarget === 'department_head' ? forwardDeptId : undefined,
        reviewNotes: adminRemarks,
      });
      toast({
        title: 'Application Forwarded',
        description: forwardTarget === 'institute_head'
          ? 'Sent to the Principal for final approval.'
          : 'Sent to the selected Department Head for final approval.',
      });
      setIsDetailOpen(false);
      fetchApplications();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to forward application.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    
    try {
      setProcessing(true);
      await applicationService.approveApplication(
        selectedApp.id,
        'Admin',
        adminRemarks
      );
      
      toast({ 
        title: "Application Approved", 
        description: `Application has been approved successfully.` 
      });
      
      setIsDetailOpen(false);
      fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    
    if (!adminRemarks.trim()) {
      toast({
        title: 'Remarks Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setProcessing(true);
      await applicationService.rejectApplication(
        selectedApp.id,
        'Admin',
        adminRemarks
      );
      
      toast({ 
        title: "Application Rejected", 
        description: `Application has been rejected.`, 
        variant: "destructive" 
      });
      
      setIsDetailOpen(false);
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-muted-foreground">Review and process student applications</p>
        </div>
        <Button className="gradient-primary text-primary-foreground">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Applications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search & Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, student name, or roll..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {applicationTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-md border border-border overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setOnlyAssignedToMe(true)}
                className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  onlyAssignedToMe ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <Inbox className="w-4 h-4" />
                Assigned to me{assignedToMeCount > 0 ? ` (${assignedToMeCount})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setOnlyAssignedToMe(false)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  !onlyAssignedToMe ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading applications...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app, index) => (
                  <Fragment key={app.id}>
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-muted/50 cursor-pointer border-b-0"
                    onClick={() => handleView(app)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-medium">{app.id.substring(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{app.fullNameEnglish}</p>
                        <p className="text-xs text-muted-foreground">Roll: {app.rollNumber} • {app.department}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{app.applicationType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(app.status)}>
                        {getStatusIcon(app.status)}
                        <span className="ml-1 capitalize">{app.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(app); }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                  {/* Inline progress tracker — visible without opening the application */}
                  <tr className="border-b border-border cursor-pointer hover:bg-muted/30" onClick={() => handleView(app)}>
                    <td colSpan={6} className="px-4 pb-3 pt-0">
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        {trackerSteps(app).map((s, i) => (
                          <Fragment key={i}>
                            {i > 0 && <span className="text-muted-foreground/50">→</span>}
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                              <span className="text-muted-foreground">{s.label}</span>
                            </span>
                          </Fragment>
                        ))}
                      </div>
                    </td>
                  </tr>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filteredApplications.length === 0 && !loading && (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No applications found matching your criteria.</p>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  Application {selectedApp.id.substring(0, 8)}
                </DialogTitle>
                <DialogDescription>
                  {selectedApp.applicationType} from {selectedApp.fullNameEnglish}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={getStatusColor(selectedApp.status)}>
                    {getStatusIcon(selectedApp.status)}
                    <span className="ml-1 capitalize">{selectedApp.status}</span>
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedApp.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{selectedApp.fullNameEnglish}</p>
                        <p className="text-sm text-muted-foreground">Roll: {selectedApp.rollNumber} • {selectedApp.department}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <p className="text-sm font-medium mb-2">Subject</p>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm">{selectedApp.subject}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Application Message</p>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm">{selectedApp.message}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Document */}
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Document</p>
                  <p className="font-medium">{selectedApp.template_name || selectedApp.applicationType}</p>
                </div>

                {/* Tracking timeline (same system as the student tracking view) */}
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" /> Application Tracking
                  </p>
                  <div className="relative pl-6 space-y-4">
                    <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-border" />

                    {/* Submitted */}
                    <div className="relative">
                      <span className="absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/15" />
                      <p className="text-sm font-medium">Submitted</p>
                      <p className="text-xs text-muted-foreground">{new Date(selectedApp.submittedAt).toLocaleString()}</p>
                    </div>

                    {/* Approval / forward steps */}
                    {(selectedApp.approvals || []).map((ap) => {
                      const dot = ap.action === 'rejected'
                        ? 'bg-destructive ring-destructive/15'
                        : ap.action === 'forwarded'
                          ? 'bg-blue-500 ring-blue-500/15'
                          : 'bg-success ring-success/15';
                      return (
                        <div key={ap.id} className="relative">
                          <span className={`absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full ring-4 ${dot}`} />
                          <p className="text-sm font-medium capitalize">
                            {ap.action === 'forwarded'
                              ? `${ap.approver_role_label} forwarded → ${ap.forwarded_to_name}`
                              : `${ap.action} by ${ap.approver_role_label}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ap.approver_name} • {new Date(ap.created_at).toLocaleString()}
                          </p>
                          {ap.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">“{ap.notes}”</p>}
                        </div>
                      );
                    })}

                    {/* Current holder / final state */}
                    <div className="relative">
                      {selectedApp.status === 'pending' ? (
                        <>
                          <span className="absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full bg-warning ring-4 ring-warning/20 animate-pulse" />
                          <p className="text-sm font-medium">Currently with {selectedApp.current_holder}</p>
                          <p className="text-xs text-muted-foreground">Awaiting review</p>
                        </>
                      ) : selectedApp.status === 'approved' ? (
                        <>
                          <span className="absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full bg-success ring-4 ring-success/20" />
                          <p className="text-sm font-medium text-success">Fully Approved</p>
                          <p className="text-xs text-muted-foreground">Signed document ready to download</p>
                        </>
                      ) : (
                        <>
                          <span className="absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full bg-destructive ring-4 ring-destructive/20" />
                          <p className="text-sm font-medium text-destructive">Rejected</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {selectedApp.reviewNotes && (
                  <div>
                    <p className="text-sm font-medium mb-2">Latest Notes</p>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <p className="text-sm">{selectedApp.reviewNotes}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedApp.status === 'pending' && canActOn(selectedApp) && (
                  <div className="space-y-2">
                    <Label>Remarks (required for rejection)</Label>
                    <Textarea
                      placeholder="Add remarks for approval / forward / rejection..."
                      value={adminRemarks}
                      onChange={(e) => setAdminRemarks(e.target.value)}
                    />
                  </div>
                )}

                {/* Forward panel (first-level Registrar only) */}
                {forwardOpen && (
                  <Card className="border-primary/30">
                    <CardContent className="p-4 space-y-3">
                      <Label>Forward for second approval to</Label>
                      <Select value={forwardTarget} onValueChange={(v) => setForwardTarget(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="institute_head">Principal</SelectItem>
                          <SelectItem value="department_head">Department Head</SelectItem>
                        </SelectContent>
                      </Select>
                      {forwardTarget === 'department_head' && (
                        <Select value={forwardDeptId} onValueChange={setForwardDeptId}>
                          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            {departments.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.name}{d.code ? ` (${d.code})` : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setForwardOpen(false)} disabled={processing}>Cancel</Button>
                        <Button size="sm" onClick={handleForward} disabled={processing}>
                          <ArrowRight className="w-4 h-4 mr-1" /> Confirm Forward
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)} disabled={processing}>
                  Close
                </Button>

                {selectedApp.status === 'approved' && (
                  <Button onClick={() => handlePrintDocument(selectedApp)} className="gradient-primary text-primary-foreground">
                    <Printer className="w-4 h-4 mr-2" />
                    View / Print Document
                  </Button>
                )}

                {selectedApp.status === 'pending' && canActOn(selectedApp) && !forwardOpen && (
                  <>
                    <Button variant="destructive" onClick={handleReject} disabled={processing}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    {/* Forwarding is the first-level Registrar's option */}
                    {selectedApp.current_approver_role === 'registrar' && (
                      <Button variant="outline" onClick={() => setForwardOpen(true)} disabled={processing}>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Forward
                      </Button>
                    )}
                    <Button
                      onClick={handleApprove}
                      className="bg-success text-success-foreground hover:bg-success/90"
                      disabled={processing}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {selectedApp.current_approver_role === 'registrar' ? 'Approve & Finish' : 'Approve'}
                    </Button>
                  </>
                )}

                {selectedApp.status === 'pending' && !canActOn(selectedApp) && (
                  <span className="text-xs text-muted-foreground self-center">
                    Awaiting {selectedApp.current_holder}
                  </span>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Applications;
