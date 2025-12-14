import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, AlertCircle, User, Phone, MapPin, 
  GraduationCap, BookOpen, CheckCircle, Home, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { studentService, Student } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import correctionRequestService from '@/services/correctionRequestService';

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

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '-'}</span>
    </div>
  );
}

export default function StudentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCorrectionDialogOpen, setIsCorrectionDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    fieldName: '',
    currentValue: '',
    requestedValue: '',
    reason: '',
  });

  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) {
        setError('No student ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await studentService.getStudent(id);
        setStudent(data);
      } catch (err) {
        const errorMsg = getErrorMessage(err);
        setError(errorMsg);
        
        // Check if it's a 404 error (student not found)
        if (errorMsg.includes('404') || errorMsg.toLowerCase().includes('not found')) {
          toast.error('Student not found', {
            description: 'The student you are looking for does not exist or may have been removed.'
          });
        } else {
          toast.error('Failed to load student details', {
            description: errorMsg
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id]);

  const handleRequestCorrection = async () => {
    if (!correctionForm.fieldName || !correctionForm.requestedValue || !correctionForm.reason || !id) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Check if student exists before submitting correction request
    if (!student) {
      toast.error('Cannot submit correction request', {
        description: 'Student information is not available.'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      await correctionRequestService.createCorrectionRequest({
        student: id,
        field_name: correctionForm.fieldName,
        current_value: correctionForm.currentValue || '',
        requested_value: correctionForm.requestedValue,
        reason: correctionForm.reason,
      });
      
      toast.success('Correction request submitted successfully!', {
        description: 'Your request will be reviewed by the admin.'
      });
      setIsCorrectionDialogOpen(false);
      setCorrectionForm({ fieldName: '', currentValue: '', requestedValue: '', reason: '' });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      
      // Provide more specific error messages
      if (errorMsg.includes('500')) {
        toast.error('Server error occurred', {
          description: 'Please try again later or contact support if the problem persists.'
        });
      } else if (errorMsg.includes('400')) {
        toast.error('Invalid request', {
          description: 'Please check your input and try again.'
        });
      } else {
        toast.error('Failed to submit correction request', {
          description: errorMsg
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'bg-success/20 text-success border-success/30';
    if (status === 'inactive') return 'bg-warning/20 text-warning border-warning/30';
    if (status === 'graduated') return 'bg-info/20 text-info border-info/30';
    if (status === 'discontinued') return 'bg-destructive/20 text-destructive border-destructive/30';
    return 'bg-muted text-muted-foreground';
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-success';
    if (percentage >= 75) return 'text-warning';
    return 'text-destructive';
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !student) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Student Not Found</h3>
          <p className="text-muted-foreground">
            {error || 'The student you are looking for does not exist or may have been removed.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
            <Button onClick={() => navigate('/dashboard/students')}>
              View All Students
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const averageAttendance = student.semesterAttendance && student.semesterAttendance.length > 0
    ? Math.round(
        student.semesterAttendance.reduce((acc, s) => acc + s.averagePercentage, 0) / student.semesterAttendance.length
      )
    : 0;

  // Map field names for correction request
  const getFieldDisplayName = (fieldName: string) => {
    const fieldMap: Record<string, string> = {
      'fullNameEnglish': 'Full Name (English)',
      'fullNameBangla': 'Full Name (Bangla)',
      'fatherName': 'Father\'s Name',
      'motherName': 'Mother\'s Name',
      'dateOfBirth': 'Date of Birth',
      'mobileStudent': 'Student Mobile',
      'guardianMobile': 'Guardian Mobile',
      'email': 'Email',
      'bloodGroup': 'Blood Group',
      'currentRollNumber': 'Roll Number',
      'currentRegistrationNumber': 'Registration Number',
    };
    return fieldMap[fieldName] || fieldName;
  };

  const getFieldValue = (fieldName: string) => {
    if (!student) return '';
    
    const fieldMap: Record<string, any> = {
      'fullNameEnglish': student.fullNameEnglish,
      'fullNameBangla': student.fullNameBangla,
      'fatherName': student.fatherName,
      'motherName': student.motherName,
      'dateOfBirth': student.dateOfBirth,
      'mobileStudent': student.mobileStudent,
      'guardianMobile': student.guardianMobile,
      'email': student.email,
      'bloodGroup': student.bloodGroup,
      'currentRollNumber': student.currentRollNumber,
      'currentRegistrationNumber': student.currentRegistrationNumber,
    };
    return fieldMap[fieldName] || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Student Details</h1>
            <p className="text-muted-foreground">View student information (Read-only)</p>
          </div>
        </div>
        <Button 
          onClick={() => setIsCorrectionDialogOpen(true)} 
          className="gradient-primary text-primary-foreground"
          disabled={!student}
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Request Correction
        </Button>
      </div>

      {/* Hero Section - Profile Photo & Quick Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Profile Photo */}
              <div className="flex flex-col items-center lg:items-start">
                <div className="relative">
                  <Avatar className="w-40 h-40 border-4 border-primary/20 ring-4 ring-primary/10">
                    <AvatarImage src={student.profilePhoto} />
                    <AvatarFallback className="gradient-primary text-primary-foreground text-4xl">
                      {student.fullNameEnglish.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge 
                    className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${getStatusColor(student.status)}`}
                  >
                    {getStatusLabel(student.status)}
                  </Badge>
                </div>
              </div>

              {/* Names & Info */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-2xl font-bold text-foreground">{student.fullNameEnglish}</h2>
                <p className="text-lg text-muted-foreground font-medium">{student.fullNameBangla}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {typeof student.department === 'string' ? student.department : student.department.name}
                </p>

                {/* Quick Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Roll Number</p>
                      <p className="text-lg font-bold text-primary">{student.currentRollNumber}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Semester</p>
                      <p className="text-lg font-bold text-foreground">{student.semester}th</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">CGPA</p>
                      <p className="text-lg font-bold text-success">
                        {student.semesterResults && student.semesterResults.length > 0 
                          ? student.semesterResults[student.semesterResults.length - 1]?.cgpa || '-'
                          : '-'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Attendance</p>
                      <p className={`text-lg font-bold ${getAttendanceColor(averageAttendance)}`}>{averageAttendance}%</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Collapsible Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <CollapsibleSection title="Personal Information" icon={<User className="w-4 h-4" />} defaultOpen>
            <div className="space-y-1">
              <InfoRow label="Full Name (English)" value={student.fullNameEnglish} />
              <InfoRow label="Full Name (Bangla)" value={student.fullNameBangla} />
              <InfoRow label="Father's Name" value={student.fatherName} />
              <InfoRow label="Mother's Name" value={student.motherName} />
              <InfoRow label="Date of Birth" value={student.dateOfBirth} />
              <InfoRow label="Gender" value={student.gender} />
              <InfoRow label="Religion" value={student.religion} />
              <InfoRow label="Blood Group" value={student.bloodGroup} />
              <InfoRow label="Nationality" value={student.nationality} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Contact Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <CollapsibleSection title="Contact Information" icon={<Phone className="w-4 h-4" />} defaultOpen>
            <div className="space-y-1">
              <InfoRow label="Student Mobile" value={student.mobileStudent} />
              <InfoRow label="Guardian Mobile" value={student.guardianMobile} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Emergency Contact" value={student.emergencyContact} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Present Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <CollapsibleSection title="Present Address" icon={<MapPin className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Division" value={student.presentAddress.division} />
              <InfoRow label="District" value={student.presentAddress.district} />
              <InfoRow label="Upazila" value={student.presentAddress.upazila} />
              <InfoRow label="Post Office" value={student.presentAddress.postOffice} />
              <InfoRow label="Village" value={student.presentAddress.village} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Permanent Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <CollapsibleSection title="Permanent Address" icon={<Home className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Division" value={student.permanentAddress.division} />
              <InfoRow label="District" value={student.permanentAddress.district} />
              <InfoRow label="Upazila" value={student.permanentAddress.upazila} />
              <InfoRow label="Post Office" value={student.permanentAddress.postOffice} />
              <InfoRow label="Village" value={student.permanentAddress.village} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Educational Background */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <CollapsibleSection title="Educational Background" icon={<GraduationCap className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Highest Exam" value={(student as any).highestExam} />
              <InfoRow label="Board" value={(student as any).board} />
              <InfoRow label="Group" value={(student as any).group} />
              <InfoRow label="Roll Number" value={(student as any).rollNumber} />
              <InfoRow label="Registration Number" value={(student as any).registrationNumber} />
              <InfoRow label="Passing Year" value={(student as any).passingYear?.toString()} />
              <InfoRow label="GPA" value={(student as any).gpa?.toString()} />
              <InfoRow label="Institution Name" value={(student as any).institutionName} />
            </div>
          </CollapsibleSection>
        </motion.div>

        {/* Current Academic Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <CollapsibleSection title="Current Academic Information" icon={<BookOpen className="w-4 h-4" />}>
            <div className="space-y-1">
              <InfoRow label="Roll Number" value={student.currentRollNumber} />
              <InfoRow label="Registration Number" value={student.currentRegistrationNumber} />
              <InfoRow label="Semester" value={`${student.semester}th`} />
              <InfoRow label="Department" value={typeof student.department === 'string' ? student.department : student.department.name} />
              <InfoRow label="Session" value={student.session} />
              <InfoRow label="Shift" value={student.shift} />
              <InfoRow label="Status" value={getStatusLabel(student.status)} />
            </div>
          </CollapsibleSection>
        </motion.div>
      </div>

      {/* Semester Results */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Semester Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {student.semesterResults && student.semesterResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {student.semesterResults.map((result, index) => (
                  <Card key={index} className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{result.semester}th Semester</span>
                        {result.gpa && (
                          <Badge className="gradient-primary text-primary-foreground">GPA: {result.gpa}</Badge>
                        )}
                      </div>
                      {result.cgpa && (
                        <div className="text-sm text-muted-foreground">CGPA: {result.cgpa}</div>
                      )}
                      {result.referredSubjects && result.referredSubjects.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-destructive font-medium">Referred Subjects:</p>
                          {result.referredSubjects.map((sub, i) => (
                            <Badge key={i} variant="outline" className="text-xs mt-1 mr-1 bg-destructive/10 text-destructive border-destructive/30">
                              {sub}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-foreground font-medium mb-2">No Results Available</p>
                <p className="text-sm text-muted-foreground">
                  Semester results have not been added yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Semester Attendance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Semester Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {student.semesterAttendance && student.semesterAttendance.length > 0 ? (
              <div className="space-y-4">
                {student.semesterAttendance.map((semester, index) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-foreground">Semester {semester.semester}</span>
                      <Badge 
                        variant="outline"
                        className={`${
                          semester.averagePercentage >= 80 
                            ? 'bg-success/10 text-success border-success/30' 
                            : semester.averagePercentage >= 60 
                            ? 'bg-warning/10 text-warning border-warning/30' 
                            : 'bg-destructive/10 text-destructive border-destructive/30'
                        }`}
                      >
                        Average: {semester.averagePercentage.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {semester.subjects.map((subject, subIndex) => (
                        <div key={subIndex} className="bg-muted/50 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-2 font-medium truncate">
                            {subject.name}
                          </div>
                          <div className="flex items-center justify-between">
                            <span 
                              className={`text-lg font-bold ${
                                subject.percentage >= 80 
                                  ? 'text-success' 
                                  : subject.percentage >= 60 
                                  ? 'text-warning' 
                                  : 'text-destructive'
                              }`}
                            >
                              {subject.percentage}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {subject.present}/{subject.total}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-foreground font-medium mb-2">No Attendance Available</p>
                <p className="text-sm text-muted-foreground">
                  Semester attendance records have not been added yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Correction Request Dialog */}
      <Dialog open={isCorrectionDialogOpen} onOpenChange={setIsCorrectionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Request Data Correction
            </DialogTitle>
            <DialogDescription>
              Submit a request to correct student information. Admin will review and approve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fieldName">Field Name *</Label>
              <Select 
                value={correctionForm.fieldName} 
                onValueChange={(v) => {
                  setCorrectionForm({ 
                    ...correctionForm, 
                    fieldName: v,
                    currentValue: getFieldValue(v) || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field to correct" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fullNameEnglish">Full Name (English)</SelectItem>
                  <SelectItem value="fullNameBangla">Full Name (Bangla)</SelectItem>
                  <SelectItem value="fatherName">Father's Name</SelectItem>
                  <SelectItem value="motherName">Mother's Name</SelectItem>
                  <SelectItem value="dateOfBirth">Date of Birth</SelectItem>
                  <SelectItem value="mobileStudent">Student Mobile</SelectItem>
                  <SelectItem value="guardianMobile">Guardian Mobile</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="bloodGroup">Blood Group</SelectItem>
                  <SelectItem value="currentRollNumber">Roll Number</SelectItem>
                  <SelectItem value="currentRegistrationNumber">Registration Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentValue">Current Value</Label>
              <Input 
                id="currentValue"
                placeholder="Current value (auto-filled)"
                value={correctionForm.currentValue}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestedValue">Requested Value *</Label>
              <Input 
                id="requestedValue"
                placeholder="Enter correct value"
                value={correctionForm.requestedValue}
                onChange={(e) => setCorrectionForm({ ...correctionForm, requestedValue: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Correction *</Label>
              <Textarea 
                id="reason"
                placeholder="Explain why this correction is needed..."
                value={correctionForm.reason}
                onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCorrectionDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleRequestCorrection} 
              className="gradient-primary text-primary-foreground"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
