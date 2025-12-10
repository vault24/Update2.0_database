import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, FileText, Calendar, ClipboardCheck, BarChart3, 
  FolderOpen, Edit, Download, Mail, Phone, MapPin, 
  Building, GraduationCap, Award, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { studentService, type Student } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

const tabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'admission', label: 'Admission Details', icon: FileText },
  { id: 'routine', label: 'Class Routine', icon: Calendar },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'marks', label: 'Marks', icon: BarChart3 },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
];

const mockRoutine = [
  { day: 'Sunday', periods: ['Math-101', 'Physics-101', 'Break', 'English-101', 'Lab'] },
  { day: 'Monday', periods: ['Chemistry-101', 'Computer-101', 'Break', 'Math-101', 'Lab'] },
  { day: 'Tuesday', periods: ['English-101', 'Physics-101', 'Break', 'Chemistry-101', 'Lab'] },
  { day: 'Wednesday', periods: ['Computer-101', 'Math-101', 'Break', 'Physics-101', 'Lab'] },
  { day: 'Thursday', periods: ['Chemistry-101', 'English-101', 'Break', 'Computer-101', 'Lab'] },
];

const mockMarks = [
  { subject: 'Mathematics', ct1: 18, ct2: 17, assignment: 9, attendance: 10, total: 54 },
  { subject: 'Physics', ct1: 16, ct2: 19, assignment: 8, attendance: 9, total: 52 },
  { subject: 'Chemistry', ct1: 17, ct2: 16, assignment: 9, attendance: 10, total: 52 },
  { subject: 'English', ct1: 19, ct2: 18, assignment: 10, attendance: 10, total: 57 },
  { subject: 'Computer', ct1: 20, ct2: 19, assignment: 10, attendance: 10, total: 59 },
];

