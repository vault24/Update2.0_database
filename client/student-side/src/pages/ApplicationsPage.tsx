import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, FileText, CreditCard, Calendar, ClipboardCheck, 
  BarChart3, Plus, Clock, CheckCircle, XCircle, Search, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import applicationService, { Application } from '@/services/applicationService';
import { useAuth } from '@/contexts/AuthContext';
import { studentService } from '@/services/studentService';

const applicationTypes = [
  { id: 'Testimonial', label: 'Testimonial', icon: FileText, description: 'Request character certificate' },
  { id: 'Certificate', label: 'Certificate', icon: FileText, description: 'Request academic certificate' },
  { id: 'Transcript', label: 'Transcript', icon: FileText, description: 'Request transcript' },
  { id: 'Stipend', label: 'Stipend', icon: CreditCard, description: 'Apply for stipend' },
  { id: 'Transfer', label: 'Transfer', icon: Calendar, description: 'Request transfer certificate' },
  { id: 'Other', label: 'Other', icon: ClipboardCheck, description: 'Other requests' },
];

export function ApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);

  // Fetch student profile to get rollNumber and registrationNumber
  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (!authLoading && user?.relatedProfileId) {
        try {
          const data = await studentService.getMe(user.relatedProfileId);
          setStudentData(data);
        } catch (error) {
          console.error('Error fetching student profile:', error);
        }
      }
    };
    fetchStudentProfile();
  }, [authLoading, user?.relatedProfileId]);

  const fetchApplications = async () => {
    if (!studentData?.currentRollNumber) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await applicationService.getMyApplications(
        studentData.currentRollNumber,
        studentData.currentRegistrationNumber
      );
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentData?.currentRollNumber) {
      fetchApplications();
    }
  }, [studentData]);

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.error('Please select an application type');
      return;
    }

    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!studentData) {
      toast.error('Student profile not found. Please complete your admission.');
      return;
    }

    try {
      setSubmitting(true);
      await applicationService.submitApplication({
        fullNameBangla: studentData.fullNameBangla,
        fullNameEnglish: studentData.fullNameEnglish,
        fatherName: studentData.fatherName,
        motherName: studentData.motherName,
        department: typeof studentData.department === 'string' 
          ? studentData.department 
          : studentData.department?.name || '',
        session: studentData.session,
        shift: studentData.shift,
        rollNumber: studentData.currentRollNumber,
        registrationNumber: studentData.currentRegistrationNumber,
        email: studentData.email,
        applicationType: selectedType,
        subject,
        message,
      });

      toast.success('Application submitted successfully!');
      setShowNewForm(false);
      setSelectedType(null);
      setSubject('');
      setMessage('');
      fetchApplications(); // Refresh list
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = {
    pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    approved: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    rejected: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display font-bold">Applications</h1>
          <p className="text-muted-foreground">Submit and track your requests</p>
        </div>
        <Button variant="gradient" onClick={() => setShowNewForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Application
        </Button>
      </motion.div>

      {/* New Application Form */}
      {showNewForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-card"
        >
          <h3 className="font-semibold mb-4">Submit New Application</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {applicationTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                  selectedType === type.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <type.icon className={cn(
                  "w-6 h-6 mb-2",
                  selectedType === type.id ? "text-primary" : "text-muted-foreground"
                )} />
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </button>
            ))}
          </div>

          {selectedType && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  placeholder="Enter subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Message / Description</Label>
                <Textarea
                  placeholder="Explain your request in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewForm(false);
                    setSelectedType(null);
                    setSubject('');
                    setMessage('');
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="gradient" 
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search applications..." className="pl-10" />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app, index) => {
            const status = statusConfig[app.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className={cn("p-3 rounded-xl", status.bg)}>
                    <StatusIcon className={cn("w-6 h-6", status.color)} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{app.applicationType}</h4>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                        status.bg, status.color
                      )}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{app.subject}</p>
                    <p className="text-sm text-muted-foreground">{app.message}</p>
                    {app.reviewNotes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium">Review Notes:</span> {app.reviewNotes}
                      </p>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {new Date(app.submittedAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {applications.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-1">No Applications Yet</h3>
          <p className="text-sm text-muted-foreground">Submit your first application to get started</p>
        </div>
      )}
    </div>
  );
}

export default ApplicationsPage;
