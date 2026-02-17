import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, FileText, Calendar, ClipboardCheck, BarChart3, 
  FolderOpen, Edit, Download, Mail, Phone, MapPin, 
  Building, GraduationCap, Award, Loader2, AlertCircle,
  BookOpen, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { studentService, type Student } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { routineService, type ClassRoutine, type DayOfWeek } from '@/services/routineService';
import { marksService, type MarksRecord } from '@/services/marksService';
import { attendanceService, type AttendanceSummary } from '@/services/attendanceService';
import { documentService, type Document } from '@/services/documentService';
import { admissionService, type Admission } from '@/services/admissionService';
// Profile components
import { TeacherProfileHeader } from '@/components/profile/TeacherProfileHeader';
import { TeacherClassesTab } from '@/components/profile/TeacherClassesTab';
import { TeacherScheduleTab } from '@/components/profile/TeacherScheduleTab';
import { TeacherSettingsTab } from '@/components/profile/TeacherSettingsTab';
import { LinkedInTeacherProfile } from '@/components/profile/LinkedInTeacherProfile';
import { StudentProfileHeader } from '@/components/profile/StudentProfileHeader';
import { StudentStatsCard } from '@/components/profile/StudentStatsCard';
import { StudentOverviewTab } from '@/components/profile/StudentOverviewTab';

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