const mockDocuments = [
  { name: 'SSC Certificate', type: 'PDF', date: '2024-01-15', size: '1.2 MB' },
  { name: 'Birth Certificate', type: 'PDF', date: '2024-01-15', size: '800 KB' },
  { name: 'NID Card', type: 'Image', date: '2024-01-15', size: '500 KB' },
  { name: 'Passport Photo', type: 'Image', date: '2024-01-15', size: '200 KB' },
];

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { user, loading: authLoading } = useAuth();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const displayStudentId = isTeacher ? (user?.studentId || 'N/A') : (studentData?.currentRollNumber || user?.studentId || 'N/A');
  const displaySession = isTeacher ? null : (studentData?.session || '2024-25');
  const displayShift = isTeacher ? null : (studentData?.shift || '1st Shift');

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border overflow-hidden shadow-card"
      >
        <div className="h-24 md:h-32 gradient-hero relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
        </div>
        
        <div className="px-3 md:px-4 lg:px-6 pb-3 md:pb-4 lg:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 md:gap-3 lg:gap-4 -mt-8 md:-mt-10 lg:-mt-12">
            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-lg md:rounded-xl lg:rounded-2xl gradient-accent flex items-center justify-center text-xl md:text-2xl lg:text-3xl font-bold text-primary-foreground border-3 md:border-4 border-card shadow-xl">
              {displayName.charAt(0)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl lg:text-2xl font-display font-bold truncate">{displayName}</h1>
              <p className="text-xs md:text-sm lg:text-base text-muted-foreground truncate">
                {displayDepartment}{displaySemester ? ` • Semester ${displaySemester}` : ''}
              </p>
            </div>

            <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto text-xs md:text-sm">
              <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Edit Profile</span>
              <span className="sm:hidden">Edit</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-2 lg:gap-4 mt-3 md:mt-4 lg:mt-6">
            <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-xs lg:text-sm">
              <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{displayEmail}</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-xs lg:text-sm">
              <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{studentData?.mobileStudent || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-xs lg:text-sm">
              <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">Sirajganj, Bangladesh</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-xs lg:text-sm">
              <Building className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{displayStudentId}</span>
            </div>
          </div>
        </div>
      </motion.div>

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
                  "flex items-center gap-1 md:gap-1.5 lg:gap-2 px-2 md:px-2.5 lg:px-4 py-1.5 md:py-2 lg:py-2.5 rounded-md md:rounded-lg text-[10px] md:text-xs lg:text-sm font-medium transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                )}
              >
                <tab.icon className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
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
            <div className="grid md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
              <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card">
                <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  Personal Information
                </h3>
                <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Full Name (English)</span>
                    <span className="font-medium text-right">{displayName}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Full Name (Bangla)</span>
                    <span className="font-medium text-right">{studentData?.fullNameBangla || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Roll Number</span>
                    <span className="font-medium text-right">{displayStudentId}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-right">{displayEmail}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Mobile</span>
                    <span className="font-medium text-right">{studentData?.mobileStudent || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card">
                <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  Academic Information
                </h3>
                <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium text-right">{displayDepartment}</span>
                  </div>
                  {displaySession && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Session</span>
                      <span className="font-medium text-right">{displaySession}</span>
                    </div>
                  )}
                  {displaySemester && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Semester</span>
                      <span className="font-medium text-right">{displaySemester}{displaySemester === 1 ? 'st' : displaySemester === 2 ? 'nd' : displaySemester === 3 ? 'rd' : 'th'} Semester</span>
                    </div>
                  )}
                  {displayShift && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Shift</span>
                      <span className="font-medium text-right">{displayShift}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Status</span>
                    <span className={cn(
                      "font-medium text-right",
                      studentData?.status === 'active' ? 'text-success' : 'text-muted-foreground'
                    )}>{studentData?.status || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card md:col-span-2">
                <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  Academic Performance
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
                  <div className="bg-secondary/50 rounded-lg md:rounded-xl p-2.5 md:p-3 lg:p-4 text-center">
                    <p className="text-xl md:text-2xl lg:text-3xl font-bold text-primary">3.45</p>
                    <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-0.5">Current CGPA</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg md:rounded-xl p-2.5 md:p-3 lg:p-4 text-center">
                    <p className="text-xl md:text-2xl lg:text-3xl font-bold text-success">92%</p>
                    <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-0.5">Attendance</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg md:rounded-xl p-2.5 md:p-3 lg:p-4 text-center">
                    <p className="text-xl md:text-2xl lg:text-3xl font-bold text-accent">#5</p>
                    <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-0.5">Class Rank</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg md:rounded-xl p-2.5 md:p-3 lg:p-4 text-center">
                    <p className="text-xl md:text-2xl lg:text-3xl font-bold text-warning">8</p>
                    <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-0.5">Subjects</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Routine Tab */}
          {activeTab === 'routine' && (
            <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card overflow-x-auto">
              <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4">Weekly Class Routine</h3>
              <div className="overflow-x-auto -mx-3 px-3 md:-mx-4 md:px-4 lg:mx-0 lg:px-0">
                <table className="w-full min-w-[500px] md:min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 md:py-3 px-2 md:px-4 text-[10px] md:text-xs lg:text-sm font-medium text-muted-foreground">Day</th>
                      <th className="text-center py-2 md:py-3 px-1 md:px-2 lg:px-4 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">9:00-10:00</th>
                      <th className="text-center py-2 md:py-3 px-1 md:px-2 lg:px-4 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">10:00-11:00</th>
                      <th className="text-center py-2 md:py-3 px-1 md:px-2 lg:px-4 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">11:00-11:30</th>
                      <th className="text-center py-2 md:py-3 px-1 md:px-2 lg:px-4 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">11:30-12:30</th>
                      <th className="text-center py-2 md:py-3 px-1 md:px-2 lg:px-4 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">12:30-2:30</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockRoutine.map((row, i) => (
                      <tr key={row.day} className={i !== mockRoutine.length - 1 ? 'border-b border-border' : ''}>
                        <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium">{row.day}</td>
                        {row.periods.map((period, j) => (
                          <td key={j} className="py-2 md:py-3 px-1 md:px-2 lg:px-4 text-center">
                            <span className={cn(
                              "inline-block px-1.5 md:px-2 lg:px-3 py-1 md:py-1.5 rounded-md md:rounded-lg text-[9px] md:text-[10px] lg:text-xs font-medium",
                              period === 'Break' 
                                ? 'bg-muted text-muted-foreground' 
                                : period === 'Lab'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-primary/10 text-primary'
                            )}>
                              {period}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-3 md:space-y-4 lg:space-y-6">
              <div className="grid md:grid-cols-3 gap-2 md:gap-3 lg:gap-4">
                <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card text-center">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-success">92%</p>
                  <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-0.5 md:mt-1">Overall Attendance</p>
                </div>
                <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card text-center">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">46</p>
                  <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-0.5 md:mt-1">Classes Attended</p>
                </div>
                <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card text-center">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-destructive">4</p>
                  <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-0.5 md:mt-1">Classes Missed</p>
                </div>
              </div>

              <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card">
                <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4">Subject-wise Attendance</h3>
                <div className="space-y-3 md:space-y-4">
                  {['Mathematics', 'Physics', 'Chemistry', 'English', 'Computer'].map((subject, i) => {
                    const percentage = 85 + Math.floor(Math.random() * 15);
                    return (
                      <div key={subject}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs md:text-sm font-medium">{subject}</span>
                          <span className="text-xs md:text-sm text-muted-foreground">{percentage}%</span>
                        </div>
                        <div className="h-1.5 md:h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className={cn(
                              "h-full rounded-full",
                              percentage >= 90 ? 'bg-success' : percentage >= 75 ? 'bg-warning' : 'bg-destructive'
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Marks Tab */}
          {activeTab === 'marks' && (
            <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card overflow-x-auto">
              <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4">Internal Assessment Marks</h3>
              <div className="overflow-x-auto -mx-3 px-3 md:-mx-4 md:px-4 lg:mx-0 lg:px-0">
                <table className="w-full min-w-[500px] md:min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 md:py-3 px-2 md:px-4 text-[10px] md:text-xs lg:text-sm font-medium text-muted-foreground">Subject</th>
                      <th className="text-center py-2 md:py-3 px-1 md:px-2 lg:px-4 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">CT-1</th>
                      <th className="text-center py-2 md:py-3 px-1 md:px-2 lg:px-4 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">CT-2</th>
                      <th className="text-center py-2 md:py-3 px-1 md:px-2 lg:px-4 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground hidden sm:table-cell">Assgn</th>
                      <th className="text-center py-2 md:py-3 px-1 md:px-2 lg:px-4 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground hidden sm:table-cell">Attend</th>
                      <th className="text-center py-2 md:py-3 px-1 md:px-2 lg:px-4 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockMarks.map((row, i) => (
                      <tr key={row.subject} className={i !== mockMarks.length - 1 ? 'border-b border-border' : ''}>
                        <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium">{row.subject}</td>
                        <td className="py-2 md:py-3 px-1 md:px-2 lg:px-4 text-center text-xs md:text-sm">{row.ct1}</td>
                        <td className="py-2 md:py-3 px-1 md:px-2 lg:px-4 text-center text-xs md:text-sm">{row.ct2}</td>
                        <td className="py-2 md:py-3 px-1 md:px-2 lg:px-4 text-center text-xs md:text-sm hidden sm:table-cell">{row.assignment}</td>
                        <td className="py-2 md:py-3 px-1 md:px-2 lg:px-4 text-center text-xs md:text-sm hidden sm:table-cell">{row.attendance}</td>
                        <td className="py-2 md:py-3 px-1 md:px-2 lg:px-4 text-center">
                          <span className={cn(
                            "inline-block px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-xs lg:text-sm font-semibold",
                            row.total >= 54 ? 'bg-success/10 text-success' : row.total >= 48 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                          )}>
                            {row.total}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="grid md:grid-cols-2 gap-2 md:gap-3 lg:gap-4">
              {mockDocuments.map((doc) => (
                <div key={doc.name} className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-2.5 md:p-3 lg:p-4 shadow-card flex items-center gap-2 md:gap-3 lg:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">{doc.type} • {doc.size} • {doc.date}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
                    <Download className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Admission Tab */}
          {activeTab === 'admission' && (
            <div className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card">
              <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4">Admission Details</h3>
              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                  <div className="flex justify-between gap-2 py-1.5 md:py-2 border-b border-border">
                    <span className="text-muted-foreground">Application ID</span>
                    <span className="font-medium text-right">SPI-ADM-2024-1234</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 md:py-2 border-b border-border">
                    <span className="text-muted-foreground">Admission Date</span>
                    <span className="font-medium text-right">January 15, 2024</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 md:py-2 border-b border-border">
                    <span className="text-muted-foreground">SSC GPA</span>
                    <span className="font-medium text-right">4.50</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 md:py-2 border-b border-border">
                    <span className="text-muted-foreground">SSC Board</span>
                    <span className="font-medium text-right">Rajshahi</span>
                  </div>
                </div>
                <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                  <div className="flex justify-between gap-2 py-1.5 md:py-2 border-b border-border">
                    <span className="text-muted-foreground">Admission Type</span>
                    <span className="font-medium text-right">Regular</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 md:py-2 border-b border-border">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-success text-right">Approved</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 md:py-2 border-b border-border">
                    <span className="text-muted-foreground">SSC Year</span>
                    <span className="font-medium text-right">2024</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 md:py-2 border-b border-border">
                    <span className="text-muted-foreground">Previous Institution</span>
                    <span className="font-medium text-right">Model School</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default ProfilePage;
