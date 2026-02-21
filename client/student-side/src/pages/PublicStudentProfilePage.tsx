import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  GraduationCap, Mail, Phone, MapPin, Building, Award, 
  BookOpen, Copy, Check, Share2, FileText, Clock, Target,
  TrendingUp, User, BarChart3, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { studentService } from '@/services/studentService';
import { settingsService, SystemSettings } from '@/services/settingsService';
import { getErrorMessage } from '@/lib/api';

export default function PublicStudentProfilePage() {
  const { studentId } = useParams();
  const [copied, setCopied] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [instituteSettings, setInstituteSettings] = useState<SystemSettings | null>(null);

  const getPreferredRollNumber = (studentData: any): string | null => {
    const rollCandidates = [
      studentData?.currentRollNumber,
      studentData?.current_roll_number,
      studentData?.rollNumber,
      studentData?.roll_number,
    ];

    for (const value of rollCandidates) {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }

    return null;
  };

  const preferredRollNumber = getPreferredRollNumber(student);

  // Generate public profile URL using roll number if available, otherwise use the identifier from URL
  const publicProfileUrl = preferredRollNumber
    ? `${window.location.origin}/student/${preferredRollNumber}`
    : `${window.location.origin}/student/${studentId}`;

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  const fetchData = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch both student data and institute settings in parallel
      const [studentData, settings] = await Promise.all([
        studentService.getStudentByIdentifier(studentId),
        settingsService.getSystemSettings().catch(() => null) // Don't fail if settings unavailable
      ]);

      console.log('Student data received:', studentData);
      console.log('Current Roll Number:', studentData.currentRollNumber);
      
      setStudent(studentData);
      setInstituteSettings(settings);

      // Use profilePhoto from student data if available
      if (studentData.profilePhoto) {
        // Construct the full URL for the profile photo
        const photoUrl = studentData.profilePhoto.startsWith('http') 
          ? studentData.profilePhoto 
          : `${window.location.origin}/${studentData.profilePhoto}`;
        console.log('Profile photo URL:', photoUrl);
        setProfilePicture(photoUrl);
      }
    } catch (err: any) {
      console.error('Failed to load student profile:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicProfileUrl);
    setCopied(true);
    toast.success('Profile link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Profile Not Found</h3>
          <p className="text-muted-foreground">
            {error || 'The student profile you are looking for could not be found.'}
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Transform student data to match the expected format
  const instituteName = instituteSettings?.institute_name || 'Sylhet Polytechnic Institute';
  
  // Calculate CGPA from semester results
  const calculateCGPA = () => {
    if (!student.semesterResults || student.semesterResults.length === 0) {
      return 0;
    }

    // Get all GPA results
    const gpaResults = student.semesterResults.filter(
      (result: any) => result.resultType === 'gpa' && result.gpa != null
    );

    if (gpaResults.length === 0) {
      return 0;
    }

    // If CGPA is available in the latest result and is not 0, use it
    const latestResult = gpaResults[gpaResults.length - 1];
    if (latestResult.cgpa != null && latestResult.cgpa > 0) {
      return latestResult.cgpa;
    }

    // If CGPA is 0 or null, use the latest GPA instead
    if (latestResult.gpa != null && latestResult.gpa > 0) {
      return latestResult.gpa;
    }

    // Otherwise, calculate average GPA as fallback
    const totalGPA = gpaResults.reduce((sum: number, result: any) => sum + result.gpa, 0);
    return totalGPA / gpaResults.length;
  };

  // Calculate attendance rate from semester attendance
  const calculateAttendanceRate = () => {
    if (!student.semesterAttendance || student.semesterAttendance.length === 0) {
      return 0;
    }

    let totalPresent = 0;
    let totalClasses = 0;

    student.semesterAttendance.forEach((semesterAtt: any) => {
      if (semesterAtt.subjects && Array.isArray(semesterAtt.subjects)) {
        semesterAtt.subjects.forEach((subject: any) => {
          totalPresent += subject.present || 0;
          totalClasses += subject.total || 0;
        });
      }
    });

    if (totalClasses === 0) {
      return 0;
    }

    return Math.round((totalPresent / totalClasses) * 100);
  };

  const calculatedCGPA = calculateCGPA();
  const calculatedAttendance = calculateAttendanceRate();
  
  // Show roll number first; if missing, fall back to student identifier/id
  const displayRollNumber =
    preferredRollNumber ||
    student.studentId ||
    student.student_id ||
    student.id ||
    studentId ||
    'N/A';
  
  console.log('URL Identifier:', studentId);
  console.log('Student Current Roll Number from API:', student.currentRollNumber);
  console.log('Student Preferred Roll Number:', preferredRollNumber);
  console.log('Display Roll Number:', displayRollNumber);
  console.log('Calculated CGPA:', calculatedCGPA);
  console.log('Calculated Attendance:', calculatedAttendance);
  
  const transformedStudent = {
    id: student.id,
    name: student.fullNameEnglish || 'Student',
    headline: `${student.departmentName || (typeof student.department === 'object' ? student.department?.name : student.department) || 'Student'} • Semester ${student.semester || 1}`,
    department: student.departmentName || (typeof student.department === 'object' ? student.department?.name : student.department) || 'N/A',
    semester: student.semester || 1,
    session: student.session || '2024-25',
    rollNumber: displayRollNumber,
    email: student.email || 'N/A',
    phone: student.mobileStudent || 'N/A',
    location: student.presentAddress ? 
      `${student.presentAddress.district || ''}, ${student.presentAddress.division || 'Bangladesh'}`.replace(/^,\s*|,\s*$/g, '') : 
      'Bangladesh',
    university: instituteName,
    about: `${student.fullNameEnglish || 'Student'} is currently studying ${student.departmentName || (typeof student.department === 'object' ? student.department?.name : student.department) || 'at our institute'} in semester ${student.semester || 1}. 

This is a public profile showcasing academic information and achievements.`,
    skills: ['Academic Excellence', 'Problem Solving', 'Team Work', 'Communication'],
    interests: ['Technology', 'Learning', 'Innovation', 'Development'],
    cgpa: calculatedCGPA,
    attendanceRate: calculatedAttendance,
    completedCourses: student.semesterResults?.length || 0,
    currentCourses: [],
    achievements: [],
    projects: [],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="font-semibold text-sm">{instituteName}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopyLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border shadow-card"
        >
        {/* Cover Banner */}
        <div className="h-32 sm:h-40 md:h-48 relative overflow-hidden rounded-t-xl">
          <img 
            src="/cover-image.jpg" 
            alt="Institute Cover" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to gradient if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).style.display = 'block';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700" style={{ display: 'none' }} />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="px-4 md:px-6 pb-6">
          {/* Avatar - positioned to overlap banner with proper spacing */}
          <div className="-mt-16 sm:-mt-20 md:-mt-24 mb-4 relative z-10">
            {profilePicture ? (
              <img 
                src={profilePicture} 
                alt={transformedStudent.name}
                className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-card shadow-xl bg-card"
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-bold text-white border-4 border-card shadow-xl">
                {transformedStudent.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
            )}
          </div>

          {/* Name and Info - separated from avatar to prevent cutoff */}
          <div className="space-y-3">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold break-words">{transformedStudent.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">{transformedStudent.headline}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-[10px] sm:text-xs">{transformedStudent.department}</Badge>
              <span>•</span>
              <span>Semester {transformedStudent.semester}</span>
              <span>•</span>
              <span>Roll: {transformedStudent.rollNumber}</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-primary truncate">{transformedStudent.university}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            <Button size="sm" className="gap-1.5 text-xs sm:text-sm">
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Contact
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={handleCopyLink}>
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Share Profile</span>
              <span className="sm:hidden">Share</span>
            </Button>
          </div>
        </div>
      </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2 sm:gap-3"
        >
          {[
            { icon: BarChart3, label: 'CGPA', value: transformedStudent.cgpa.toFixed(2), color: 'text-emerald-500 bg-emerald-500/10' },
            { icon: Clock, label: 'Attendance', value: `${transformedStudent.attendanceRate}%`, color: 'text-blue-500 bg-blue-500/10' },
            { icon: BookOpen, label: 'Semester', value: transformedStudent.semester, color: 'text-violet-500 bg-violet-500/10' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-lg sm:rounded-xl border border-border p-2 sm:p-3 md:p-4 shadow-card flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 text-center sm:text-left">
              <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0", stat.color)}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-sm sm:text-lg md:text-xl font-bold">{stat.value}</p>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card"
        >
          <h2 className="text-base md:text-lg font-semibold mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            About
          </h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{transformedStudent.about}</p>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border rounded-lg sm:rounded-xl p-1 mb-3 sm:mb-4 overflow-x-auto">
            <TabsTrigger value="courses" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Courses</span>
              <span className="xs:hidden">📚</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3">
              <Award className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Achievements</span>
              <span className="xs:hidden">🏆</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Projects</span>
              <span className="xs:hidden">📁</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Academic Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                  <div>
                    <h4 className="font-medium text-sm">Department</h4>
                    <p className="text-xs text-muted-foreground">{transformedStudent.department}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                  <div>
                    <h4 className="font-medium text-sm">Current Semester</h4>
                    <p className="text-xs text-muted-foreground">Semester {transformedStudent.semester}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                  <div>
                    <h4 className="font-medium text-sm">Session</h4>
                    <p className="text-xs text-muted-foreground">{transformedStudent.session}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Student Information
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3 p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Roll Number</h4>
                    <p className="text-xs text-muted-foreground">{transformedStudent.rollNumber}</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Academic Status</h4>
                    <p className="text-xs text-muted-foreground">{student.status || 'Active'}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="projects">
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-border">
                  <h4 className="font-medium">Email</h4>
                  <p className="text-sm text-muted-foreground mt-1">{transformedStudent.email}</p>
                </div>
                {transformedStudent.phone !== 'N/A' && (
                  <div className="p-4 rounded-lg border border-border">
                    <h4 className="font-medium">Phone</h4>
                    <p className="text-sm text-muted-foreground mt-1">{transformedStudent.phone}</p>
                  </div>
                )}
                <div className="p-4 rounded-lg border border-border">
                  <h4 className="font-medium">Location</h4>
                  <p className="text-sm text-muted-foreground mt-1">{transformedStudent.location}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Skills & Interests */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {transformedStudent.skills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {transformedStudent.interests.map((interest, i) => (
                <Badge key={i} variant="outline" className="text-xs">{interest}</Badge>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Contact */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-card rounded-lg sm:rounded-xl border border-border p-3 sm:p-4 md:p-6 shadow-card">
          <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Email</p>
                <p className="text-xs sm:text-sm font-medium truncate">{transformedStudent.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Phone</p>
                <p className="text-xs sm:text-sm font-medium truncate">{transformedStudent.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Location</p>
                <p className="text-xs sm:text-sm font-medium truncate">{transformedStudent.location}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border py-4 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {instituteName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
