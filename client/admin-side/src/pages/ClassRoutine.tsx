import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, Download, Clock, Plus, Edit, Trash2, Save, X, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  routineService, 
  routineTransformers, 
  type ClassRoutine, 
  type DayOfWeek, 
  type Shift, 
  type RoutineGridData 
} from '@/services/routineService';
import departmentService, { type Department } from '@/services/departmentService';
import { getErrorMessage } from '@/lib/api';

// Departments will be loaded from API
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
const shifts: Shift[] = ['Morning', 'Day'];
const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const timeSlotsByShift: Record<Shift, string[]> = {
  Morning: [
    '8:00-8:45',
    '8:45-9:30',
    '9:30-10:15',
    '10:15-11:00',
    '11:00-11:45',
    '11:45-12:30',
    '12:30-1:15',
  ],
  Day: [
    '1:30-2:15',
    '2:15-3:00',
    '3:00-3:45',
    '3:45-4:30',
    '4:30-5:15',
    '5:15-6:00',
    '6:00-6:45',
  ],
  Evening: [],
};

// Helper function to convert time to slot format
const buildEmptyGrid = (slots: string[]): RoutineGridData => {
  const grid: RoutineGridData = {};
  days.forEach(day => {
    grid[day] = {};
    slots.forEach(slot => {
      grid[day][slot] = null;
    });
  });
  return grid;
};

const subjectColors: Record<string, string> = {
  'Mathematics': 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'Physics': 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  'Physics Lab': 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  'Programming': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'English': 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'Electronics': 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30',
  'Electronics Lab': 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30',
  'Database': 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  'Chemistry': 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  'Chemistry Lab': 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  'Workshop': 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
};

