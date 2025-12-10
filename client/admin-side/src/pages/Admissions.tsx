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
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { admissionService, Admission } from '@/services/admissionService';
import { LoadingState } from '@/components/LoadingState';

const statuses = ['All', 'Pending', 'Approved', 'Rejected'];
const departments = ['All', 'Computer', 'Electrical', 'Civil', 'Mechanical', 'Electronics', 'Power'];

interface MappedAdmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  session: string;
  status: string;
  submittedAt: string;
  ssc: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending':
    case 'pending':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'Approved':
    case 'approved':
      return 'bg-success/10 text-success border-success/20';
    case 'Rejected':
    case 'rejected':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export default function Admissions() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [admissions, setAdmissions] = useState<MappedAdmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchAdmissions();
  }, [currentPage, selectedStatus, selectedDept]);

  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      const response = await admissionService.getAdmissions({
        page: currentPage,
        page_size: pageSize,
        status: selectedStatus !== 'All' ? selectedStatus.toLowerCase() : undefined,
        search: searchQuery || undefined,
      });

      const mapped = response.results.map((adm: Admission) => ({
        id: adm.id,
        name: adm.full_name_english,
        email: adm.email,
        phone: adm.mobile_student,
        department: adm.department_name || adm.desired_department,
        session: adm.session,
        status: adm.status.charAt(0).toUpperCase() + adm.status.slice(1),
        submittedAt: new Date(adm.submitted_at).toLocaleDateString(),
        ssc: adm.gpa,
      }));

      setAdmissions(mapped);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Error fetching admissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmissions = admissions.filter((admission) => {
    const matchesSearch =
      admission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admission.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All' || admission.department.includes(selectedDept);
    return matchesSearch && matchesDept;
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const pendingCount = admissions.filter((a) => a.status === 'Pending').length;
  const approvedCount = admissions.filter((a) => a.status === 'Approved').length;
  const rejectedCount = admissions.filter((a) => a.status === 'Rejected').length;

  const handleApprove = async (id: string) => {
    try {
      setProcessing(true);
      await admissionService.approveAdmission(id, {
        current_roll_number: `ROLL-${Date.now()}`,
        current_registration_number: `REG-${Date.now()}`,
        semester: 1,
        current_group: 'A',
        enrollment_date: new Date().toISOString().split('T')[0],
        review_notes: 'Approved by admin',
      });
      toast({
        title: 'Admission Approved',
        description: 'The admission request has been approved successfully.',
      });
      fetchAdmissions();
    } catch (error) {
      console.error('Error approving admission:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve admission. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessing(true);
      await admissionService.rejectAdmission(id, {
        review_notes: 'Rejected by admin',
      });
      toast({
        title: 'Admission Rejected',
        description: 'The admission request has been rejected.',
        variant: 'destructive',
      });
      fetchAdmissions();
    } catch (error) {
      console.error('Error rejecting admission:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject admission. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading && admissions.length === 0) {
    return <LoadingState message="Loading admissions..." />;
  }

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
          <p className="text-muted-foreground mt-1">Review and manage student admission requests</p>
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
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
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
              <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
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
              <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
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
                        {status}
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

      {/* Admissions Table */}
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
              {filteredAdmissions.map((admission, index) => (
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
                        {admission.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{admission.name}</p>
                        <p className="text-xs text-muted-foreground">{admission.session}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <p className="text-sm text-muted-foreground">{admission.email}</p>
                    <p className="text-xs text-muted-foreground">{admission.phone}</p>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <p className="text-sm text-muted-foreground">{admission.department}</p>
                  </td>
                  <td className="p-4 hidden xl:table-cell">
                    <p className="text-sm font-medium text-foreground">{admission.ssc}</p>
                  </td>
                  <td className="p-4 hidden xl:table-cell">
                    <p className="text-sm text-muted-foreground">{admission.submittedAt}</p>
                  </td>
                  <td className="p-4">
                    <Badge className={cn('border', getStatusColor(admission.status))}>
                      {admission.status}
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
                      {admission.status === 'Pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                            title="Approve"
                            onClick={() => handleApprove(admission.id)}
                            disabled={processing}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Reject"
                            onClick={() => handleReject(admission.id)}
                            disabled={processing}
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

        {/* Pagination */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            Showing {filteredAdmissions.length} of {totalCount} admissions
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
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0 || loading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
