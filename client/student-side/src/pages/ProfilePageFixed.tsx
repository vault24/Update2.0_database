import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, FileText, Calendar, ClipboardCheck, BarChart3, 
  FolderOpen, Download, Loader2, AlertCircle,
  BookOpen, Settings, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Import services directly
import { studentService } from '@/services/studentService';
import { documentService } from '@/services/documentService';
import { dashboardService } from '@/services/dashboardService';

// Import profile components with fallbacks
import { StudentProfileHeader } from '@/components/profile/StudentProfileHeader';
import { StudentStatsCard } from '@/components/profile/StudentStatsCard';
import { StudentOverviewTab } from '@/components/profile/StudentOverviewTab';
import { LinkedInTeacherProfile } from '@/components/profile/LinkedInTeacherProfile';

const studentTabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'admission', label: 'Admission', icon: FileText },
  { id: 'routine', label: 'Routine', icon: Calendar },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'marks', label: 'Marks', icon: BarChart3 },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
];

const teacherTabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'classes', label: 'Assigned Classes', icon: BookOpen },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function ProfilePageFixed() {
  const [activeTab, setActiveTab] = useState('overview');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Documents data
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [classRank, setClassRank] = useState<number | string>('-');

  const getPreferredRollNumber = (data: any, fallbackId?: string | null): string | null => {
    const clean = (value: unknown): string | null => {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
      return null;
    };

    // Use auth-provided student ID first (from /auth/me) so student-side
    // profile shows the same primary identifier used across auth/admin flows.
    const normalizedFallback = clean(fallbackId);
    if (normalizedFallback) return normalizedFallback;

    const candidates = [
      data?.rollNumber,
      data?.roll_number,
      data?.currentRollNumber,
      data?.current_roll_number,
    ];
    const normalizedCandidates = candidates.map(clean).filter(Boolean) as string[];
    return normalizedCandidates[0] || null;
  };

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'teacher' && user?.relatedProfileId) {
        fetchStudentProfile();
      } else if (user.role === 'teacher') {
        setLoading(false);
      } else {
        setError('User not authenticated or profile not found');
        setLoading(false);
      }
    }
  }, [authLoading, user?.relatedProfileId, user?.role]);

  const fetchStudentProfile = async () => {
    if (!user?.relatedProfileId) {
      setError('User not authenticated or student profile not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching student profile for ID:', user.relatedProfileId);
      const [data, dashboardData] = await Promise.all([
        studentService.getMe(user.relatedProfileId),
        dashboardService.getStudentStats(user.relatedProfileId).catch(() => null),
      ]);
      console.log('Student profile data received:', data);
      setStudentData(data);
      setClassRank(dashboardData?.performance?.classRank ?? '-');
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      console.error('Failed to load student profile:', err);
      console.error('Error details:', {
        status: err.status_code || err.status,
        message: err.error || err.message,
        details: err.details
      });
      
      // Always use fallback data if API fails
      console.log('Using fallback user data for profile');
      setStudentData({
        fullNameEnglish: user.name || 'Student',
        email: user.email || 'N/A',
        currentRollNumber: studentData?.currentRollNumber || studentData?.rollNumber || user.studentId || 'N/A',
        department: user.department || 'N/A',
        semester: user.semester || 1,
        status: 'active',
        // Add more fallback fields
        fullNameBangla: '',
        mobileStudent: '',
        session: '2024-25',
        shift: '1st Shift'
      });
      setClassRank('-');
      
      // Only show error in console, not to user since we have fallback
      console.warn('Using fallback profile data due to API error:', errorMsg);
      setError(null); // Clear error since we have fallback data
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents data
  const fetchDocuments = async () => {
    if (!user?.relatedProfileId) return;
    
    try {
      setDocumentsLoading(true);
      const response = await documentService.getMyDocuments(user.relatedProfileId);
      setDocuments(response.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      toast.error('Failed to load documents', {
        description: getErrorMessage(err)
      });
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Fetch data when tabs are active
  useEffect(() => {
    if (!studentData || !user?.relatedProfileId) return;
    
    if (activeTab === 'documents') {
      fetchDocuments();
    }
    // Add other tab data fetching as needed
  }, [activeTab, studentData, user?.relatedProfileId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Failed to Load Profile</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchStudentProfile}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === 'teacher';
  const tabs = isTeacher ? teacherTabs : studentTabs;
  const displayName = isTeacher 
    ? (user?.name || 'Teacher')
    : (studentData?.fullNameEnglish || user?.name || 'Student');
  const preferredRollNumber = getPreferredRollNumber(studentData, user?.studentId);
  const profileIdentifier = preferredRollNumber || user?.studentId || studentData?.id || user?.relatedProfileId || 'N/A';

  const calculatePerformanceMetrics = () => {
    let currentGPA = 0;
    let attendancePercentage = 0;
    let subjectsCount = 0;

    const semesterResults = studentData?.semesterResults || [];
    const latestResult = semesterResults.length ? semesterResults[semesterResults.length - 1] : null;
    if (latestResult) {
      currentGPA = Number(latestResult.gpa ?? latestResult.cgpa ?? 0);
    }

    const semesterAttendance = studentData?.semesterAttendance || [];
    const currentSemesterRecord = semesterAttendance.find(
      (record: any) => record.semester === (studentData?.semester || user?.semester)
    ) || [...semesterAttendance].sort((a: any, b: any) => (b.semester || 0) - (a.semester || 0))[0];

    if (currentSemesterRecord) {
      const subjects = currentSemesterRecord.subjects || [];
      const totalPresent = subjects.reduce((sum: number, subj: any) => sum + (subj.present || 0), 0);
      const totalClasses = subjects.reduce((sum: number, subj: any) => sum + (subj.total || 0), 0);

      if (totalClasses > 0) {
        attendancePercentage = Math.round((totalPresent / totalClasses) * 100);
      } else if (currentSemesterRecord.averagePercentage !== undefined) {
        attendancePercentage = Math.round(Number(currentSemesterRecord.averagePercentage) || 0);
      }

      subjectsCount = subjects.length;
    }

    if (!subjectsCount && latestResult?.subjects?.length) {
      subjectsCount = latestResult.subjects.length;
    }

    return {
      currentGPA: currentGPA.toFixed(2),
      attendancePercentage,
      subjectsCount
    };
  };

  const performanceMetrics = calculatePerformanceMetrics();

  // Teacher Profile Rendering - LinkedIn Style
  if (isTeacher) {
    return <LinkedInTeacherProfile />;
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {/* Navigation Button for Semester 8 Students */}
      {user?.semester === 8 && (
        <div className="flex justify-end">
          <Button
            onClick={() => navigate('/dashboard/alumni-profile')}
            className="gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            View Alumni Profile
          </Button>
        </div>
      )}

      {/* Profile Header */}
      <StudentProfileHeader
        name={displayName}
        nameBangla={studentData?.fullNameBangla}
        department={studentData?.departmentName || studentData?.department?.name || user?.department || 'N/A'}
        semester={studentData?.semester || user?.semester || 1}
        session={studentData?.session || '2024-25'}
        shift={studentData?.shift || '1st Shift'}
        email={studentData?.email || user?.email || 'N/A'}
        phone={studentData?.mobileStudent}
        location={studentData?.presentAddress 
          ? `${studentData.presentAddress.district || ''}, ${studentData.presentAddress.division || 'Bangladesh'}`.replace(/^,\s*|,\s*$/g, '')
          : undefined}
        studentId={profileIdentifier}
        rollNumber={preferredRollNumber || undefined}
        status={studentData?.status || 'active'}
      />

      {/* Stats Cards */}
      <StudentStatsCard
        gpa={Number(performanceMetrics.currentGPA) || 0}
        attendancePercentage={performanceMetrics.attendancePercentage}
        subjectsCount={performanceMetrics.subjectsCount}
        rank={classRank}
      />

      {/* Tabs */}
      <div className="overflow-x-auto -mx-3 px-3 md:-mx-4 md:px-4 lg:mx-0 lg:px-0">
        <div className="flex gap-1 md:gap-1.5 lg:gap-2 min-w-max pb-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1 md:gap-1.5 lg:gap-2 px-3 md:px-4 lg:px-5 py-2 md:py-2.5 lg:py-3 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary border border-border"
                )}
              >
                <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h3 className="text-xl font-semibold mb-4">Overview</h3>
              <StudentOverviewTab
                personalInfo={{
                  fullName: displayName,
                  fullNameBangla: studentData?.fullNameBangla,
                  rollNumber: profileIdentifier,
                  email: studentData?.email || user?.email || 'N/A',
                  mobile: studentData?.mobileStudent,
                  dateOfBirth: studentData?.dateOfBirth,
                  gender: studentData?.gender,
                  bloodGroup: studentData?.bloodGroup,
                }}
                academicInfo={{
                  department: studentData?.departmentName || user?.department || 'N/A',
                  session: studentData?.session || '2024-25',
                  semester: studentData?.semester || user?.semester || 1,
                  shift: studentData?.shift || '1st Shift',
                  status: studentData?.status,
                }}
                performanceMetrics={{
                  gpa: Number(performanceMetrics.currentGPA) || 0,
                  attendancePercentage: performanceMetrics.attendancePercentage,
                  subjectsCount: performanceMetrics.subjectsCount,
                  rank: classRank,
                }}
                parentInfo={{
                  fatherName: studentData?.fatherName,
                  motherName: studentData?.motherName,
                }}
                address={{
                  present: studentData?.presentAddress ? 
                    `${studentData.presentAddress.village || ''}, ${studentData.presentAddress.district || ''}`.replace(/^,\s*|,\s*$/g, '') : 
                    undefined,
                  permanent: studentData?.permanentAddress ? 
                    `${studentData.permanentAddress.village || ''}, ${studentData.permanentAddress.district || ''}`.replace(/^,\s*|,\s*$/g, '') : 
                    undefined,
                }}
              />
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                Documents
              </h3>
              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading documents...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No documents available</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {documents.map((doc: any) => (
                    <div 
                      key={doc.id} 
                      className="bg-secondary/30 rounded-lg border border-border p-4 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.category} • {formatFileSize(doc.fileSize)}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={async () => {
                          try {
                            const blob = await documentService.downloadDocument(doc.id);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = doc.fileName;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (err) {
                            toast.error('Failed to download document');
                          }
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Other tabs */}
          {activeTab !== 'overview' && activeTab !== 'documents' && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h3 className="text-xl font-semibold mb-4 capitalize">{activeTab}</h3>
              <div className="text-center py-8 text-muted-foreground">
                <p>This section is under development.</p>
                <p className="text-sm mt-2">Data for {activeTab} will be available soon.</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default ProfilePageFixed;
