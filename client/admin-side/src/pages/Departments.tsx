import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Users, GraduationCap, Building2,
  Search, MoreVertical, ChevronRight, UserCheck, RefreshCw,
  Sun, Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';
import departmentService, { Department as APIDepartment, DepartmentHead } from '@/services/departmentService';
import { LoadingState } from '@/components/LoadingState';
import { useAuth } from '@/contexts/AuthContext';

interface Department {
  id: string;
  name: string;
  code: string;
  heads: DepartmentHead[];
  totalStudents: number;
  activeStudents: number;
  faculty: number;
  established: string | null;
  photo_url: string | null;
  autoAttendanceSync: boolean;
}

const shiftShort: Record<string, string> = {
  '1st_shift': '1st',
  '2nd_shift': '2nd',
};

/** Resolve a possibly-relative photo URL against the backend origin. */
const resolvePhotoUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

function StatTile({ label, value, icon: Icon, tint }: { label: string; value: number; icon: typeof Users; tint: string }) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', tint)}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="mt-3 text-[26px] leading-none font-semibold text-foreground tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

// Department thumbnail with a graceful fallback to the code badge when there is
// no photo or the image fails to load.
function DeptThumb({ photoUrl, code }: { photoUrl: string | null; code: string }) {
  const [failed, setFailed] = useState(false);
  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={code}
        onError={() => setFailed(true)}
        className="w-14 h-14 rounded-xl object-cover border border-border shrink-0"
      />
    );
  }
  return (
    <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shrink-0">
      <span className="text-lg font-semibold text-primary-foreground">{code?.slice(0, 3) || '—'}</span>
    </div>
  );
}

// Compact chip for a real assigned Department Head account.
function HeadChip({ head }: { head: DepartmentHead }) {
  const initials = head.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const ShiftIcon = head.shift === '2nd_shift' ? Moon : Sun;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
        {initials || '—'}
      </div>
      <span className="truncate text-sm font-medium text-foreground">{head.name}</span>
      {head.shift && (
        <Badge variant="outline" className="shrink-0 gap-0.5 px-1.5 text-[10px] font-semibold">
          <ShiftIcon className="h-2.5 w-2.5" />
          {shiftShort[head.shift] || head.shift}
        </Badge>
      )}
    </div>
  );
}

