import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Save, Search, Filter, Loader2, AlertCircle, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { marksService, type MarksRecord, type ExamType } from '@/services/marksService';
import { studentService } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';

interface StudentMarks {
  studentId: string;
  studentName: string;
  roll: string;
  subjectCode: string;
  subjectName: string;
  ct1: number | null;
  ct2: number | null;
  ct3: number | null;
  assignment: number | null;
  attendance: number | null;
  final: number | null;
  internal: number;
  total: number;
  grade: string;
  gpa: number;
  marksRecords: { [key: string]: MarksRecord }; // Map of examType to MarksRecord
}

const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

// Common subjects - these should ideally come from the API
const subjects = [
  { code: 'MATH101', name: 'Mathematics-I' },
  { code: 'PHY101', name: 'Physics-I' },
  { code: 'CHEM101', name: 'Chemistry' },
  { code: 'ENG101', name: 'English' },
  { code: 'CSE101', name: 'Computer Fundamentals' },
  { code: 'EEE101', name: 'Basic Electrical' },
  { code: 'MECH101', name: 'Workshop Practice' },
  { code: 'CIV101', name: 'Engineering Drawing' },
];

export default function ManageMarksPage() {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].code);
  const [selectedSemester, setSelectedSemester] = useState(semesters[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentMarks[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [selectedSemester]);

  useEffect(() => {
    if (allStudents.length > 0) {
      fetchMarks();
    }
  }, [selectedSubject, selectedSemester, allStudents]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const semesterNum = parseInt(selectedSemester);
      const response = await studentService.getStudents({
        semester: semesterNum,
        status: 'active',
        page_size: 1000,
        ordering: 'currentRollNumber'
      });
      
      setAllStudents(response.results);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error('Failed to load students', {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarks = async () => {
    if (allStudents.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const semesterNum = parseInt(selectedSemester);
      
      // Fetch all marks for this semester and subject at once
      let allMarks: MarksRecord[] = [];
      try {
        const marksResponse = await marksService.getMarks({
          subject_code: selectedSubject,
          semester: semesterNum,
          page_size: 1000,
          ordering: 'studentRoll'
        });
        allMarks = marksResponse.results;
      } catch (err) {
        // If no marks found, that's okay - we'll show empty fields
        console.log('No marks found for this subject/semester');
      }
      
      // Group marks by student ID
      const marksByStudent = new Map<string, MarksRecord[]>();
      allMarks.forEach(mark => {
        if (!marksByStudent.has(mark.student)) {
          marksByStudent.set(mark.student, []);
        }
        marksByStudent.get(mark.student)!.push(mark);
      });
      
      // Transform data
      const transformedData: StudentMarks[] = allStudents.map((student) => {
        const studentMarks = marksByStudent.get(student.id) || [];
        
        // Group marks by exam type
        const marksRecords: { [key: string]: MarksRecord } = {};
        studentMarks.forEach(mark => {
          // For quiz marks, we need to handle multiple quizzes
          if (mark.examType === 'quiz') {
            if (!marksRecords['quiz1']) {
              marksRecords['quiz1'] = mark;
            } else if (!marksRecords['quiz2']) {
              marksRecords['quiz2'] = mark;
            } else if (!marksRecords['quiz3']) {
              marksRecords['quiz3'] = mark;
            }
          } else {
            marksRecords[mark.examType] = mark;
          }
        });
        
        // Extract values - for now, we'll use the first quiz mark for CT1
        // In a real system, you'd need to track which quiz is which
        const ct1 = marksRecords['quiz1']?.marksObtained || null;
        const ct2 = marksRecords['quiz2']?.marksObtained || null;
        const ct3 = marksRecords['quiz3']?.marksObtained || null;
        const assignment = marksRecords['assignment']?.marksObtained || null;
        const attendance = marksRecords['practical']?.marksObtained || null;
        const final = marksRecords['final']?.marksObtained || null;
        
        // Calculate internal (CT1, CT2, CT3, Assignment, Attendance)
        const internal = (ct1 || 0) + (ct2 || 0) + (ct3 || 0) + (assignment || 0) + (attendance || 0);
        const total = internal + (final || 0);
        
        return {
          studentId: student.id,
          studentName: student.fullNameEnglish,
          roll: student.currentRollNumber,
          subjectCode: selectedSubject,
          subjectName: subjects.find(s => s.code === selectedSubject)?.name || selectedSubject,
          ct1,
          ct2,
          ct3,
          assignment,
          attendance,
          final,
          internal,
          total,
          grade: calculateGrade(total),
          gpa: calculateGPA(total),
          marksRecords: marksRecords as any
        };
      });
      
      setStudents(transformedData);
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
    if (total >= 75) return 'B';
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

  const handleMarkChange = (studentId: string, field: 'ct1' | 'ct2' | 'ct3' | 'assignment' | 'attendance' | 'final', value: string) => {
    setStudents(prev => prev.map(student => {
      if (student.studentId === studentId) {
        const numValue = value === '' ? null : parseFloat(value);
        const updated = { ...student, [field]: numValue };
        
        // Recalculate internal and total
        const internal = (updated.ct1 || 0) + (updated.ct2 || 0) + (updated.ct3 || 0) + 
                        (updated.assignment || 0) + (updated.attendance || 0);
        const total = internal + (updated.final || 0);
        
        updated.internal = internal;
        updated.total = total;
        updated.grade = calculateGrade(total);
        updated.gpa = calculateGPA(total);
        
        return updated;
      }
      return student;
    }));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const semesterNum = parseInt(selectedSemester);
      const subjectName = subjects.find(s => s.code === selectedSubject)?.name || selectedSubject;
      
      const marksToSave: any[] = [];
      
      // Collect all marks to save
      students.forEach(student => {
        // Save CT1, CT2, CT3 as quiz marks (separate records)
        // Note: The API may need to support multiple quiz records per student/subject
        if (student.ct1 !== null) {
          marksToSave.push({
            student: student.studentId,
            subjectCode: selectedSubject,
            subjectName: subjectName,
            semester: semesterNum,
            examType: 'quiz' as ExamType,
            marksObtained: student.ct1,
            totalMarks: 20, // Default total for CT
            id: (student.marksRecords as any)['quiz1']?.id
          });
        }
        if (student.ct2 !== null) {
          marksToSave.push({
            student: student.studentId,
            subjectCode: selectedSubject,
            subjectName: subjectName,
            semester: semesterNum,
            examType: 'quiz' as ExamType,
            marksObtained: student.ct2,
            totalMarks: 20,
            id: (student.marksRecords as any)['quiz2']?.id
          });
        }
        if (student.ct3 !== null) {
          marksToSave.push({
            student: student.studentId,
            subjectCode: selectedSubject,
            subjectName: subjectName,
            semester: semesterNum,
            examType: 'quiz' as ExamType,
            marksObtained: student.ct3,
            totalMarks: 20,
            id: (student.marksRecords as any)['quiz3']?.id
          });
        }
        if (student.assignment !== null) {
          marksToSave.push({
            student: student.studentId,
            subjectCode: selectedSubject,
            subjectName: subjectName,
            semester: semesterNum,
            examType: 'assignment' as ExamType,
            marksObtained: student.assignment,
            totalMarks: 10,
            id: (student.marksRecords as any)['assignment']?.id
          });
        }
        if (student.attendance !== null) {
          marksToSave.push({
            student: student.studentId,
            subjectCode: selectedSubject,
            subjectName: subjectName,
            semester: semesterNum,
            examType: 'practical' as ExamType,
            marksObtained: student.attendance,
            totalMarks: 10,
            id: (student.marksRecords as any)['practical']?.id
          });
        }
        if (student.final !== null) {
          marksToSave.push({
            student: student.studentId,
            subjectCode: selectedSubject,
            subjectName: subjectName,
            semester: semesterNum,
            examType: 'final' as ExamType,
            marksObtained: student.final,
            totalMarks: 50,
            id: (student.marksRecords as any)['final']?.id
          });
        }
      });
      
      // Save marks (create or update)
      const savePromises = marksToSave.map(mark => {
        if (mark.id) {
          // Update existing
          return marksService.updateMarks(mark.id, {
            marksObtained: mark.marksObtained,
            totalMarks: mark.totalMarks
          });
        } else {
          // Create new
          return marksService.createMarks({
            student: mark.student,
            subjectCode: mark.subjectCode,
            subjectName: mark.subjectName,
            semester: mark.semester,
            examType: mark.examType,
            marksObtained: mark.marksObtained,
            totalMarks: mark.totalMarks
          });
        }
      });
      
      await Promise.all(savePromises);
      
      toast.success('All marks saved successfully!');
      setHasChanges(false);
      // Refresh marks
      await fetchMarks();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error('Failed to save marks', {
        description: errorMsg
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.roll.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGradeColor = (grade: string) => {
    if (grade === 'A+') return 'bg-success text-success-foreground';
    if (grade === 'A') return 'bg-success/80 text-success-foreground';
    if (grade === 'A-') return 'bg-primary text-primary-foreground';
    if (grade === 'B+') return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  // Loading state
  if (loading && students.length === 0) {
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
  if (error && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Failed to Load Marks</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchStudents}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            Manage Marks
          </h1>
          <p className="text-muted-foreground mt-1">Enter and update student marks</p>
        </div>

        <Button 
          variant="hero" 
          onClick={handleSaveAll} 
          disabled={saving || !hasChanges}
          className={!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save All Marks
            </>
          )}
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 rounded-xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Semester</Label>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {semesters.map(semester => {
                  const num = parseInt(semester);
                  const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
                  return (
                    <SelectItem key={semester} value={semester}>{semester}{suffix} Semester</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
                  <SelectItem key={subject.code} value={subject.code}>{subject.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Search Student</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-primary/10 border border-primary/20 rounded-xl p-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              {(() => {
                const num = parseInt(selectedSemester);
                const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
                return `${selectedSemester}${suffix} Semester`;
              })()}
            </span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm">{subjects.find(s => s.code === selectedSubject)?.name}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm">Students: {filteredStudents.length}</span>
          {hasChanges && (
            <>
              <span className="text-muted-foreground">•</span>
              <Badge className="bg-warning/10 text-warning border-warning/30">
                Unsaved Changes
              </Badge>
            </>
          )}
        </div>
      </motion.div>

      {/* Marks Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Internal Assessment & Final Results
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Grade Scale: A+ (90-100), A (85-89), A- (80-84), B+ (75-79), B (70-74), C+ (65-69), C (60-64), D (50-59), F (Below 50)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-secondary/30">
                <th className="text-left p-3 font-semibold text-xs">Student</th>
                <th className="text-center p-3 font-semibold text-xs">CT-1</th>
                <th className="text-center p-3 font-semibold text-xs">CT-2</th>
                <th className="text-center p-3 font-semibold text-xs">CT-3</th>
                <th className="text-center p-3 font-semibold text-xs">Assign</th>
                <th className="text-center p-3 font-semibold text-xs">Attend</th>
                <th className="text-center p-3 font-semibold text-xs bg-primary/10">Int.</th>
                <th className="text-center p-3 font-semibold text-xs bg-primary/10">Final</th>
                <th className="text-center p-3 font-semibold text-xs bg-primary/10">Total</th>
                <th className="text-center p-3 font-semibold text-xs">Grade</th>
                <th className="text-center p-3 font-semibold text-xs">GPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center p-8 text-muted-foreground">
                    {searchQuery ? 'No students found matching your search.' : 'No students found for this semester.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <motion.tr
                    key={student.studentId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-secondary/30 transition-colors"
                  >
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-foreground">{student.studentName}</p>
                        <p className="text-xs text-muted-foreground">{student.roll}</p>
                      </div>
                    </td>
                    <td className="text-center p-3">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={student.ct1 ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'ct1', e.target.value)}
                        className="w-16 mx-auto text-center h-8"
                        placeholder="0"
                      />
                    </td>
                    <td className="text-center p-3">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={student.ct2 ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'ct2', e.target.value)}
                        className="w-16 mx-auto text-center h-8"
                        placeholder="0"
                      />
                    </td>
                    <td className="text-center p-3">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={student.ct3 ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'ct3', e.target.value)}
                        className="w-16 mx-auto text-center h-8"
                        placeholder="0"
                      />
                    </td>
                    <td className="text-center p-3">
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={student.assignment ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'assignment', e.target.value)}
                        className="w-16 mx-auto text-center h-8"
                        placeholder="0"
                      />
                    </td>
                    <td className="text-center p-3">
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={student.attendance ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'attendance', e.target.value)}
                        className="w-16 mx-auto text-center h-8"
                        placeholder="0"
                      />
                    </td>
                    <td className="text-center p-3 bg-primary/5 font-semibold text-primary">
                      {student.internal}
                    </td>
                    <td className="text-center p-3">
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={student.final ?? ''}
                        onChange={(e) => handleMarkChange(student.studentId, 'final', e.target.value)}
                        className="w-16 mx-auto text-center h-8"
                        placeholder="0"
                      />
                    </td>
                    <td className="text-center p-3 bg-primary/5 font-bold text-primary">
                      {student.total}
                    </td>
                    <td className="text-center p-3">
                      {student.grade ? (
                        <Badge className={getGradeColor(student.grade)}>
                          {student.grade}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="text-center p-3">
                      <span className={`font-semibold ${student.gpa >= 3.5 ? 'text-success' : student.gpa >= 3.0 ? 'text-warning' : student.gpa > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {student.gpa > 0 ? student.gpa.toFixed(2) : '-'}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
