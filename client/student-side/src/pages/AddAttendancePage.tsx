import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Calendar, Users, Save, Check, X, Search, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { studentService, type Student } from '@/services/studentService';
import { attendanceService, type AttendanceCreateData } from '@/services/attendanceService';
import { getErrorMessage } from '@/lib/api';

// Student with attendance status
interface StudentWithAttendance extends Student {
  present: boolean;
}

export default function AddAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('1');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // API state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await studentService.getStudents({ 
        status: 'active',
        page_size: 100,
        ordering: 'currentRollNumber'
      });
      
      // Initialize all students as present by default
      const studentsWithAttendance: StudentWithAttendance[] = response.results.map(student => ({
        ...student,
        present: true
      }));
      
      setStudents(studentsWithAttendance);
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

  const toggleAttendance = (studentId: string) => {
    setStudents(prev => 
      prev.map(s => s.id === studentId ? { ...s, present: !s.present } : s)
    );
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, present: true })));
  };

  const markAllAbsent = () => {
    setStudents(prev => prev.map(s => ({ ...s, present: false })));
  };

  const handleSubmit = async () => {
    if (!selectedSubject || !selectedSubjectName) {
      toast.error('Please enter subject code and name');
      return;
    }

    try {
      setSaving(true);
      
      // Prepare bulk attendance records
      const records: AttendanceCreateData[] = students.map(student => ({
        student: student.id,
        subjectCode: selectedSubject,
        subjectName: selectedSubjectName,
        semester: selectedSemester,
        date: selectedDate,
        isPresent: student.present,
      }));

      // Submit bulk attendance
      await attendanceService.bulkMarkAttendance(records);
      
      const presentCount = students.filter(s => s.present).length;
      toast.success(`Attendance saved successfully!`, {
        description: `${presentCount}/${students.length} students marked present.`
      });
      
      // Reset form
      setSelectedSubject('');
      setSelectedSubjectName('');
      
      // Mark all as present again for next entry
      markAllPresent();
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error('Failed to save attendance', {
        description: errorMsg
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullNameEnglish.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.currentRollNumber.includes(searchQuery)
  );

  const presentCount = students.filter(s => s.present).length;
  const absentCount = students.length - presentCount;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Students</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
          </div>
          <Button onClick={fetchStudents} variant="hero">
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
              <UserCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            Add Attendance
          </h1>
          <p className="text-muted-foreground mt-1">Record class attendance for your students</p>
        </div>

        <Button variant="hero" onClick={handleSubmit} disabled={saving || students.length === 0}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Attendance
            </>
          )}
        </Button>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold">{students.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Present</p>
              <p className="text-2xl font-bold text-success">{presentCount}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <X className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Absent</p>
              <p className="text-2xl font-bold text-destructive">{absentCount}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 rounded-xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Semester</Label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Subject Code</Label>
            <Input
              type="text"
              placeholder="e.g., CSE-101"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Subject Name</Label>
            <Input
              type="text"
              placeholder="e.g., Programming"
              value={selectedSubjectName}
              onChange={(e) => setSelectedSubjectName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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

        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={markAllPresent}>
            <Check className="w-4 h-4 mr-1" />
            Mark All Present
          </Button>
          <Button variant="outline" size="sm" onClick={markAllAbsent}>
            <X className="w-4 h-4 mr-1" />
            Mark All Absent
          </Button>
        </div>
      </motion.div>

      {/* Student List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Student Attendance</h3>
        </div>

        <div className="divide-y divide-border">
          {filteredStudents.map((student, index) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {student.currentRollNumber}
                </div>
                <div>
                  <p className="font-medium">{student.fullNameEnglish}</p>
                  <p className="text-sm text-muted-foreground">Roll: {student.currentRollNumber}</p>
                </div>
              </div>

              <button
                onClick={() => toggleAttendance(student.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  student.present
                    ? 'bg-success/10 text-success hover:bg-success/20'
                    : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                }`}
              >
                {student.present ? (
                  <>
                    <Check className="w-4 h-4" />
                    Present
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Absent
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
