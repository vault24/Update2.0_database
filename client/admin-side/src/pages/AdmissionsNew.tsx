import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  admissionService,
  Admission,
  AdmissionFilters,
  AdmissionStats,
  AdmissionApproveData,
} from '@/services/admissionService';
import { getErrorMessage } from '@/lib/api';

const statuses = ['All', 'pending', 'approved', 'rejected'];
const departments = ['All', 'Computer', 'Electrical', 'Civil', 'Mechanical', 'Electronics', 'Power'];

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'approved':
      return 'bg-success/10 text-success border-success/20';
    case 'rejected':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function Admissions() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [stats, setStats] = useState<AdmissionStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Approve/Reject Dialog
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [approveData, setApproveData] = useState<AdmissionApproveData>({
    current_roll_number: '',
    current_registration_number: '',
    semester: 1,
    current_group: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    review_notes: '',
  });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch admissions
  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: AdmissionFilters = {
        page: currentPage,
        page_size: pageSize,
        ordering: '-submitted_at',
      };

      if (selectedStatus !== 'All') filters.status = selectedStatus;
      if (selectedDept !== 'All') filters.desired_department = selectedDept;
      if (searchQuery) filters.search = searchQuery;

      const response = await admissionService.getAdmissions(filters);
      setAdmissions(response.results);
      setTotalCount(response.count);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const statsData = await admissionService.getAdmissionStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Fetch on mount and filter changes
  useEffect(() => {
    fetchAdmissions();
  }, [currentPage, pageSize, selectedStatus, selectedDept]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchAdmissions();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleApproveClick = (admission: Admission) => {
    setSelectedAdmission(admission);
    setApproveData({
      current_roll_number: '',
      current_registration_number: '',
      semester: 1,
      current_group: admission.group || '',
      enrollment_date: new Date().toISOString().split('T')[0],
      review_notes: '',
    });
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (admission: Admission) => {
    setSelectedAdmission(admission);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedAdmission) return;

    try {
      setActionLoading(true);
      await admissionService.approveAdmission(selectedAdmission.id, approveData);

      toast({
        title: 'Success',
        description: 'Admission approved and student profile created',
      });

      setApproveDialogOpen(false);
      fetchAdmissions();
      fetchStats();
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAdmission || !rejectReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      await admissionService.rejectAdmission(selectedAdmission.id, {
        review_notes: rejectReason,
      });

      toast({
        title: 'Success',
        description: 'Admission rejected',
      });

      setRejectDialogOpen(false);
      fetchAdmissions();
      fetchStats();
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            Admissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage student admission requests ({totalCount} total)
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-4 border-l-4 border-l-warning"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 border-l-4 border-l-success"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-4 border-l-4 border-l-destructive"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <X className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && 'border-primary text-primary')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status === 'All' ? 'All' : getStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Admissions</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchAdmissions}>Try Again</Button>
        </div>
      )}

      {/* Admissions Table */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Applicant</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden md:table-cell">Contact</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden lg:table-cell">Department</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden xl:table-cell">SSC GPA</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground hidden xl:table-cell">Submitted</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admissions.map((admission, index) => (
                  <motion.tr
                    key={admission.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                          {admission.full_name_english.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{admission.full_name_english}</p>
                          <p className="text-xs text-muted-foreground">{admission.session}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <p className="text-sm text-muted-foreground">{admission.email}</p>
                      <p className="text-xs text-muted-foreground">{admission.mobile_student}</p>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <p className="text-sm text-muted-foreground">{admission.department_name || admission.desired_department}</p>
                    </td>
                    <td className="p-4 hidden xl:table-cell">
                      <p className="text-sm font-medium text-foreground">{admission.gpa}</p>
                    </td>
                    <td className="p-4 hidden xl:table-cell">
                      <p className="text-sm text-muted-foreground">
                        {new Date(admission.submitted_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <Badge className={cn('border', getStatusColor(admission.status))}>
                        {getStatusLabel(admission.status)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View Details"
                          onClick={() => navigate(`/admissions/${admission.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {admission.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                              title="Approve"
                              onClick={() => handleApproveClick(admission)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Reject"
                              onClick={() => handleRejectClick(admission)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Download Form">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {admissions.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No admissions found</p>
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              Showing {admissions.length} of {totalCount} admissions
            </span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Admission</DialogTitle>
            <DialogDescription>
              Enter student details to create their profile and approve the admission.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="roll">Roll Number *</Label>
              <Input
                id="roll"
                value={approveData.current_roll_number}
                onChange={(e) => setApproveData({ ...approveData, current_roll_number: e.target.value })}
                placeholder="e.g., 123456"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reg">Registration Number *</Label>
              <Input
                id="reg"
                value={approveData.current_registration_number}
                onChange={(e) => setApproveData({ ...approveData, current_registration_number: e.target.value })}
                placeholder="e.g., 1234567890"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="semester">Semester *</Label>
              <Select
                value={approveData.semester.toString()}
                onValueChange={(val) => setApproveData({ ...approveData, semester: parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group">Group *</Label>
              <Input
                id="group"
                value={approveData.current_group}
                onChange={(e) => setApproveData({ ...approveData, current_group: e.target.value })}
                placeholder="e.g., A"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="enrollment">Enrollment Date *</Label>
              <Input
                id="enrollment"
                type="date"
                value={approveData.enrollment_date}
                onChange={(e) => setApproveData({ ...approveData, enrollment_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Review Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={approveData.review_notes}
                onChange={(e) => setApproveData({ ...approveData, review_notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve & Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Admission</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this admission application.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject Admission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
