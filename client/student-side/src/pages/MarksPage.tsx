import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, Award, Filter, Download,
  ChevronDown, Star, Target, BookOpen, Trophy, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { marksService, type MarksRecord } from '@/services/marksService';
import { studentService } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const semesters = ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester'];

interface SubjectMark {
  subject: string;
  code: string;
  ct1: number;
  ct2: number;
  ct3: number;
  assignment: number;
  attendance: number;
  internalTotal: number;
  finalExam: number | null;
  total: number | null;
  grade: string | null;
  gpa: number | null;
}

const gradeScale = [
  { range: '80-100', grade: 'A+', gpa: 4.0 },
  { range: '75-79', grade: 'A', gpa: 3.75 },
  { range: '70-74', grade: 'A-', gpa: 3.50 },
  { range: '65-69', grade: 'B+', gpa: 3.25 },
  { range: '60-64', grade: 'B', gpa: 3.0 },
  { range: '55-59', grade: 'B-', gpa: 2.75 },
  { range: '50-54', grade: 'C+', gpa: 2.50 },
  { range: '45-49', grade: 'C', gpa: 2.25 },
  { range: '40-44', grade: 'D', gpa: 2.0 },
  { range: '0-39', grade: 'F', gpa: 0.0 },
];

const getGradeColor = (grade: string | null) => {
  if (!grade) return 'text-muted-foreground';
  if (grade.startsWith('A')) return 'text-success';
  if (grade.startsWith('B')) return 'text-primary';
  if (grade.startsWith('C')) return 'text-warning';
  return 'text-destructive';
};

const getPercentageColor = (total: number | null) => {
  if (total === null) return 'bg-muted';
  if (total >= 80) return 'bg-success';
  if (total >= 60) return 'bg-primary';
  if (total >= 40) return 'bg-warning';
  return 'bg-destructive';
};

