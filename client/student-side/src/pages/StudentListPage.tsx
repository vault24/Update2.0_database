import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Loader2, AlertCircle, GraduationCap, RefreshCw,
  ChevronLeft, ChevronRight, ArrowUpDown, UserCheck, SlidersHorizontal, ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { StudentAvatar } from '@/components/StudentAvatar';
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
  const [showFilters, setShowFilters] = useState(false);

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
  const activeFilterCount = [selectedDepartment, selectedSemester, selectedShift].filter(v => v !== ALL).length;

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
        initial={false}
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

        {/* Category tabs — full width on mobile for easy thumb reach */}
        <Tabs value={category} onValueChange={(v) => setCategory(v as Category)} className="w-full sm:w-auto">
          <TabsList className="h-11 w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="active" className="gap-2 h-9 px-3 sm:px-4">
              <UserCheck className="w-4 h-4" />
              <span className="truncate">Active</span>
            </TabsTrigger>
            <TabsTrigger value="alumni" className="gap-2 h-9 px-3 sm:px-4">
              <GraduationCap className="w-4 h-4" />
              Alumni
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Search + collapsible filters (mobile-first) */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-card space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Name, roll, reg or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 h-11 rounded-xl"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(v => !v)}
            className="h-11 gap-1.5 shrink-0 rounded-xl px-3"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant={showFilters ? 'secondary' : 'default'} className="px-1.5 h-5">{activeFilterCount}</Badge>
            )}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showFilters && 'rotate-180')} />
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Shifts</SelectItem>
                      <SelectItem value="Morning">1st Shift (Morning)</SelectItem>
                      <SelectItem value="Day">2nd Shift (Day)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Count + active filter chips + sort + reset */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Badge variant="outline" className="bg-primary/5 border-primary/20">
              {loading ? 'Loading…' : `${count.toLocaleString()} ${category === 'active' ? 'active' : 'alumni'}`}
            </Badge>
            {selectedDepartment !== ALL && (
              <Badge variant="secondary" className="max-w-[10rem] truncate">{departments.find(d => d.id === selectedDepartment)?.name}</Badge>
            )}
            {selectedShift !== ALL && <Badge variant="secondary">{shiftLabel(selectedShift)}</Badge>}
            {selectedSemester !== ALL && <Badge variant="secondary">Sem {selectedSemester}</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={toggleRollOrdering} className="gap-1 h-8 text-xs" title="Sort by roll">
              <ArrowUpDown className="w-3.5 h-3.5" />Roll
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 h-8 text-xs">
                <RefreshCw className="w-3.5 h-3.5" />Reset
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Student cards — no horizontal scroll, all key info visible on mobile */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-card border border-border rounded-2xl">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground text-sm">Loading students…</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 gap-3 text-center px-4 bg-card border border-border rounded-2xl">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button size="sm" onClick={() => fetchStudents(page)}>Try Again</Button>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground px-4 bg-card border border-border rounded-2xl">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No {category === 'active' ? 'students' : 'alumni'} found</p>
          <p className="text-sm mt-1">Try changing the search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
          {students.map((student, index) => (
            <motion.button
              key={student.id}
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(index * 0.012, 0.25) }}
              onClick={() => student.id && navigate(`/dashboard/students/${student.id}`)}
              className="w-full text-left bg-card border border-border rounded-xl p-3 shadow-sm hover:border-primary/40 hover:bg-secondary/30 active:scale-[.99] transition flex items-center gap-3"
            >
              <StudentAvatar
                name={student.fullNameEnglish}
                gender={student.gender}
                avatarVariant={student.avatarVariant}
                photoUrl={student.profilePhoto}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold truncate">{student.fullNameEnglish || 'N/A'}</p>
                  <VerifiedBadge roll={student.currentRollNumber} size={14} />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-semibold text-primary/80 tabular-nums">{student.currentRollNumber || '—'}</span>
                  <span> · {deptName(student)}</span>
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-secondary font-medium">
                    {category === 'alumni' && student.lastSemester
                      ? `Sem ${student.lastSemester}`
                      : student.semester ? `Sem ${student.semester}` : '—'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-secondary font-medium">{shiftLabel(student.shift)}</span>
                  {category === 'alumni' ? (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary tabular-nums">
                      CGPA {student.finalCgpa ? Number(student.finalCgpa).toFixed(2) : '—'}
                    </span>
                  ) : (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-md text-[10px] font-medium capitalize',
                      student.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    )}>
                      {student.status || '—'}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && count > PAGE_SIZE && (
        <div className="flex items-center justify-between p-3 bg-card border border-border rounded-2xl">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchStudents(page - 1)} className="gap-1">
            <ChevronLeft className="w-4 h-4" />Prev
          </Button>
          <span className="text-xs text-muted-foreground text-center">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} of {count.toLocaleString()}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchStudents(page + 1)} className="gap-1">
            Next<ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
