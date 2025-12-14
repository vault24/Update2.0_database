import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Search, Filter, Eye, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { studentService, type Student } from '@/services/studentService';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

export default function StudentListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [selectedSemester]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = {
        page_size: 100,
        ordering: 'currentRollNumber'
      };
      
      if (selectedSemester !== 'all') {
        filters.semester = parseInt(selectedSemester);
      }
      
      const response = await studentService.getStudents(filters);
      setStudents(response.results);
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

  const filteredStudents = students.filter(student =>
    (student.fullNameEnglish || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.currentRollNumber || '').includes(searchQuery) ||
    (student.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalStudents = students.length;

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
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Failed to Load Students</h3>
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
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          Student List
        </h1>
        <p className="text-muted-foreground mt-1">View and manage all students</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 rounded-xl"
        >
          <p className="text-sm text-muted-foreground">Total Students</p>
          <p className="text-2xl font-bold">{totalStudents}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 rounded-xl"
        >
          <p className="text-sm text-muted-foreground">Active Students</p>
          <p className="text-2xl font-bold text-success">
            {students.filter(s => s.status === 'active').length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 rounded-xl"
        >
          <p className="text-sm text-muted-foreground">Departments</p>
          <p className="text-2xl font-bold text-primary">
            {new Set(students.map(s => 
              typeof s.department === 'object' ? s.department?.name : s.department
            ).filter(Boolean)).size}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-4 rounded-xl"
        >
          <p className="text-sm text-muted-foreground">Filtered</p>
          <p className="text-lg font-bold truncate">{filteredStudents.length} students</p>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, roll, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Student Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 font-medium text-sm">Roll</th>
                <th className="text-left p-4 font-medium text-sm">Student</th>
                <th className="text-left p-4 font-medium text-sm hidden md:table-cell">Student ID</th>
                <th className="text-left p-4 font-medium text-sm hidden lg:table-cell">Semester</th>
                <th className="text-left p-4 font-medium text-sm">CGPA</th>
                <th className="text-left p-4 font-medium text-sm hidden md:table-cell">Attendance</th>
                <th className="text-left p-4 font-medium text-sm">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.map((student, index) => (
                <motion.tr
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-secondary/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                      {student.currentRollNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{student.fullNameEnglish || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground md:hidden">{student.email || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{student.email || 'N/A'}</td>
                  <td className="p-4 hidden lg:table-cell">
                    <span className="px-2 py-1 rounded-full text-xs bg-secondary">
                      Semester {student.semester || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${student.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {student.status || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {student.departmentName || (typeof student.department === 'object' ? student.department?.name : student.department) || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (student.id) {
                          navigate(`/dashboard/students/${student.id}`);
                        } else {
                          toast.error('Invalid student ID');
                        }
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>


    </div>
  );
}