export default function Departments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Department Heads only work with their own department.
  const isDeptHead = user?.role === 'department_head';
  const headDepartmentId = isDeptHead ? user?.department || null : null;
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    established: '',
    photo: null as File | null,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentService.getDepartments();

      // Department Heads only see the department they manage.
      const visibleResults = headDepartmentId
        ? response.results.filter((dept: APIDepartment) => String(dept.id) === String(headDepartmentId))
        : response.results;

      const mappedDepts = visibleResults.map((dept: APIDepartment) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code || dept.short_name,
        heads: dept.heads || [],
        totalStudents: dept.total_students,
        activeStudents: dept.active_students,
        faculty: dept.faculty_count,
        established: dept.established_year || null,
        photo_url: resolvePhotoUrl(dept.photo_url),
        autoAttendanceSync: !!dept.autoAttendanceSync,
      }));
      setDepartments(mappedDepts);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load departments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = useMemo(() => {
    const q = search.toLowerCase();
    return departments.filter(
      (d) =>
        q === '' ||
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.heads.some((h) => h.name.toLowerCase().includes(q)),
    );
  }, [departments, search]);

  const totalStudents = departments.reduce((acc, d) => acc + (d.totalStudents || 0), 0);
  const activeStudents = departments.reduce((acc, d) => acc + (d.activeStudents || 0), 0);
  const totalFaculty = departments.reduce((acc, d) => acc + (d.faculty || 0), 0);

  const resetForm = () => setFormData({ name: '', code: '', established: '', photo: null });

  const handleAdd = async () => {
    if (!formData.name || !formData.code) {
      toast({ title: 'Missing details', description: 'Name and department code are required.', variant: 'destructive' });
      return;
    }
    try {
      setIsSaving(true);
      await departmentService.createDepartment({
        name: formData.name,
        code: formData.code,
        established_year: formData.established,
        photo: formData.photo || undefined,
      });
      resetForm();
      setIsAddOpen(false);
      toast({ title: 'Department added', description: `${formData.name} has been added.` });
      fetchDepartments();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add department. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDept) return;
    if (!formData.name || !formData.code) {
      toast({ title: 'Missing details', description: 'Name and department code are required.', variant: 'destructive' });
      return;
    }
    try {
      setIsSaving(true);
      await departmentService.updateDepartment(selectedDept.id, {
        name: formData.name,
        code: formData.code,
        established_year: formData.established,
        photo: formData.photo || undefined,
      });
      setIsEditOpen(false);
      resetForm();
      toast({ title: 'Department updated', description: 'Department details have been saved.' });
      fetchDepartments();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update department. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDept) return;
    try {
      setIsSaving(true);
      await departmentService.deleteDepartment(selectedDept.id);
      setIsDeleteOpen(false);
      toast({ title: 'Department deleted', description: `${selectedDept.name} has been deleted.` });
      fetchDepartments();
    } catch (error: any) {
      // Backend returns a helpful 400 detail when the department still has students/teachers.
      const detail = error?.detail || error?.details;
      toast({
        title: 'Cannot delete department',
        description: detail || 'Failed to delete department. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (dept: Department) => {
    setSelectedDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      established: dept.established || '',
      photo: null,
    });
    setIsEditOpen(true);
  };

  const openDelete = (dept: Department) => {
    setSelectedDept(dept);
    setIsDeleteOpen(true);
  };

  const handleToggleSync = async (dept: Department, enabled: boolean) => {
    // Optimistic update — revert on failure.
    setDepartments(prev => prev.map(d => (d.id === dept.id ? { ...d, autoAttendanceSync: enabled } : d)));
    try {
      await departmentService.setAutoAttendanceSync(dept.id, enabled);
      toast({
        title: enabled ? 'Automatic attendance sync enabled' : 'Automatic attendance sync disabled',
        description: enabled
          ? `Teacher attendance for ${dept.name} will now sync into student profiles automatically.`
          : `${dept.name} is back to the manual attendance workflow.`,
      });
    } catch (error) {
      setDepartments(prev => prev.map(d => (d.id === dept.id ? { ...d, autoAttendanceSync: !enabled } : d)));
      toast({ title: 'Error', description: 'Failed to update the sync setting. Please try again.', variant: 'destructive' });
    }
  };

  const handleDepartmentClick = (dept: Department) => {
    navigate(`/departments/${dept.id}`);
  };

  if (loading) {
    return <LoadingState message="Loading departments..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">
            {isDeptHead ? 'My Department' : 'Departments'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isDeptHead
              ? 'Manage the department you are responsible for.'
              : 'Manage academic departments and their resources.'}
          </p>
        </div>
        {!isDeptHead && (
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            Add department
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Departments" value={departments.length} icon={Building2} tint="bg-primary/10 text-primary" />
        <StatTile label="Total students" value={totalStudents} icon={Users} tint="bg-info/10 text-info" />
        <StatTile label="Active students" value={activeStudents} icon={UserCheck} tint="bg-success/10 text-success" />
        <StatTile label="Faculty members" value={totalFaculty} icon={GraduationCap} tint="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
      </div>

      {/* Search */}
      <div className="surface p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search departments by name, code, or head…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Departments grid */}
      {filteredDepartments.length === 0 ? (
        <div className="surface p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">No departments found</p>
          <p className="text-sm text-muted-foreground">
            {search ? 'Try a different search term.' : 'Add your first department to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDepartments.map((dept, index) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.2 }}
            >
              <div
                className="surface p-5 h-full cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md relative group"
                onClick={() => handleDepartmentClick(dept)}
              >
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Department actions">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(dept); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); openDelete(dept); }}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-start gap-4 mb-5 pr-8">
                  <DeptThumb photoUrl={dept.photo_url} code={dept.code} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground leading-tight truncate">{dept.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Code: {dept.code}</p>
                    {dept.established && (
                      <p className="text-xs text-muted-foreground mt-0.5">Est. {dept.established}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <p className="text-lg font-semibold text-foreground tabular-nums leading-none">{dept.activeStudents || 0}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Active</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <p className="text-lg font-semibold text-foreground tabular-nums leading-none">{dept.totalStudents || 0}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Students</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <p className="text-lg font-semibold text-foreground tabular-nums leading-none">{dept.faculty || 0}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Faculty</p>
                  </div>
                </div>

                {/* Real assigned Department Heads (newest first, max 2) */}
                {dept.heads.length > 0 ? (
                  <div className="pt-3 border-t border-border space-y-1.5">
                    {dept.heads.slice(0, 2).map((h) => <HeadChip key={h.id} head={h} />)}
                    {dept.heads.length > 2 && (
                      <p className="text-[11px] text-muted-foreground">+{dept.heads.length - 2} more</p>
                    )}
                  </div>
                ) : (
                  <div className="pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">No department head assigned</span>
                  </div>
                )}

                {/* Automatic attendance sync toggle */}
                <div
                  className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <RefreshCw className={cn('w-4 h-4 shrink-0', dept.autoAttendanceSync ? 'text-success' : 'text-muted-foreground')} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">Automatic Attendance Sync</p>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                        {dept.autoAttendanceSync
                          ? 'Teacher attendance syncs to student profiles'
                          : 'Manual attendance workflow'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={dept.autoAttendanceSync}
                    onCheckedChange={(checked) => handleToggleSync(dept, checked)}
                    aria-label="Toggle automatic attendance sync"
                  />
                </div>

                <div className="mt-3 flex items-center justify-end text-primary text-sm font-medium">
                  <span>View details</span>
                  <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new department</DialogTitle>
            <DialogDescription>
              Create a new department. Department Heads are assigned automatically when a head
              account selects this department in their profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Department name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g., Computer Technology"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Department code <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g., CT"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Established year</Label>
              <Input
                placeholder="e.g., 2020"
                value={formData.established}
                onChange={(e) => setFormData({ ...formData, established: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department photo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isSaving}>{isSaving ? 'Adding…' : 'Add department'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit department</DialogTitle>
            <DialogDescription>Update the department information below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Department name <span className="text-destructive">*</span></Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Department code <span className="text-destructive">*</span></Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Established year</Label>
              <Input value={formData.established} onChange={(e) => setFormData({ ...formData, established: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Department photo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
              />
              {selectedDept?.photo_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={selectedDept.photo_url} alt="Current" className="w-16 h-16 rounded-lg object-cover border border-border" />
                  <p className="text-xs text-muted-foreground">Current photo — upload a new file to replace it.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedDept?.name}"? This action cannot be undone. Departments
              with enrolled students or assigned teachers can't be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? 'Deleting…' : 'Delete department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