export default function ClassRoutine() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState(4);
  const [shift, setShift] = useState<Shift>('Morning');
  const [session, setSession] = useState('2024-25');
  const [routineGrid, setRoutineGrid] = useState<RoutineGridData>(() => buildEmptyGrid(timeSlotsByShift['Morning']));
  const [routineData, setRoutineData] = useState<ClassRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: DayOfWeek; time: string } | null>(null);
  const [slotForm, setSlotForm] = useState({ subject: '', teacher: '', room: '' });
  const { toast } = useToast();
  const timeSlots = timeSlotsByShift[shift] || [];

  // Load departments once
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoading(true);
        const response = await departmentService.getDepartments({ is_active: true, page_size: 100 });
        setDepartments(response.results);
        if (response.results.length > 0) {
          setDepartment(response.results[0].id);
        }
      } catch (err) {
        const errorMsg = getErrorMessage(err);
        setError(errorMsg);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadDepartments();
  }, [toast]);

  // Fetch routine data when filters change
  useEffect(() => {
    fetchRoutine();
  }, [department, semester, shift]);

  const fetchRoutine = async () => {
    try {
      if (!department) {
        setRoutineGrid(buildEmptyGrid(timeSlots));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setRoutineGrid(buildEmptyGrid(timeSlots));
      
      const response = await routineService.getRoutine({
        department,
        semester,
        shift,
        is_active: true,
        page_size: 100,
        ordering: 'day_of_week,start_time',
      });

      setRoutineData(response.results);
      if (response.results.length > 0) {
        setSession(response.results[0].session || session);
      }

      const gridData = routineTransformers.apiToGrid(response.results, timeSlots);
      setRoutineGrid(gridData);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (day: DayOfWeek, time: string) => {
    if (!isEditMode) return;
    setSelectedSlot({ day, time });
    const existing = routineGrid[day]?.[time];
    if (existing) {
      setSlotForm({ subject: existing.subject, teacher: existing.teacher, room: existing.room });
    } else {
      setSlotForm({ subject: '', teacher: '', room: '' });
    }
    setIsAddDialogOpen(true);
  };

  const handleSaveSlot = () => {
    if (!selectedSlot) return;
    const { day, time } = selectedSlot;
    
    if (!slotForm.subject) {
      // Remove the slot (set to null/break)
      setRoutineGrid(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [time]: null
        }
      }));
    } else {
      setRoutineGrid(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [time]: { subject: slotForm.subject, teacher: slotForm.teacher, room: slotForm.room }
        }
      }));
    }
    
    setIsAddDialogOpen(false);
    toast({ title: "Slot Updated", description: "Class routine has been updated." });
  };

  const handleDeleteSlot = () => {
    if (!selectedSlot) return;
    const { day, time } = selectedSlot;
    setRoutineGrid(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [time]: null
      }
    }));
    setIsAddDialogOpen(false);
    toast({ title: "Slot Removed", description: "The class has been removed from the routine." });
  };

  const handleSaveRoutine = async () => {
    if (!department) {
      toast({
        title: 'Missing department',
        description: 'Select a department before saving changes.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const saveResponse = await routineTransformers.saveRoutineChanges(
        routineGrid,
        routineData,
        { department, semester, shift, session }
      );

      if (!saveResponse.success) {
        throw new Error(saveResponse.message || 'Failed to save routine');
      }

      await fetchRoutine();
      setIsEditMode(false);
      toast({ title: "Routine Saved", description: saveResponse.message || "Class routine has been saved successfully." });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading class routine...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Error Loading Routine</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
              </div>
              <Button onClick={fetchRoutine} className="gradient-primary text-primary-foreground">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Class Routine</h1>
          <p className="text-muted-foreground">Manage department-wise weekly class schedules</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={() => setIsEditMode(false)} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSaveRoutine} 
                className="gradient-primary text-primary-foreground"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditMode(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Routine
              </Button>
              <Button className="gradient-primary text-primary-foreground">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select value={semester.toString()} onValueChange={(val) => setSemester(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(sem => (
                    <SelectItem key={sem} value={sem.toString()}>{sem}{sem === 1 ? 'st' : sem === 2 ? 'nd' : sem === 3 ? 'rd' : 'th'} Semester</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shift</label>
              <Select value={shift} onValueChange={(val) => setShift(val as Shift)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <Calendar className="w-3 h-3 mr-1" />
          {departments.find(d => d.id === department)?.name || 'Select Department'}
        </Badge>
        <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/20">
          {semester}{semester === 1 ? 'st' : semester === 2 ? 'nd' : semester === 3 ? 'rd' : 'th'} Semester
        </Badge>
        <Badge variant="outline" className="bg-secondary/50 border-secondary">
          <Clock className="w-3 h-3 mr-1" />
          {shift} Shift
        </Badge>
        {isEditMode && (
          <Badge className="bg-warning/20 text-warning border-warning/30">
            <Edit className="w-3 h-3 mr-1" />
            Edit Mode - Click on slots to modify
          </Badge>
        )}
      </div>

      {/* Routine Grid */}
      <Card className="glass-card overflow-hidden relative">
        {(loading || saving) && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                {saving ? 'Saving routine changes...' : 'Loading routine...'}
              </p>
            </div>
          </div>
        )}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left text-sm font-semibold text-muted-foreground w-24">
                    Day / Time
                  </th>
                  {timeSlots.map(slot => (
                    <th key={slot} className="p-3 text-center text-sm font-semibold text-muted-foreground">
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day, dayIndex) => (
                  <motion.tr
                    key={day}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: dayIndex * 0.05 }}
                    className="border-b border-border last:border-0"
                  >
                    <td className="p-3 font-medium text-foreground bg-muted/30">
                      {day}
                    </td>
                    {timeSlots.map(slot => {
                      const classInfo = routineGrid[day]?.[slot];
                      if (!classInfo) {
                        return (
                          <td key={slot} className="p-2 text-center">
                            <div 
                              onClick={() => handleSlotClick(day, slot)}
                              className={`h-16 rounded-lg bg-muted/20 border border-dashed border-border/50 flex items-center justify-center ${isEditMode ? 'cursor-pointer hover:bg-muted/40 hover:border-primary/50' : ''}`}
                            >
                              {isEditMode ? (
                                <Plus className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <span className="text-xs text-muted-foreground">Break</span>
                              )}
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={slot} className="p-2">
                          <motion.div
                            whileHover={{ scale: isEditMode ? 1.02 : 1 }}
                            onClick={() => handleSlotClick(day, slot)}
                            className={`h-16 rounded-lg border p-2 transition-all ${subjectColors[classInfo.subject] || 'bg-muted/50'} ${isEditMode ? 'cursor-pointer hover:ring-2 hover:ring-primary/50' : ''}`}
                          >
                            <p className="font-medium text-xs truncate">{classInfo.subject}</p>
                            <p className="text-[10px] opacity-80 truncate">{classInfo.teacher}</p>
                            <p className="text-[10px] opacity-60">{classInfo.room}</p>
                          </motion.div>
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Subject Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(subjectColors).slice(0, 8).map(([subject, color]) => (
              <Badge key={subject} variant="outline" className={`${color} text-xs`}>
                {subject}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Slot Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSlot && routineGrid[selectedSlot.day]?.[selectedSlot.time] ? 'Edit Class Slot' : 'Add Class Slot'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSlot && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{selectedSlot.day}, {selectedSlot.time}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input 
                placeholder="e.g., Mathematics"
                value={slotForm.subject}
                onChange={(e) => setSlotForm({ ...slotForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Teacher Name</Label>
              <Input 
                placeholder="e.g., Mr. Rahman"
                value={slotForm.teacher}
                onChange={(e) => setSlotForm({ ...slotForm, teacher: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Input 
                placeholder="e.g., Room 101 or Lab 1"
                value={slotForm.room}
                onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            {selectedSlot && routineGrid[selectedSlot.day]?.[selectedSlot.time] && (
              <Button variant="destructive" onClick={handleDeleteSlot} className="mr-auto">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSlot} className="gradient-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
