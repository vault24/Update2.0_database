import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  CheckCircle,
  X,
  User,
  MapPin,
  GraduationCap,
  BookOpen,
  FileText,
  Phone,
  Mail,
  Calendar,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { admissionService, Admission } from '@/services/admissionService';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { useAuth } from '@/contexts/AuthContext';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="glass-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                {title}
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '-'}</span>
    </div>
  );
}

export default function AdmissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAdmissionDetails();
    }
  }, [id]);

  const fetchAdmissionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await admissionService.getAdmission(id!);
      setAdmission(data);
    } catch (err: any) {
      console.error('Error fetching admission details:', err);
      setError(err.message || 'Failed to load admission details');
      toast({
        title: 'Error',
        description: 'Failed to load admission details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!admission) return;

    try {
      setProcessing(true);
      // For now, we'll use default values for the required fields
      // In a real implementation, you might want to show a form to collect these
      await admissionService.approveAdmission(admission.id, {
        current_roll_number: `ROLL-${Date.now()}`,
        current_registration_number: `REG-${Date.now()}`,
        semester: 1,
        current_group: admission.group || 'A',
        enrollment_date: new Date().toISOString().split('T')[0],
        review_notes: `Approved by ${user?.username || 'Admin'}`,
      });

      toast({
        title: 'Admission Approved',
        description: 'Admission application has been approved successfully.',
      });

      setApproveDialogOpen(false);
      setTimeout(() => {
        navigate('/admissions');
      }, 1500);
    } catch (err: any) {
      console.error('Error approving admission:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to approve admission. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!admission) return;

    if (!rejectionReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessing(true);
      await admissionService.rejectAdmission(admission.id, {
        review_notes: rejectionReason,
      });

      toast({
        title: 'Admission Rejected',
        description: 'Admission application has been rejected.',
        variant: 'destructive',
      });

      setRejectDialogOpen(false);
      setRejectionReason('');
      setTimeout(() => {
        navigate('/admissions');
      }, 1500);
    } catch (err: any) {
      console.error('Error rejecting admission:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to reject admission. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
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

  if (loading) {
    return <LoadingState message="Loading admission details..." />;
  }

  if (error || !admission) {
    return (
      <ErrorState
        title="Failed to Load Admission"
        error={error || 'Admission not found'}
        onRetry={fetchAdmissionDetails}
      />
    );
  }

  const currentAdmin = user?.username || 'Admin User';
  const statusDisplay = admission.status.charAt(0).toUpperCase() + admission.status.slice(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admissions')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Admission Application Details</h1>
          <p className="text-muted-foreground">Review complete admission application information</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(admission.status)}>{statusDisplay}</Badge>
          {admission.status === 'pending' && (
            <>
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setRejectDialogOpen(true)}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                className="gradient-success text-success-foreground"
                onClick={() => setApproveDialogOpen(true)}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Application Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <Avatar className="w-32 h-32 border-4 border-primary/20 ring-4 ring-primary/10">
                <AvatarFallback className="gradient-primary text-primary-foreground text-4xl">
                  {admission.full_name_english.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{admission.full_name_english}</h2>
                <p className="text-lg text-muted-foreground font-medium">{admission.full_name_bangla}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Application ID</p>
                    <p className="font-mono text-sm font-bold text-primary">{admission.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm font-medium">{admission.department_name || admission.desired_department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Session</p>
                    <p className="text-sm font-medium">{admission.session}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-sm font-medium">{new Date(admission.submitted_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Information Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <CollapsibleSection title="Personal Information" icon={<User className="w-4 h-4" />} defaultOpen>
            <div className="space-y-1">
              <InfoRow label="Full Name (English)" value={admission.full_name_english} />
              <InfoRow label="Full Name (Bangla)" value={admission.full_name_bangla} />
              <InfoRow label="Father's Name" value={admission.father_name} />
              <InfoRow label="Father's NID" value={admission.father_nid} />
              <InfoRow label="Mother's Name" value={admission.mother_name} />
              <InfoRow label="Mother's NID" value={admission.mother_nid} />
              <InfoRow label="Date of Birth" value={admission.date_of_birth} />
              <InfoRow label="Gender" value={admission.gender} />
              <InfoRow label="Religion" value={admission.religion} />
              <InfoRow label="Blood Group" value={admission.blood_group} />
              <InfoRow label="Birth Certificate No." value={admission.birth_certificate_no} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Contact Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <CollapsibleSection title="Contact Information" icon={<Phone className="w-4 h-4" />} defaultOpen>
            <div className="space-y-1">
              <InfoRow label="Mobile" value={admission.mobile_student} />
              <InfoRow label="Email" value={admission.email} />
              <InfoRow label="Guardian Mobile" value={admission.guardian_mobile} />
              <InfoRow label="Emergency Contact" value={admission.emergency_contact} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Present Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <CollapsibleSection title="Present Address" icon={<MapPin className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Village" value={admission.present_address?.village} />
              <InfoRow label="Post Office" value={admission.present_address?.postOffice} />
              <InfoRow label="Upazila" value={admission.present_address?.upazila} />
              <InfoRow label="District" value={admission.present_address?.district} />
              <InfoRow label="Division" value={admission.present_address?.division} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Permanent Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <CollapsibleSection title="Permanent Address" icon={<MapPin className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Village" value={admission.permanent_address?.village} />
              <InfoRow label="Post Office" value={admission.permanent_address?.postOffice} />
              <InfoRow label="Upazila" value={admission.permanent_address?.upazila} />
              <InfoRow label="District" value={admission.permanent_address?.district} />
              <InfoRow label="Division" value={admission.permanent_address?.division} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Educational Background */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <CollapsibleSection title="Educational Background" icon={<GraduationCap className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Highest Exam" value={admission.highest_exam} />
              <InfoRow label="Board" value={admission.board} />
              <InfoRow label="Roll Number" value={admission.roll_number} />
              <InfoRow label="Registration Number" value={admission.registration_number} />
              <InfoRow label="Passing Year" value={admission.passing_year?.toString()} />
              <InfoRow label="GPA" value={admission.gpa?.toString()} />
              <InfoRow label="Group" value={admission.group} />
              <InfoRow label="Institution Name" value={admission.institution_name} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Academic Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <CollapsibleSection title="Academic Information" icon={<BookOpen className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Desired Department" value={admission.desired_department} />
              <InfoRow label="Department Name" value={admission.department_name} />
              <InfoRow label="Desired Shift" value={admission.desired_shift} />
              <InfoRow label="Session" value={admission.session} />
            </div>
          </CollapsibleSection>
        </motion.div>
      </div>

      {/* Documents Section */}
      {admission.documents && Object.keys(admission.documents).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(admission.documents).map(([key, value]) => {
                  if (!value) return null;
                  const label = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase())
                    .trim();
                  return (
                    <Card key={key} className="bg-muted/50 hover:bg-muted/70 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{label}</p>
                            <p className="text-xs text-muted-foreground">{value}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-success" />
              Approve Admission Application
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this admission application? This action will be recorded in the student's history.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <strong>Applicant:</strong> {admission.full_name_english}
              </p>
              <p className="text-sm text-foreground mt-1">
                <strong>Department:</strong> {admission.department_name || admission.desired_department}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This action will be recorded as: <strong>"{currentAdmin}" approved the admission application</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button className="gradient-success text-success-foreground" onClick={handleApprove} disabled={processing}>
              <Check className="w-4 h-4 mr-2" />
              {processing ? 'Approving...' : 'Approve Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-destructive" />
              Reject Admission Application
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this admission application. This action will be recorded in the student's history.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <strong>Applicant:</strong> {admission.full_name_english}
              </p>
              <p className="text-sm text-foreground mt-1">
                <strong>Department:</strong> {admission.department_name || admission.desired_department}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[120px]"
                disabled={processing}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be included in the history entry: <strong>"{currentAdmin}" rejected the admission application</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false);
              setRejectionReason('');
            }} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing}
            >
              <X className="w-4 h-4 mr-2" />
              {processing ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

