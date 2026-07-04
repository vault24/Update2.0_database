import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Search, Eye, Loader2, AlertCircle, GraduationCap, RefreshCw,
  ChevronLeft, ChevronRight, ArrowUpDown, UserCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { studentService, type Student, type StudentFilters } from '@/services/studentService';
import { departmentService, type Department } from '@/services/departmentService';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;
const ALL = 'all';

type Category = 'active' | 'alumni';

const shiftLabel = (shift: string) => {
  if (shift === 'Morning') return '1st Shift';
  if (shift === 'Day') return '2nd Shift';
  return shift || '—';
};

const deptName = (student: Student) =>
  student.departmentName ||
  (typeof student.department === 'object' ? student.department?.name : student.department) ||
  '—';

export default function StudentListPage() {
  const navigate = useNavigate();

  // Category + filters (all server-side)
  const [category, setCategory] = useState<Category>('active');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(ALL);
  const [selectedSemester, setSelectedSemester] = useState(ALL);
  const [selectedShift, setSelectedShift] = useState(ALL);
  const [ordering, setOrdering] = useState('currentRollNumber');

  // Data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    departmentService.getAll().then(setDepartments);
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchStudents = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      setError(null);

      const filters: StudentFilters = {
        page: pageNum,
        page_size: PAGE_SIZE,
        ordering,
        status: category === 'active' ? 'active' : 'graduated',
      };
      if (search) filters.search = search;
      if (selectedDepartment !== ALL) filters.department = selectedDepartment;
      if (selectedSemester !== ALL) filters.semester = parseInt(selectedSemester, 10);
      if (selectedShift !== ALL) filters.shift = selectedShift;

      const response = await studentService.getStudents(filters);
      setStudents(response.results);
      setCount(response.count);
      setPage(pageNum);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [category, search, selectedDepartment, selectedSemester, selectedShift, ordering]);

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const toggleRollOrdering = () => {
    setOrdering(prev => (prev === 'currentRollNumber' ? '-currentRollNumber' : 'currentRollNumber'));
  };

  const resetFilters = () => {
    setSearchInput('');
    setSelectedDepartment(ALL);
    setSelectedSemester(ALL);
    setSelectedShift(ALL);
    setOrdering('currentRollNumber');
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            Student List
          </h1>
          <p className="text-muted-foreground mt-1">Browse active students and alumni</p>
        </div>

        {/* Category tabs */}
        <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
          <TabsList className="h-11">
            <TabsTrigger value="active" className="gap-2 h-9 px-4">
              <UserCheck className="w-4 h-4" />
              Active Students
            </TabsTrigger>
            <TabsTrigger value="alumni" className="gap-2 h-9 px-4">
              <GraduationCap className="w-4 h-4" />
              Alumni
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-2xl p-4 shadow-card"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-[11px] text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Name, roll, registration or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Department</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Departments</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Semester</Label>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Semesters</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Shift</Label>
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Shifts</SelectItem>
                <SelectItem value="Morning">1st Shift (Morning)</SelectItem>
                <SelectItem value="Day">2nd Shift (Day)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-primary/5 border-primary/20">
              {loading ? 'Loading…' : `${count.toLocaleString()} ${category === 'active' ? 'active students' : 'alumni'}`}
            </Badge>
            {selectedDepartment !== ALL && (
              <Badge variant="secondary">{departments.find(d => d.id === selectedDepartment)?.name}</Badge>
            )}
            {selectedShift !== ALL && <Badge variant="secondary">{shiftLabel(selectedShift)}</Badge>}
            {selectedSemester !== ALL && <Badge variant="secondary">Semester {selectedSemester}</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 h-8 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />Reset filters
          </Button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl overflow-hidden shadow-card"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground text-sm">Loading students…</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center px-4">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
            <Button size="sm" onClick={() => fetchStudents(page)}>Try Again</Button>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground px-4">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No {category === 'active' ? 'students' : 'alumni'} found</p>
            <p className="text-sm mt-1">Try changing the search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left p-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <button onClick={toggleRollOrdering} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Roll <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left p-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                  <th className="text-left p-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Department</th>
                  <th className="text-center p-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Semester</th>
                  <th className="text-center p-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Shift</th>
                  <th className="text-center p-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Session</th>
                  <th className="text-center p-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    {category === 'alumni' ? 'CGPA' : 'Status'}
                  </th>
                  <th className="text-right p-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.015, 0.3) }}
                    className="hover:bg-secondary/40 transition-colors cursor-pointer"
                    onClick={() => student.id && navigate(`/dashboard/students/${student.id}`)}
                  >
                    <td className="p-3.5">
                      <span className="inline-flex items-center justify-center min-w-[3.25rem] px-2 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-sm tabular-nums">
                        {student.currentRollNumber || '—'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 overflow-hidden">
                          {student.profilePhoto ? (
                            <img src={student.profilePhoto} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            (student.fullNameEnglish || '?').split(' ').map(n => n[0]).join('').slice(0, 2)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[160px] md:max-w-[240px]">{student.fullNameEnglish || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[160px] md:max-w-[240px]">{student.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 hidden md:table-cell text-muted-foreground">{deptName(student)}</td>
                    <td className="p-3.5 hidden sm:table-cell text-center">
                      <span className="px-2 py-1 rounded-full text-xs bg-secondary font-medium">
                        {category === 'alumni' && student.lastSemester
                          ? `Sem ${student.lastSemester}`
                          : student.semester ? `Sem ${student.semester}` : '—'}
                      </span>
                    </td>
                    <td className="p-3.5 hidden lg:table-cell text-center text-muted-foreground text-xs">
                      {shiftLabel(student.shift)}
                    </td>
                    <td className="p-3.5 hidden lg:table-cell text-center text-muted-foreground text-xs">
                      {student.session || '—'}
                    </td>
                    <td className="p-3.5 hidden sm:table-cell text-center">
                      {category === 'alumni' ? (
                        <span className="font-semibold tabular-nums">
                          {student.finalCgpa ? Number(student.finalCgpa).toFixed(2) : '—'}
                        </span>
                      ) : (
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium capitalize',
                          student.status === 'active'
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {student.status || '—'}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View profile"
                        onClick={() => student.id && navigate(`/dashboard/students/${student.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && count > PAGE_SIZE && (
          <div className="flex items-center justify-between p-3.5 border-t border-border">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchStudents(page - 1)} className="gap-1">
              <ChevronLeft className="w-4 h-4" />Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} of {count.toLocaleString()}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchStudents(page + 1)} className="gap-1">
              Next<ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