export default function MarksPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedSemester, setSelectedSemester] = useState(0);
  const [showGradeScale, setShowGradeScale] = useState(false);
  const [marksData, setMarksData] = useState<SubjectMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [semesterResult, setSemesterResult] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && user?.relatedProfileId) {
      fetchMarks();
    } else if (!authLoading && !user?.relatedProfileId) {
      setError('User not authenticated or student profile not found');
      setLoading(false);
    }
  }, [selectedSemester, authLoading, user?.relatedProfileId]);

  const fetchMarks = async () => {
    if (!user?.relatedProfileId) {
      setError('User not authenticated or student profile not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get semester number (1-indexed)
      const semesterNum = selectedSemester + 1;
      
      // Fetch from both sources in parallel
      const [marksResponse, studentData] = await Promise.all([
        marksService.getMyMarks({
          student: user.relatedProfileId,
          semester: semesterNum,
          page_size: 100,
          ordering: 'subject_code'
        }).catch((err) => {
          console.error('Error fetching marks:', err);
          return { results: [] };
        }),
        studentService.getStudent(user.relatedProfileId).catch((err) => {
          console.error('Error fetching student data:', err);
          return null;
        })
      ]);
      
      console.log('Marks response:', marksResponse);
      console.log('Student data:', studentData);
      
      // Store semester result for stats
      if (studentData?.semesterResults) {
        const result = studentData.semesterResults.find(
          (r: any) => r.semester === semesterNum
        );
        setSemesterResult(result || null);
      } else {
        setSemesterResult(null);
      }
      
      // Group marks by subject and aggregate from MarksRecord
      const subjectMap = new Map<string, SubjectMark>();
      
      // Track quiz marks separately to properly assign to CT-1, CT-2, CT-3
      const quizMarksBySubject = new Map<string, { ct1?: number; ct2?: number; ct3?: number }>();
      
      // Helper to get field value (handle both camelCase and snake_case)
      const getField = (record: any, field: string): any => {
        // Try camelCase first
        if (record[field] !== undefined) return record[field];
        // Try snake_case
        const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (record[snakeCase] !== undefined) return record[snakeCase];
        // Try lowercase
        if (record[field.toLowerCase()] !== undefined) return record[field.toLowerCase()];
        return null;
      };
      
      // Helper to convert to number safely
      const toNumber = (value: any): number => {
        if (value === null || value === undefined) return 0;
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      };
      
      // Process marks response
      if (marksResponse?.results && marksResponse.results.length > 0) {
        marksResponse.results.forEach((record: any) => {
          // Handle both camelCase and snake_case field names
          const subjectCode = getField(record, 'subjectCode') || '';
          const subjectName = getField(record, 'subjectName') || '';
          const examType = getField(record, 'examType') || '';
          const marksObtained = toNumber(getField(record, 'marksObtained'));
          const remarks = getField(record, 'remarks') || '';
          
          if (!subjectCode) {
            console.warn('Skipping mark record with missing subjectCode:', record);
            return;
          }
          
          const key = subjectCode;
          
          // Collect quiz marks separately, using remarks to identify CT number
          if (examType === 'quiz') {
            if (!quizMarksBySubject.has(key)) {
              quizMarksBySubject.set(key, {});
            }
            const quizData = quizMarksBySubject.get(key)!;
            // Check remarks to identify which CT this is
            const remarksLower = remarks.toLowerCase();
            if (remarksLower.includes('ct-1') || remarksLower.includes('ct1')) {
              quizData.ct1 = marksObtained;
            } else if (remarksLower.includes('ct-2') || remarksLower.includes('ct2')) {
              quizData.ct2 = marksObtained;
            } else if (remarksLower.includes('ct-3') || remarksLower.includes('ct3')) {
              quizData.ct3 = marksObtained;
            } else {
              // Fallback: assign sequentially if no remarks
              if (quizData.ct1 === undefined) quizData.ct1 = marksObtained;
              else if (quizData.ct2 === undefined) quizData.ct2 = marksObtained;
              else if (quizData.ct3 === undefined) quizData.ct3 = marksObtained;
            }
          }
        });
        
        // Process all marks
        marksResponse.results.forEach((record: any) => {
          const subjectCode = getField(record, 'subjectCode') || '';
          const subjectName = getField(record, 'subjectName') || '';
          const examType = getField(record, 'examType') || '';
          const marksObtained = toNumber(getField(record, 'marksObtained'));
          
          if (!subjectCode) return;
          
          const key = subjectCode;
          if (!subjectMap.has(key)) {
            subjectMap.set(key, {
              subject: subjectName || 'Unknown Subject',
              code: subjectCode,
              ct1: 0,
              ct2: 0,
              ct3: 0,
              assignment: 0,
              attendance: 0,
              internalTotal: 0,
              finalExam: null,
              total: null,
              grade: null,
              gpa: null
            });
          }
          
          const subject = subjectMap.get(key)!;
          
          // Aggregate marks based on exam type
          if (examType === 'quiz') {
            // Quiz marks are handled separately below
            // Do nothing here, we'll assign them after processing all records
          } else if (examType === 'midterm') {
            // CT-2 is saved as 'midterm' from admin side (backward compatibility)
            subject.ct2 = marksObtained;
          } else if (examType === 'assignment') {
            subject.assignment = marksObtained;
          } else if (examType === 'practical') {
            // Attendance is saved as 'practical'
            subject.attendance = marksObtained;
          } else if (examType === 'final') {
            subject.finalExam = marksObtained;
          }
        });
      }
      
      // Now assign quiz marks to CT-1, CT-2, CT-3 slots
      quizMarksBySubject.forEach((quizData, key) => {
        if (subjectMap.has(key)) {
          const subject = subjectMap.get(key)!;
          // Assign quiz marks based on remarks or sequentially
          if (quizData.ct1 !== undefined && subject.ct1 === 0) {
            subject.ct1 = quizData.ct1;
          }
          if (quizData.ct2 !== undefined && subject.ct2 === 0) {
            subject.ct2 = quizData.ct2;
          }
          if (quizData.ct3 !== undefined && subject.ct3 === 0) {
            subject.ct3 = quizData.ct3;
          }
        }
      });
      
      // Also check semesterResults from Student model for the selected semester
      if (studentData?.semesterResults) {
        const semesterResult = studentData.semesterResults.find(
          (result: any) => result.semester === semesterNum
        );
        
        if (semesterResult?.subjects) {
          semesterResult.subjects.forEach((subjectResult: any) => {
            const key = subjectResult.code;
            if (!subjectMap.has(key)) {
              // Create new entry from semesterResults
              // Convert grade to estimated total for display
              const gradeToTotal: { [key: string]: number } = {
                'A+': 90, 'A': 85, 'A-': 80,
                'B+': 75, 'B': 70, 'B-': 65,
                'C+': 60, 'C': 55, 'C-': 50,
                'D': 45, 'F': 35
              };
              const estimatedTotal = subjectResult.grade ? (gradeToTotal[subjectResult.grade] || null) : null;
              
              subjectMap.set(key, {
                subject: subjectResult.name,
                code: subjectResult.code,
                ct1: 0,
                ct2: 0,
                ct3: 0,
                assignment: 0,
                attendance: 0,
                internalTotal: 0,
                finalExam: null,
                total: estimatedTotal,
                grade: subjectResult.grade || null,
                gpa: subjectResult.gradePoint || null
              });
            } else {
              // Update existing entry with grade/GPA from semesterResults if available
              const subject = subjectMap.get(key)!;
              if (subjectResult.grade) {
                subject.grade = subjectResult.grade;
              }
              if (subjectResult.gradePoint) {
                subject.gpa = subjectResult.gradePoint;
              }
              // If we have grade but no total, estimate total from grade
              if (subjectResult.grade && !subject.total) {
                const gradeToTotal: { [key: string]: number } = {
                  'A+': 90, 'A': 85, 'A-': 80,
                  'B+': 75, 'B': 70, 'B-': 65,
                  'C+': 60, 'C': 55, 'C-': 50,
                  'D': 45, 'F': 35
                };
                subject.total = gradeToTotal[subjectResult.grade] || null;
              }
            }
          });
        }
      }
      
      // Calculate totals and grades
      const transformedData = Array.from(subjectMap.values()).map(subject => {
        // Calculate internal total (CT-1 + CT-2 + CT-3 + Assignment + Attendance)
        subject.internalTotal = (subject.ct1 || 0) + (subject.ct2 || 0) + (subject.ct3 || 0) + (subject.assignment || 0) + (subject.attendance || 0);
        
        // Calculate total if we have final exam marks
        if (subject.finalExam !== null && subject.finalExam > 0) {
          subject.total = subject.internalTotal + subject.finalExam;
          // Only calculate grade/GPA if not already set from semesterResults
          if (!subject.grade) {
            subject.grade = calculateGrade(subject.total);
          }
          if (!subject.gpa) {
            subject.gpa = calculateGPA(subject.total);
          }
        } else if (subject.total === null && subject.internalTotal > 0) {
          // If we have internal marks but no final, show internal as total
          subject.total = subject.internalTotal;
        }
        return subject;
      });
      
      setMarksData(transformedData);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load marks', {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateGrade = (total: number): string => {
    if (total >= 90) return 'A+';
    if (total >= 85) return 'A';
    if (total >= 80) return 'A-';
    if (total >= 75) return 'B+';
    if (total >= 70) return 'B';
    if (total >= 65) return 'C+';
    if (total >= 60) return 'C';
    if (total >= 50) return 'D';
    return 'F';
  };

  const calculateGPA = (total: number): number => {
    if (total >= 90) return 4.00;
    if (total >= 85) return 4.00;
    if (total >= 80) return 3.75;
    if (total >= 75) return 3.50;
    if (total >= 70) return 3.25;
    if (total >= 65) return 3.00;
    if (total >= 60) return 2.75;
    if (total >= 50) return 2.50;
    return 0;
  };

  const completedSubjects = marksData.filter(s => s.total !== null || s.grade !== null);
  
  // Use CGPA from semesterResults if available, otherwise calculate
  const cgpa = semesterResult?.cgpa 
    ? semesterResult.cgpa.toFixed(2)
    : (completedSubjects.length > 0 
        ? (completedSubjects.reduce((sum, s) => sum + (s.gpa || 0), 0) / completedSubjects.length).toFixed(2)
        : '0.00');
  
  // Use GPA from semesterResults if available, otherwise calculate average
  const semesterGPA = semesterResult?.gpa 
    ? semesterResult.gpa.toFixed(2)
    : cgpa;
  
  const avgPercentage = completedSubjects.length > 0
    ? Math.round(completedSubjects.reduce((sum, s) => sum + (s.total || 0), 0) / completedSubjects.length)
    : 0;

  const highestMark = completedSubjects.length > 0 
    ? Math.max(...completedSubjects.map(s => s.total || 0).filter(t => t > 0))
    : 0;
  const highestSubject = completedSubjects.find(s => s.total === highestMark);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading marks...</p>
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
          <h3 className="text-lg font-semibold">Failed to Load Marks</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchMarks}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4"
      >
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold">Academic Marks</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">View your grades and academic performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 md:gap-2 text-xs md:text-sm">
            <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 md:gap-2 text-xs md:text-sm">
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </motion.div>

      {/* Performance Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3 lg:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-lg md:rounded-xl lg:rounded-2xl border border-primary/20 p-2.5 md:p-3 lg:p-5 shadow-card"
        >
          <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-md md:rounded-lg lg:rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] lg:text-sm text-muted-foreground truncate">CGPA</p>
              <p className="text-lg md:text-xl lg:text-3xl font-bold text-primary">{cgpa}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-lg md:rounded-xl lg:rounded-2xl border border-primary/20 p-2.5 md:p-3 lg:p-5 shadow-card"
        >
          <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-md md:rounded-lg lg:rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] lg:text-sm text-muted-foreground truncate">Semester GPA</p>
              <p className="text-lg md:text-xl lg:text-3xl font-bold text-primary">{semesterGPA}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-success/10 via-success/5 to-transparent rounded-lg md:rounded-xl lg:rounded-2xl border border-success/20 p-2.5 md:p-3 lg:p-5 shadow-card"
        >
          <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-md md:rounded-lg lg:rounded-xl bg-success/20 flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] lg:text-sm text-muted-foreground truncate">Average</p>
              <p className="text-lg md:text-xl lg:text-3xl font-bold text-success">{avgPercentage}%</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-warning/10 via-warning/5 to-transparent rounded-lg md:rounded-xl lg:rounded-2xl border border-warning/20 p-2.5 md:p-3 lg:p-5 shadow-card"
        >
          <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-md md:rounded-lg lg:rounded-xl bg-warning/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] lg:text-sm text-muted-foreground truncate">Highest</p>
              <p className="text-lg md:text-xl lg:text-3xl font-bold text-warning">{highestMark}%</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-accent/10 via-accent/5 to-transparent rounded-lg md:rounded-xl lg:rounded-2xl border border-accent/20 p-2.5 md:p-3 lg:p-5 shadow-card"
        >
          <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-md md:rounded-lg lg:rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] lg:text-sm text-muted-foreground truncate">Subjects</p>
              <p className="text-lg md:text-xl lg:text-3xl font-bold text-accent">{marksData.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Performer Card */}
      {highestSubject && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-warning/10 via-warning/5 to-transparent rounded-lg md:rounded-xl lg:rounded-2xl border border-warning/30 p-2.5 md:p-3 lg:p-5"
        >
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 lg:w-14 lg:h-14 rounded-lg md:rounded-xl lg:rounded-2xl bg-warning/20 flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">Best Performance</p>
              <p className="text-xs md:text-sm lg:text-lg font-semibold truncate">{highestSubject.subject}</p>
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">{highestSubject.code}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg md:text-xl lg:text-3xl font-bold text-warning">{highestSubject.total}%</p>
              <p className="text-[10px] md:text-xs lg:text-sm font-medium text-success">{highestSubject.grade}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Semester Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-1.5 md:gap-2 overflow-x-auto pb-2"
      >
        {semesters.map((sem, i) => (
          <Button
            key={sem}
            variant={selectedSemester === i ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSemester(i)}
            className="whitespace-nowrap text-xs md:text-sm"
          >
            {sem}
          </Button>
        ))}
      </motion.div>

      {/* Marks Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border shadow-card overflow-hidden"
      >
        <div className="p-2.5 md:p-3 lg:p-4 border-b border-border flex items-center justify-between gap-2">
          <h3 className="text-xs md:text-sm lg:text-lg font-semibold flex items-center gap-1.5 md:gap-2">
            <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary" />
            <span className="hidden sm:inline">Internal Assessment & Final Results</span>
            <span className="sm:hidden">Marks</span>
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGradeScale(!showGradeScale)}
            className="gap-1 text-xs md:text-sm"
          >
            <span className="hidden sm:inline">Grade Scale</span>
            <span className="sm:hidden">Scale</span>
            <ChevronDown className={cn("w-3.5 h-3.5 md:w-4 md:h-4 transition-transform", showGradeScale && "rotate-180")} />
          </Button>
        </div>

        {/* Grade Scale Dropdown */}
        {showGradeScale && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-2.5 md:px-3 lg:px-4 py-2 md:py-2.5 lg:py-3 bg-secondary/30 border-b border-border"
          >
            <div className="flex flex-wrap gap-1.5 md:gap-2 lg:gap-3">
              {gradeScale.map((item) => (
                <div key={item.grade} className="flex items-center gap-1 md:gap-1.5 lg:gap-2 bg-background rounded-md md:rounded-lg px-1.5 md:px-2 lg:px-3 py-1 md:py-1.5">
                  <span className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground">{item.range}</span>
                  <span className={cn("text-xs md:text-sm font-semibold", getGradeColor(item.grade))}>{item.grade}</span>
                  <span className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground">({item.gpa})</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="overflow-x-auto -mx-3 px-3 md:-mx-4 md:px-4 lg:mx-0 lg:px-0">
          <table className="w-full min-w-[600px] md:min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-1.5 md:py-2 lg:py-3 px-1.5 md:px-2 lg:px-4 text-[10px] md:text-xs lg:text-sm font-medium text-muted-foreground">Subject</th>
                <th className="text-center py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">CT-1</th>
                <th className="text-center py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">CT-2</th>
                <th className="text-center py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">CT-3</th>
                <th className="text-center py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground hidden sm:table-cell">Assgn</th>
                <th className="text-center py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground hidden sm:table-cell">Attend</th>
                <th className="text-center py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">Int.</th>
                <th className="text-center py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">Final</th>
                <th className="text-center py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">Total</th>
                <th className="text-center py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground">Grade</th>
                <th className="text-center py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-[9px] md:text-[10px] lg:text-sm font-medium text-muted-foreground hidden md:table-cell">GPA</th>
              </tr>
            </thead>
            <tbody>
              {marksData.length > 0 ? (
                marksData.map((row, i) => (
                  <motion.tr
                    key={`${row.code}-${i}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className={cn(
                      "border-b border-border/50 hover:bg-secondary/20 transition-colors",
                      i === marksData.length - 1 && "border-0"
                    )}
                  >
                  <td className="py-1.5 md:py-2 lg:py-3 px-1.5 md:px-2 lg:px-4">
                    <div className="min-w-0">
                      <p className="text-[10px] md:text-xs lg:text-sm font-medium truncate">{row.subject}</p>
                      <p className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground">{row.code}</p>
                    </div>
                  </td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm">
                    {row.ct1 > 0 ? row.ct1 : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm">
                    {row.ct2 > 0 ? row.ct2 : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm">
                    {row.ct3 > 0 ? row.ct3 : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm hidden sm:table-cell">
                    {row.assignment > 0 ? row.assignment : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm hidden sm:table-cell">
                    {row.attendance > 0 ? row.attendance : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm font-medium">
                    {row.internalTotal > 0 ? row.internalTotal : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm">
                    {row.finalExam !== null ? row.finalExam : (
                      <span className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground italic">-</span>
                    )}
                  </td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center">
                    {row.total !== null ? (
                      <span className={cn(
                        "inline-flex items-center justify-center w-7 h-5 md:w-8 md:h-6 lg:w-12 lg:h-8 rounded-md lg:rounded-lg text-[9px] md:text-[10px] lg:text-sm font-bold text-white",
                        getPercentageColor(row.total)
                      )}>
                        {row.total}
                      </span>
                    ) : (
                      <span className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground italic">-</span>
                    )}
                  </td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center">
                    {row.grade ? (
                      <span className={cn("text-xs md:text-sm lg:text-lg font-bold", getGradeColor(row.grade))}>
                        {row.grade}
                      </span>
                    ) : (
                      <span className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground italic">-</span>
                    )}
                  </td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center hidden md:table-cell">
                    {row.gpa !== null ? (
                      <span className="text-xs md:text-sm font-medium">{row.gpa.toFixed(2)}</span>
                    ) : (
                      <span className="text-[10px] md:text-xs text-muted-foreground italic">-</span>
                    )}
                  </td>
                </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen className="w-8 h-8 opacity-50" />
                      <p>No marks available for this semester</p>
                      <p className="text-xs">Marks will appear here once they are added by your teachers</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="p-2.5 md:p-3 lg:p-4 bg-secondary/30 border-t border-border">
          <div className="flex flex-wrap justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4 lg:gap-6">
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Completed</p>
                <p className="text-xs md:text-sm font-semibold">{completedSubjects.length} / {marksData.length} Subjects</p>
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Semester GPA</p>
                <p className="text-xs md:text-sm font-semibold text-primary">{cgpa}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-success" />
              <span className="text-[10px] md:text-xs lg:text-sm text-success font-medium">Above Average Performance</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Subject Performance Bars */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card rounded-lg md:rounded-xl lg:rounded-2xl border border-border p-3 md:p-4 lg:p-6 shadow-card"
      >
        <h3 className="text-sm md:text-base lg:text-lg font-semibold mb-3 md:mb-4 lg:mb-6 flex items-center gap-1.5 md:gap-2">
          <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          Subject Performance Overview
        </h3>
        <div className="space-y-3 md:space-y-4">
          {marksData.filter(s => s.total !== null).map((subject, i) => (
            <div key={subject.code}>
              <div className="flex items-center justify-between mb-1.5 md:mb-2">
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
                  <span className="text-xs md:text-sm font-medium truncate">{subject.subject}</span>
                  <span className={cn("text-xs md:text-sm font-bold flex-shrink-0", getGradeColor(subject.grade))}>
                    {subject.grade}
                  </span>
                </div>
                <span className="text-xs md:text-sm font-semibold flex-shrink-0 ml-2">{subject.total}%</span>
              </div>
              <div className="h-2 md:h-2.5 lg:h-3 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${subject.total}%` }}
                  transition={{ duration: 0.8, delay: 0.1 * i }}
                  className={cn("h-full rounded-full", getPercentageColor(subject.total))}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
