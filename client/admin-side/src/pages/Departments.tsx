import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit, Trash2, Users, GraduationCap, BookOpen, Building2, 
  Search, MoreVertical, ChevronRight, TrendingUp, Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import departmentService, { Department as APIDepartment } from '@/services/departmentService';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';

interface Department {
  id: string;
  name: string;
  shortName: string;
  head: string;
  totalStudents: number;
  activeStudents: number;
  faculty: number;
  established: string;
  description: string;
  status: 'Active' | 'Inactive';
}

export default function Departments() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    head: '',
    description: '',
    established: '',
  });
  const { toast } = useToast();

  // Fetch departments from API
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentService.getDepartments();
      const mappedDepts = response.results.map((dept: APIDepartment) => ({
        id: dept.id,
        name: dept.name,
        shortName: dept.short_name,
        head: dept.head || '',
        totalStudents: dept.total_students,
        activeStudents: dept.active_students,
        faculty: dept.faculty_count,
        established: dept.established_year,
        description: dept.description,
        status: dept.is_active ? 'Active' as const : 'Inactive' as const,
      }));
      setDepartments(mappedDepts);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load departments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.shortName.toLowerCase().includes(search.toLowerCase()) ||
    d.head.toLowerCase().includes(search.toLowerCase())
  );

  const totalStudents = departments.reduce((acc, d) => acc + (d.totalStudents || 0), 0);
  const totalFaculty = departments.reduce((acc, d) => acc + (d.faculty || 0), 0);
  const activeDepartments = departments.filter(d => d.status === 'Active').length;

  const handleAdd = async () => {
    if (!formData.name || !formData.shortName) {
      toast({ title: "Error", description: "Name and Short Name are required.", variant: "destructive" });
      return;
    }
    
    try {
      await departmentService.createDepartment({
        name: formData.name,
        short_name: formData.shortName,
        head: formData.head || undefined,
        description: formData.description || undefined,
        established_year: formData.established || new Date().getFullYear().toString(),
        is_active: true,
      });
      
      setFormData({ name: '', shortName: '', head: '', description: '', established: '' });
      setIsAddOpen(false);
      toast({ title: "Department Added", description: `${formData.name} has been added successfully.` });
      fetchDepartments();
    } catch (error) {
      console.error('Error adding department:', error);
      toast({ 
        title: "Error", 
        description: "Failed to add department. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedDept) return;
    
    try {
      await departmentService.updateDepartment(selectedDept.id, {
        name: formData.name,
        short_name: formData.shortName,
        head: formData.head || undefined,
        description: formData.description || undefined,
      });
      
      setIsEditOpen(false);
      toast({ title: "Department Updated", description: "Department details have been updated." });
      fetchDepartments();
    } catch (error) {
      console.error('Error updating department:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update department. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedDept) return;
    
    try {
      await departmentService.deleteDepartment(selectedDept.id);
      setIsDeleteOpen(false);
      toast({ title: "Department Deleted", description: `${selectedDept.name} has been deleted.` });
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete department. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const openEdit = (dept: Department) => {
    setSelectedDept(dept);
    setFormData({
      name: dept.name,
      shortName: dept.shortName,
      head: dept.head,
      description: dept.description,
      established: dept.established,
    });
    setIsEditOpen(true);
  };

  const openDelete = (dept: Department) => {
    setSelectedDept(dept);
    setIsDeleteOpen(true);
  };

  const handleDepartmentClick = (dept: Department) => {
    navigate(`/departments/${dept.id}`, { state: { department: dept } });
  };

  if (loading) {
    return <LoadingState message="Loading departments..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Department Management</h1>
          <p className="text-muted-foreground">Manage academic departments and their resources</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{departments.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalStudents || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalFaculty || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Faculty</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{activeDepartments || 0}</p>
                  <p className="text-xs text-muted-foreground">Active Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDepartments.map((dept, index) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="glass-card hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden"
              onClick={() => handleDepartmentClick(dept)}
            >
              <div className="absolute top-0 right-0 p-3 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(dept); }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); openDelete(dept); }}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <span className="text-xl font-bold text-primary-foreground">{dept.shortName}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-foreground mb-1 truncate">{dept.name}</h3>
                    <p className="text-sm text-muted-foreground">Est. {dept.established}</p>
                    <Badge 
                      variant={dept.status === 'Active' ? 'default' : 'secondary'}
                      className="mt-2"
                    >
                      {dept.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Active Students
                    </span>
                    <span className="font-semibold text-foreground">{dept.activeStudents || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Faculty Members
                    </span>
                    <span className="font-semibold text-foreground">{dept.faculty || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Total Students
                    </span>
                    <span className="font-semibold text-foreground">{dept.totalStudents || 0}</span>
                  </div>
                </div>

                {dept.head && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Department Head</p>
                    <p className="text-sm font-medium text-foreground">{dept.head}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end text-primary group-hover:translate-x-1 transition-transform">
                  <span className="text-sm font-medium">View Details</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>
              Create a new department by filling in the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department Name *</Label>
                <Input 
                  placeholder="e.g., Computer Technology" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Short Name *</Label>
                <Input 
                  placeholder="e.g., CT" 
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department Head</Label>
                <Input 
                  placeholder="Enter name" 
                  value={formData.head}
                  onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Established Year</Label>
                <Input 
                  placeholder="e.g., 2020" 
                  value={formData.established}
                  onChange={(e) => setFormData({ ...formData, established: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Brief description of the department..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="gradient-primary text-primary-foreground">Add Department</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update the department information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department Name *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Short Name *</Label>
                <Input 
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department Head</Label>
              <Input 
                value={formData.head}
                onChange={(e) => setFormData({ ...formData, head: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} className="gradient-primary text-primary-foreground">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedDept?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Department</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
