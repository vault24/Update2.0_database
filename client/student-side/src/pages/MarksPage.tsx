import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, Award, Filter, Download,
  ChevronDown, Star, Target, BookOpen, Trophy, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { marksService, type MarksRecord } from '@/services/marksService';
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
      
      const response = await marksService.getMyMarks({
        student: user.relatedProfileId,
        semester: semesterNum,
        page_size: 100,
        ordering: 'subjectCode'
      });
      
      // Group marks by subject and aggregate
      const subjectMap = new Map<string, SubjectMark>();
      
      response.results.forEach(record => {
        const key = record.subjectCode;
        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            subject: record.subjectName,
            code: record.subjectCode,
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
        if (record.examType === 'quiz') {
          // Distribute quiz marks to CT slots
          if (subject.ct1 === 0) subject.ct1 = record.marksObtained;
          else if (subject.ct2 === 0) subject.ct2 = record.marksObtained;
          else if (subject.ct3 === 0) subject.ct3 = record.marksObtained;
        } else if (record.examType === 'assignment') {
          subject.assignment = record.marksObtained;
        } else if (record.examType === 'midterm') {
          subject.internalTotal += record.marksObtained;
        } else if (record.examType === 'final') {
          subject.finalExam = record.marksObtained;
        }
      });
      
      // Calculate totals and grades
      const transformedData = Array.from(subjectMap.values()).map(subject => {
        subject.internalTotal = subject.ct1 + subject.ct2 + subject.ct3 + subject.assignment + subject.attendance;
        if (subject.finalExam !== null) {
          subject.total = subject.internalTotal + subject.finalExam;
          subject.grade = calculateGrade(subject.total);
          subject.gpa = calculateGPA(subject.total);
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

  const completedSubjects = marksData.filter(s => s.total !== null);
  const cgpa = completedSubjects.length > 0 
    ? (completedSubjects.reduce((sum, s) => sum + (s.gpa || 0), 0) / completedSubjects.length).toFixed(2)
    : '0.00';
  
  const avgPercentage = completedSubjects.length > 0
    ? Math.round(completedSubjects.reduce((sum, s) => sum + (s.total || 0), 0) / completedSubjects.length)
    : 0;

  const highestMark = completedSubjects.length > 0 ? Math.max(...completedSubjects.map(s => s.total || 0)) : 0;
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
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
          transition={{ delay: 0.2 }}
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
          transition={{ delay: 0.3 }}
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
              {marksData.map((row, i) => (
                <motion.tr
                  key={row.code}
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
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm">{row.ct1}</td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm">{row.ct2}</td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm">{row.ct3}</td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm hidden sm:table-cell">{row.assignment}</td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm hidden sm:table-cell">{row.attendance}</td>
                  <td className="py-1.5 md:py-2 lg:py-3 px-0.5 md:px-1 lg:px-3 text-center text-[10px] md:text-xs lg:text-sm font-medium">{row.internalTotal}</td>
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
              ))}
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