const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { user, loading: authLoading } = useAuth();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Additional data states
  const [routine, setRoutine] = useState<ClassRoutine[]>([]);
  const [routineSchedule, setRoutineSchedule] = useState<Record<string, string[]>>({});
  const [routineLoading, setRoutineLoading] = useState(false);
  
  const [marks, setMarks] = useState<MarksRecord[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [admissionLoading, setAdmissionLoading] = useState(false);
  
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      // Only fetch student profile if user is not a teacher
      if (user.role !== 'teacher' && user?.relatedProfileId) {
        fetchStudentProfile();
      } else if (user.role === 'teacher') {
        // For teachers, just show user info from auth context
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
      
      const data = await studentService.getMe(user.relatedProfileId);
      setStudentData(data);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load profile', {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch routine data
  const fetchRoutine = async () => {
    if (!user?.relatedProfileId || !studentData) return;
    
    try {
      setRoutineLoading(true);
      const departmentId = typeof studentData.department === 'object' 
        ? studentData.department.id 
        : studentData.department;
      const shiftValue = studentData.shift || 'Day';
      
      const response = await routineService.getMyRoutine({
        department: departmentId,
        semester: studentData.semester,
        shift: shiftValue as any,
      });
      
      setRoutine(response.routines);
      
      // Build schedule for display
      const schedule: Record<string, string[]> = {};
      days.forEach(day => {
        schedule[day] = [];
      });
      
      // Group by time slots (simplified display)
      response.routines.forEach(routineItem => {
        const timeKey = `${routineItem.start_time?.slice(0, 5) || ''}-${routineItem.end_time?.slice(0, 5) || ''}`;
        const displayText = routineItem.subject_code || routineItem.subject_name || 'Free';
        schedule[routineItem.day_of_week].push(displayText);
      });
      
      setRoutineSchedule(schedule);
    } catch (err) {
      console.error('Failed to load routine:', err);
      toast.error('Failed to load routine', {
        description: getErrorMessage(err)
      });
    } finally {
      setRoutineLoading(false);
    }
  };

  // Fetch marks data
  const fetchMarks = async () => {
    if (!user?.relatedProfileId || !studentData) return;
    
    try {
      setMarksLoading(true);
      const response = await marksService.getMyMarks({
        student: user.relatedProfileId,
        semester: studentData.semester,
        page_size: 100,
      });
      setMarks(response.results || []);
    } catch (err) {
      console.error('Failed to load marks:', err);
      toast.error('Failed to load marks', {
        description: getErrorMessage(err)
      });
    } finally {
      setMarksLoading(false);
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

  // Fetch admission data
  const fetchAdmission = async () => {
    try {
      setAdmissionLoading(true);
      const data = await admissionService.getMyAdmission();
      setAdmission(data);
    } catch (err) {
      console.error('Failed to load admission:', err);
      // Don't show error toast as admission might not exist for all students
    } finally {
      setAdmissionLoading(false);
    }
  };

  // Fetch attendance summary
  const fetchAttendance = async () => {
    if (!user?.relatedProfileId) return;
    
    try {
      setAttendanceLoading(true);
      const response = await attendanceService.getMySummary(user.relatedProfileId);
      setAttendanceSummary(response);
    } catch (err) {
      console.error('Failed to load attendance:', err);
      toast.error('Failed to load attendance', {
        description: getErrorMessage(err)
      });
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch data when tabs are active
  useEffect(() => {
    if (!studentData || !user?.relatedProfileId) return;
    
    if (activeTab === 'routine') {
      fetchRoutine();
    } else if (activeTab === 'marks') {
      fetchMarks();
    } else if (activeTab === 'documents') {
      fetchDocuments();
    } else if (activeTab === 'admission') {
      fetchAdmission();
    } else if (activeTab === 'attendance') {
      fetchAttendance();
    }
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

  // Use studentData if available, fallback to user from auth context
  // For teachers, use user data directly
  const isTeacher = user?.role === 'teacher';
  const tabs = isTeacher ? teacherTabs : studentTabs;
  const displayName = isTeacher 
    ? (user?.name || 'Teacher')
    : (studentData?.fullNameEnglish || user?.name || 'Student');
  const displayDepartment = isTeacher
    ? (user?.department || 'N/A')
    : (studentData?.departmentName || 
      (typeof studentData?.department === 'object' ? studentData?.department?.name : studentData?.department) || 
      user?.department || 'N/A');
  const displaySemester = isTeacher ? null : (studentData?.semester || user?.semester || 1);
  const displayEmail = studentData?.email || user?.email || 'N/A';
  const displayStudentId = isTeacher ? (user?.studentId || 'N/A') : (user?.studentId || studentData?.currentRollNumber || 'N/A');
  const displaySession = isTeacher ? null : (studentData?.session || '2024-25');
  const displayShift = isTeacher ? null : (studentData?.shift || '1st Shift');

  // Teacher Profile Rendering - LinkedIn Style
  if (isTeacher) {
    return <LinkedInTeacherProfile />;
  }

  // Helper to get field value (handle both camelCase and snake_case)
  const getField = (record: any, field: string): any => {
    // Try camelCase first
    if (record[field] !== undefined) return record[field];
    // Try snake_case
    const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (record[snakeCase] !== undefined) return record[snakeCase];
    return null;
  };

  // Process marks data for display
  const processMarksData = () => {
    const subjectMap = new Map<string, { subject: string; ct1: number; ct2: number; ct3: number; assignment: number; attendance: number; total: number }>();
    
    marks.forEach(mark => {
      const subjectCode = getField(mark, 'subjectCode') || 'Unknown';
      const subjectName = getField(mark, 'subjectName') || 'Unknown';
      
      if (!subjectMap.has(subjectCode)) {
        subjectMap.set(subjectCode, {
          subject: subjectName,
          ct1: 0,
          ct2: 0,
          ct3: 0,
          assignment: 0,
          attendance: 0,
          total: 0,
        });
      }
      
      const subj = subjectMap.get(subjectCode)!;
      const marksObtained = Number(getField(mark, 'marksObtained') || 0);
      const remarks = ((getField(mark, 'remarks') || '') as string).toLowerCase();
      const examType = getField(mark, 'examType') || '';
      
      if (examType === 'quiz') {
        if (remarks.includes('ct-1') || remarks.includes('ct1')) {
          subj.ct1 = marksObtained;
        } else if (remarks.includes('ct-2') || remarks.includes('ct2')) {
          subj.ct2 = marksObtained;
        } else if (remarks.includes('ct-3') || remarks.includes('ct3')) {
          subj.ct3 = marksObtained;
        } else if (subj.ct1 === 0) {
          subj.ct1 = marksObtained;
        } else if (subj.ct2 === 0) {
          subj.ct2 = marksObtained;
        } else if (subj.ct3 === 0) {
          subj.ct3 = marksObtained;
        }
      } else if (examType === 'assignment') {
        subj.assignment = marksObtained;
      } else if (examType === 'practical') {
        subj.attendance = marksObtained;
      }
      
      subj.total = subj.ct1 + subj.ct2 + subj.ct3 + subj.assignment + subj.attendance;
    });
    
    return Array.from(subjectMap.values());
  };

  const processedMarks = processMarksData();

  // Calculate academic performance metrics
  const calculatePerformanceMetrics = () => {
    let currentGPA = 0;
    let attendancePercentage = 0;
    let subjectsCount = 0;
    const semesterAttendance = studentData?.semesterAttendance || [];
    const currentSemesterRecord = semesterAttendance.find(
      (record) => record.semester === studentData?.semester
    ) || [...semesterAttendance].sort((a, b) => (b.semester || 0) - (a.semester || 0))[0];
    
    // Calculate CGPA from semester results
    if (studentData?.semesterResults && studentData.semesterResults.length > 0) {
      const latestResult = studentData.semesterResults[studentData.semesterResults.length - 1];
      currentGPA = Number(latestResult.gpa ?? latestResult.cgpa ?? 0);
    }
    
    // Calculate attendance percentage
    if (attendanceSummary?.summary && attendanceSummary.summary.length > 0) {
      const totalPercentage = attendanceSummary.summary.reduce((sum, item) => sum + item.percentage, 0);
      attendancePercentage = Math.round(totalPercentage / attendanceSummary.summary.length);
    }

    // Fallback to semesterAttendance if summary isn't available
    if (!attendancePercentage && currentSemesterRecord) {
      const subjects = currentSemesterRecord.subjects || [];
      const totalPresent = subjects.reduce((sum, subj) => sum + (subj.present || 0), 0);
      const totalClasses = subjects.reduce((sum, subj) => sum + (subj.total || 0), 0);

      if (totalClasses > 0) {
        attendancePercentage = Math.round((totalPresent / totalClasses) * 100);
      } else if (currentSemesterRecord.averagePercentage !== undefined) {
        attendancePercentage = Math.round(Number(currentSemesterRecord.averagePercentage) || 0);
      }
    }
    
    // Count subjects from marks or routine
    const uniqueSubjects = new Set<string>();
    if (currentSemesterRecord?.subjects?.length) {
      currentSemesterRecord.subjects.forEach((subject) => {
        const subjectId = subject.code || subject.name || '';
        if (subjectId) {
          uniqueSubjects.add(subjectId);
        }
      });
    }

    if (uniqueSubjects.size === 0 && attendanceSummary?.summary?.length) {
      attendanceSummary.summary.forEach((item) => {
        const subjectId = item.subject_code || item.subject_name || '';
        if (subjectId) {
          uniqueSubjects.add(subjectId);
        }
      });
    }

    marks.forEach(m => uniqueSubjects.add(m.subjectCode || m.subjectName || ''));
    if (uniqueSubjects.size === 0 && routine.length > 0) {
      routine.forEach(r => uniqueSubjects.add(r.subject_code || r.subject_name || ''));
    }
    subjectsCount = uniqueSubjects.size;
    
    return {
      currentGPA: currentGPA.toFixed(2),
      attendancePercentage,
      subjectsCount,
    };
  };

  const performanceMetrics = calculatePerformanceMetrics();

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format address for display
  const formatAddress = (addr: any) => {
    if (!addr) return undefined;
    const parts = [addr.village, addr.postOffice, addr.upazila, addr.district, addr.division].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : undefined;
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {/* Enhanced Profile Header */}
      <StudentProfileHeader
        name={displayName}
        nameBangla={studentData?.fullNameBangla}
        department={displayDepartment}
        semester={displaySemester || 1}
        session={displaySession || undefined}
        shift={displayShift || undefined}
        email={displayEmail}
        phone={studentData?.mobileStudent}
        location={studentData?.presentAddress 
          ? `${studentData.presentAddress.district || ''}, ${studentData.presentAddress.division || 'Bangladesh'}`.replace(/^,\s*|,\s*$/g, '')
          : undefined}
        studentId={displayStudentId}
        status={studentData?.status || 'active'}
      />

      {/* Stats Cards */}
      <StudentStatsCard
        gpa={Number(performanceMetrics.currentGPA) || 0}
        attendancePercentage={performanceMetrics.attendancePercentage}
        subjectsCount={performanceMetrics.subjectsCount}
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
          {/* Overview Tab - Using new component */}
          {activeTab === 'overview' && (
            <StudentOverviewTab
              personalInfo={{
                fullName: displayName,
                fullNameBangla: studentData?.fullNameBangla,
                rollNumber: displayStudentId,
                email: displayEmail,
                mobile: studentData?.mobileStudent,
                dateOfBirth: studentData?.dateOfBirth,
                gender: studentData?.gender,
                bloodGroup: studentData?.bloodGroup,
              }}
              academicInfo={{
                department: displayDepartment,
                session: displaySession || undefined,
                semester: displaySemester || 1,
                shift: displayShift || undefined,
                status: studentData?.status,
              }}
              performanceMetrics={{
                gpa: Number(performanceMetrics.currentGPA) || 0,
                attendancePercentage: performanceMetrics.attendancePercentage,
                subjectsCount: performanceMetrics.subjectsCount,
              }}
              parentInfo={{
                fatherName: studentData?.fatherName,
                motherName: studentData?.motherName,
              }}
              address={{
                present: formatAddress(studentData?.presentAddress),
                permanent: formatAddress(studentData?.permanentAddress),
              }}
            />
          )}

          {/* Routine Tab */}
          {activeTab === 'routine' && (
            <div className="bg-card rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card overflow-x-auto">
              <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Weekly Class Routine
              </h3>
              {routineLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading routine...</span>
                </div>
              ) : routine.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No routine data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {days.map((day) => {
                    const dayRoutine = routine.filter(r => r.day_of_week === day);
                    if (dayRoutine.length === 0) return null;
                    
                    return (
                      <div key={day} className="border border-border rounded-xl p-4 bg-secondary/30">
                        <h4 className="text-sm font-semibold mb-3 text-primary">{day}</h4>
                        <div className="flex flex-wrap gap-2">
                          {dayRoutine.map((r) => (
                            <div
                              key={r.id}
                              className="bg-gradient-to-br from-primary/10 to-purple-500/10 text-foreground px-3 py-2 rounded-lg border border-primary/20"
                            >
                              <div className="font-medium text-sm">{r.subject_code || r.subject_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.start_time?.slice(0, 5) || ''} - {r.end_time?.slice(0, 5) || ''}
                                {r.room_number ? ` • Room ${r.room_number}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-4 md:space-y-6">
              {attendanceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading attendance...</span>
                </div>
              ) : attendanceSummary ? (
                <>
                  <div className="grid md:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-xl lg:rounded-2xl border border-emerald-500/20 p-4 md:p-6 text-center">
                      <p className="text-3xl md:text-4xl font-bold text-emerald-600">{performanceMetrics.attendancePercentage}%</p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">Overall Attendance</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-xl lg:rounded-2xl border border-blue-500/20 p-4 md:p-6 text-center">
                      <p className="text-3xl md:text-4xl font-bold text-blue-600">
                        {attendanceSummary.summary.reduce((sum, item) => sum + item.present, 0)}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">Classes Attended</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500/10 to-orange-500/5 rounded-xl lg:rounded-2xl border border-red-500/20 p-4 md:p-6 text-center">
                      <p className="text-3xl md:text-4xl font-bold text-red-600">
                        {attendanceSummary.summary.reduce((sum, item) => sum + (item.total - item.present), 0)}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">Classes Missed</p>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card">
                    <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-primary" />
                      Subject-wise Attendance
                    </h3>
                    {attendanceSummary.summary.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <p>No attendance records available</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {attendanceSummary.summary.map((item, i) => {
                          const percentage = Math.round(item.percentage);
                          return (
                            <div key={item.subject_code}>
                              <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium">{item.subject_name || item.subject_code}</span>
                                <span className="text-sm text-muted-foreground">{percentage}%</span>
                              </div>
                              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.5, delay: i * 0.1 }}
                                  className={cn(
                                    "h-full rounded-full",
                                    percentage >= 90 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 
                                    percentage >= 75 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 
                                    'bg-gradient-to-r from-red-500 to-rose-500'
                                  )}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No attendance data available</p>
                </div>
              )}
            </div>
          )}

          {/* Marks Tab */}
          {activeTab === 'marks' && (
            <div className="bg-card rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card overflow-x-auto">
              <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Internal Assessment Marks
              </h3>
              {marksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading marks...</span>
                </div>
              ) : processedMarks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No marks data available</p>
                </div>
              ) : (
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Subject</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">CT-1</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">CT-2</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground hidden sm:table-cell">CT-3</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground hidden sm:table-cell">Assignment</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground hidden sm:table-cell">Attendance</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedMarks.map((row, i) => (
                      <tr key={i} className={i !== processedMarks.length - 1 ? 'border-b border-border' : ''}>
                        <td className="py-3 px-4 text-sm font-medium">{row.subject}</td>
                        <td className="py-3 px-2 text-center text-sm">{row.ct1 || '-'}</td>
                        <td className="py-3 px-2 text-center text-sm">{row.ct2 || '-'}</td>
                        <td className="py-3 px-2 text-center text-sm hidden sm:table-cell">{row.ct3 || '-'}</td>
                        <td className="py-3 px-2 text-center text-sm hidden sm:table-cell">{row.assignment || '-'}</td>
                        <td className="py-3 px-2 text-center text-sm hidden sm:table-cell">{row.attendance || '-'}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={cn(
                            "inline-block px-3 py-1 rounded-lg text-sm font-semibold",
                            row.total >= 54 ? 'bg-emerald-500/10 text-emerald-600' : 
                            row.total >= 48 ? 'bg-amber-500/10 text-amber-600' : 
                            row.total > 0 ? 'bg-red-500/10 text-red-600' : 
                            'bg-muted/10 text-muted-foreground'
                          )}>
                            {row.total || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
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
                <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                  {documents.map((doc) => (
                    <motion.div 
                      key={doc.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      className="bg-card rounded-xl lg:rounded-2xl border border-border p-4 shadow-card flex items-center gap-4 hover:border-primary/30 transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {doc.category} • {formatFileSize(doc.fileSize)} • {new Date(doc.uploadDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 flex-shrink-0 hover:bg-primary/10"
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
                            toast.error('Failed to download document', {
                              description: getErrorMessage(err)
                            });
                          }
                        }}
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admission Tab */}
          {activeTab === 'admission' && (
            <div className="bg-card rounded-xl lg:rounded-2xl border border-border p-4 md:p-6 shadow-card">
              <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Admission Details
              </h3>
              {admissionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading admission details...</span>
                </div>
              ) : admission ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-0">
                    <InfoRow label="Application ID" value={admission.id || 'N/A'} />
                    <InfoRow label="Admission Date" value={admission.submitted_at ? new Date(admission.submitted_at).toLocaleDateString() : 'N/A'} />
                    <InfoRow label="SSC GPA" value={admission.gpa || 'N/A'} />
                    <InfoRow label="Department" value={typeof admission.desired_department === 'object' 
                      ? admission.desired_department.name 
                      : admission.desired_department || 'N/A'} />
                  </div>
                  <div className="space-y-0">
                    <InfoRow label="Shift" value={admission.desired_shift || 'N/A'} />
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Status</span>
                      <span className={cn(
                        "font-medium text-sm",
                        admission.status === 'approved' ? 'text-emerald-600' : 
                        admission.status === 'rejected' ? 'text-red-600' : 
                        'text-amber-600'
                      )}>
                        {admission.status ? admission.status.charAt(0).toUpperCase() + admission.status.slice(1) : 'N/A'}
                      </span>
                    </div>
                    <InfoRow label="Session" value={admission.session || 'N/A'} />
                    <InfoRow label="Email" value={admission.email || 'N/A'} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No admission data available</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Helper component for info rows
function InfoRow({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-sm text-right">{value || 'N/A'}</span>
    </div>
  );
}

export default ProfilePage;
