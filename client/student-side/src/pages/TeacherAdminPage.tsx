import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  ListTodo,
  FolderOpen,
  Video,
  Search,
  Calendar,
  Clock,
  User,
  FileText,
  Upload,
  Download,
  Eye,
  Radio,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  RefreshCw,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { SubjectActivityBox } from "@/components/teacher/SubjectActivityBox";

// Types
interface Activity {
  id: string;
  subjectId: string;
  subjectName: string;
  date: string;
  topicCovered: string;
  description: string;
  keyPoints: string[];
  teacherName: string;
  status: 'completed' | 'today' | 'upcoming';
}

interface Assignment {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  title: string;
  description: string;
  assignedDate: string;
  deadline: string;
  teacherName: string;
  status: 'pending' | 'submitted' | 'late' | 'graded';
  priority: 'normal' | 'important';
}

interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'slide' | 'ebook';
  department: string;
  shift: string;
  semester: string;
  subject: string;
  uploadedBy: string;
  uploadedAt: string;
  fileUrl: string;
  size?: string;
  duration?: string;
}

interface LiveClass {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  date: string;
  startTime: string;
  endTime: string;
  platform: 'zoom' | 'google-meet' | 'youtube' | 'microsoft-teams';
  meetingLink: string;
  meetingId?: string;
  passcode?: string;
  topic: string;
  description?: string;
  isLive: boolean;
  isRecorded: boolean;
  recordingLink?: string;
}

// Mock data import (simulated)
const mockSubjects = [
  { id: '1', name: 'Data Structures', code: 'CSE-301' },
  { id: '2', name: 'Database Management', code: 'CSE-302' },
  { id: '3', name: 'Web Development', code: 'CSE-303' },
  { id: '4', name: 'Computer Networks', code: 'CSE-304' },
  { id: '5', name: 'Operating Systems', code: 'CSE-305' },
];

const departments = ['Computer Technology', 'Civil Technology', 'Electrical Technology', 'Electronics Technology'];
const shifts = ['1st Shift', '2nd Shift'];
const semesters = ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester'];
const platforms = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'google-meet', label: 'Google Meet' },
  { value: 'youtube', label: 'YouTube Live' },
  { value: 'microsoft-teams', label: 'Microsoft Teams' },
];

interface TeacherAdminPageProps {
  defaultTab?: string;
  showOnlyLearningHub?: boolean;
  showOnlyLiveClasses?: boolean;
}

export default function TeacherAdminPage({ 
  defaultTab = "activities", 
  showOnlyLearningHub = false, 
  showOnlyLiveClasses = false 
}: TeacherAdminPageProps) {
  // Mobile-friendly wrapper classes
  const mobileWrapperClass = "max-w-full overflow-x-hidden";
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Activities State
  const [activities, setActivities] = useState<Activity[]>([
    { id: '1', subjectId: '1', subjectName: 'Data Structures', date: '2024-12-30', topicCovered: 'AVL Trees', description: 'Introduction to self-balancing BST', keyPoints: ['Balance factor', 'Rotations'], teacherName: 'Dr. Rahman', status: 'today' },
    { id: '2', subjectId: '2', subjectName: 'Database Management', date: '2024-12-29', topicCovered: 'Normalization', description: '3NF and BCNF concepts', keyPoints: ['Transitive dependency'], teacherName: 'Prof. Ahmed', status: 'completed' },
  ]);
  const [activityDialog, setActivityDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  // Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([
    { id: '1', subjectId: '1', subjectName: 'Data Structures', subjectCode: 'CSE-301', title: 'BST Implementation', description: 'Implement BST in C++', assignedDate: '2024-12-25', deadline: '2024-12-31', teacherName: 'Dr. Rahman', status: 'pending', priority: 'important' },
    { id: '2', subjectId: '3', subjectName: 'Web Development', subjectCode: 'CSE-303', title: 'React Todo App', description: 'Build a todo application', assignedDate: '2024-12-26', deadline: '2025-01-02', teacherName: 'Ms. Fatima', status: 'pending', priority: 'normal' },
  ]);
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  
  // Materials State
  const [materials, setMaterials] = useState<Material[]>([
    { id: '1', title: 'Introduction to C Programming', type: 'pdf', department: 'Computer Technology', shift: '1st Shift', semester: '1st Semester', subject: 'Programming in C', uploadedBy: 'Md. Rahman', uploadedAt: '2024-12-15', fileUrl: '#', size: '2.5 MB' },
    { id: '2', title: 'Data Structures Video Lecture', type: 'video', department: 'Computer Technology', shift: '1st Shift', semester: '3rd Semester', subject: 'Data Structures', uploadedBy: 'Karim Sir', uploadedAt: '2024-12-20', fileUrl: '#', duration: '45 mins' },
  ]);
  const [materialDialog, setMaterialDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  // Live Classes State
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([
    { id: '1', subjectId: '1', subjectName: 'Data Structures', subjectCode: 'CSE-301', teacherName: 'Dr. Rahman', date: '2024-12-30', startTime: '09:00', endTime: '10:30', platform: 'zoom', meetingLink: 'https://zoom.us/j/123', meetingId: '123 456 7890', passcode: 'ds2024', topic: 'AVL Trees Introduction', isLive: true, isRecorded: true },
    { id: '2', subjectId: '2', subjectName: 'Database Management', subjectCode: 'CSE-302', teacherName: 'Prof. Ahmed', date: '2024-12-30', startTime: '11:00', endTime: '12:30', platform: 'google-meet', meetingLink: 'https://meet.google.com/abc', topic: 'Normalization - 3NF', isLive: false, isRecorded: false },
  ]);
  const [liveClassDialog, setLiveClassDialog] = useState(false);
  const [editingLiveClass, setEditingLiveClass] = useState<LiveClass | null>(null);
  
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{open: boolean; type: string; id: string}>({ open: false, type: '', id: '' });

  // Form States
  const [activityForm, setActivityForm] = useState<{subjectId: string; topicCovered: string; description: string; keyPoints: string; date: string; status: 'completed' | 'today' | 'upcoming'}>({
    subjectId: '', topicCovered: '', description: '', keyPoints: '', date: '', status: 'upcoming'
  });
  
  const [assignmentForm, setAssignmentForm] = useState<{subjectId: string; title: string; description: string; deadline: string; priority: 'normal' | 'important'}>({
    subjectId: '', title: '', description: '', deadline: '', priority: 'normal'
  });
  
  const [materialForm, setMaterialForm] = useState<{title: string; type: 'pdf' | 'video' | 'slide' | 'ebook'; department: string; shift: string; semester: string; subject: string; fileUrl: string; size: string}>({
    title: '', type: 'pdf', department: '', shift: '', semester: '', subject: '', fileUrl: '', size: ''
  });
  
  const [liveClassForm, setLiveClassForm] = useState<{subjectId: string; topic: string; description: string; date: string; startTime: string; endTime: string; platform: 'zoom' | 'google-meet' | 'youtube' | 'microsoft-teams'; meetingLink: string; meetingId: string; passcode: string; isRecorded: boolean}>({
    subjectId: '', topic: '', description: '', date: '', startTime: '', endTime: '', platform: 'zoom', meetingLink: '', meetingId: '', passcode: '', isRecorded: false
  });

  // Activity CRUD
  const handleAddActivity = () => {
    const subject = mockSubjects.find(s => s.id === activityForm.subjectId);
    const newActivity: Activity = {
      id: Date.now().toString(),
      subjectId: activityForm.subjectId,
      subjectName: subject?.name || '',
      date: activityForm.date,
      topicCovered: activityForm.topicCovered,
      description: activityForm.description,
      keyPoints: activityForm.keyPoints.split(',').map(k => k.trim()),
      teacherName: 'Current Teacher',
      status: activityForm.status
    };
    setActivities([...activities, newActivity]);
    setActivityDialog(false);
    resetActivityForm();
    toast({ title: "Activity Added", description: "Class activity has been added successfully." });
  };

  const handleEditActivity = () => {
    if (!editingActivity) return;
    const subject = mockSubjects.find(s => s.id === activityForm.subjectId);
    const updated = activities.map(a => 
      a.id === editingActivity.id 
        ? { ...a, subjectId: activityForm.subjectId, subjectName: subject?.name || '', topicCovered: activityForm.topicCovered, description: activityForm.description, keyPoints: activityForm.keyPoints.split(',').map(k => k.trim()), date: activityForm.date, status: activityForm.status }
        : a
    );
    setActivities(updated);
    setActivityDialog(false);
    setEditingActivity(null);
    resetActivityForm();
    toast({ title: "Activity Updated", description: "Class activity has been updated." });
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
    setDeleteConfirmDialog({ open: false, type: '', id: '' });
    toast({ title: "Activity Deleted", description: "Class activity has been removed." });
  };

  const resetActivityForm = () => {
    setActivityForm({ subjectId: '', topicCovered: '', description: '', keyPoints: '', date: '', status: 'upcoming' });
  };

  // Assignment CRUD
  const handleAddAssignment = () => {
    const subject = mockSubjects.find(s => s.id === assignmentForm.subjectId);
    const newAssignment: Assignment = {
      id: Date.now().toString(),
      subjectId: assignmentForm.subjectId,
      subjectName: subject?.name || '',
      subjectCode: subject?.code || '',
      title: assignmentForm.title,
      description: assignmentForm.description,
      assignedDate: format(new Date(), 'yyyy-MM-dd'),
      deadline: assignmentForm.deadline,
      teacherName: 'Current Teacher',
      status: 'pending',
      priority: assignmentForm.priority
    };
    setAssignments([...assignments, newAssignment]);
    setAssignmentDialog(false);
    resetAssignmentForm();
    toast({ title: "Assignment Created", description: "New assignment has been created." });
  };

  const handleEditAssignment = () => {
    if (!editingAssignment) return;
    const subject = mockSubjects.find(s => s.id === assignmentForm.subjectId);
    const updated = assignments.map(a => 
      a.id === editingAssignment.id 
        ? { ...a, subjectId: assignmentForm.subjectId, subjectName: subject?.name || '', subjectCode: subject?.code || '', title: assignmentForm.title, description: assignmentForm.description, deadline: assignmentForm.deadline, priority: assignmentForm.priority }
        : a
    );
    setAssignments(updated);
    setAssignmentDialog(false);
    setEditingAssignment(null);
    resetAssignmentForm();
    toast({ title: "Assignment Updated", description: "Assignment has been updated." });
  };

  const handleDeleteAssignment = (id: string) => {
    setAssignments(assignments.filter(a => a.id !== id));
    setDeleteConfirmDialog({ open: false, type: '', id: '' });
    toast({ title: "Assignment Deleted", description: "Assignment has been removed." });
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({ subjectId: '', title: '', description: '', deadline: '', priority: 'normal' });
  };

  // Material CRUD
  const handleAddMaterial = () => {
    const newMaterial: Material = {
      id: Date.now().toString(),
      title: materialForm.title,
      type: materialForm.type,
      department: materialForm.department,
      shift: materialForm.shift,
      semester: materialForm.semester,
      subject: materialForm.subject,
      uploadedBy: 'Current Teacher',
      uploadedAt: format(new Date(), 'yyyy-MM-dd'),
      fileUrl: materialForm.fileUrl,
      size: materialForm.size
    };
    setMaterials([...materials, newMaterial]);
    setMaterialDialog(false);
    resetMaterialForm();
    toast({ title: "Material Uploaded", description: "Study material has been uploaded." });
  };

  const handleEditMaterial = () => {
    if (!editingMaterial) return;
    const updated = materials.map(m => 
      m.id === editingMaterial.id 
        ? { ...m, title: materialForm.title, type: materialForm.type, department: materialForm.department, shift: materialForm.shift, semester: materialForm.semester, subject: materialForm.subject, fileUrl: materialForm.fileUrl, size: materialForm.size }
        : m
    );
    setMaterials(updated);
    setMaterialDialog(false);
    setEditingMaterial(null);
    resetMaterialForm();
    toast({ title: "Material Updated", description: "Study material has been updated." });
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
    setDeleteConfirmDialog({ open: false, type: '', id: '' });
    toast({ title: "Material Deleted", description: "Study material has been removed." });
  };

  const resetMaterialForm = () => {
    setMaterialForm({ title: '', type: 'pdf', department: '', shift: '', semester: '', subject: '', fileUrl: '', size: '' });
  };

  // Live Class CRUD
  const handleAddLiveClass = () => {
    const subject = mockSubjects.find(s => s.id === liveClassForm.subjectId);
    const newClass: LiveClass = {
      id: Date.now().toString(),
      subjectId: liveClassForm.subjectId,
      subjectName: subject?.name || '',
      subjectCode: subject?.code || '',
      teacherName: 'Current Teacher',
      date: liveClassForm.date,
      startTime: liveClassForm.startTime,
      endTime: liveClassForm.endTime,
      platform: liveClassForm.platform,
      meetingLink: liveClassForm.meetingLink,
      meetingId: liveClassForm.meetingId,
      passcode: liveClassForm.passcode,
      topic: liveClassForm.topic,
      description: liveClassForm.description,
      isLive: false,
      isRecorded: liveClassForm.isRecorded
    };
    setLiveClasses([...liveClasses, newClass]);
    setLiveClassDialog(false);
    resetLiveClassForm();
    toast({ title: "Live Class Scheduled", description: "New live class has been scheduled." });
  };

  const handleEditLiveClass = () => {
    if (!editingLiveClass) return;
    const subject = mockSubjects.find(s => s.id === liveClassForm.subjectId);
    const updated = liveClasses.map(c => 
      c.id === editingLiveClass.id 
        ? { ...c, subjectId: liveClassForm.subjectId, subjectName: subject?.name || '', subjectCode: subject?.code || '', topic: liveClassForm.topic, description: liveClassForm.description, date: liveClassForm.date, startTime: liveClassForm.startTime, endTime: liveClassForm.endTime, platform: liveClassForm.platform, meetingLink: liveClassForm.meetingLink, meetingId: liveClassForm.meetingId, passcode: liveClassForm.passcode, isRecorded: liveClassForm.isRecorded }
        : c
    );
    setLiveClasses(updated);
    setLiveClassDialog(false);
    setEditingLiveClass(null);
    resetLiveClassForm();
    toast({ title: "Live Class Updated", description: "Live class has been updated." });
  };

  const handleDeleteLiveClass = (id: string) => {
    setLiveClasses(liveClasses.filter(c => c.id !== id));
    setDeleteConfirmDialog({ open: false, type: '', id: '' });
    toast({ title: "Live Class Deleted", description: "Live class has been removed." });
  };

  const toggleLiveStatus = (id: string) => {
    setLiveClasses(liveClasses.map(c => 
      c.id === id ? { ...c, isLive: !c.isLive } : c
    ));
    toast({ title: "Status Updated", description: "Live status has been toggled." });
  };

  const resetLiveClassForm = () => {
    setLiveClassForm({ subjectId: '', topic: '', description: '', date: '', startTime: '', endTime: '', platform: 'zoom', meetingLink: '', meetingId: '', passcode: '', isRecorded: false });
  };

  const openEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setActivityForm({
      subjectId: activity.subjectId,
      topicCovered: activity.topicCovered,
      description: activity.description,
      keyPoints: activity.keyPoints.join(', '),
      date: activity.date,
      status: activity.status as 'completed' | 'today' | 'upcoming'
    });
    setActivityDialog(true);
  };

  const openEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      subjectId: assignment.subjectId,
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      priority: assignment.priority as 'normal' | 'important'
    });
    setAssignmentDialog(true);
  };

  const openEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setMaterialForm({
      title: material.title,
      type: material.type as 'pdf' | 'video' | 'slide' | 'ebook',
      department: material.department,
      shift: material.shift,
      semester: material.semester,
      subject: material.subject,
      fileUrl: material.fileUrl,
      size: material.size || ''
    });
    setMaterialDialog(true);
  };

  const openEditLiveClass = (liveClass: LiveClass) => {
    setEditingLiveClass(liveClass);
    setLiveClassForm({
      subjectId: liveClass.subjectId,
      topic: liveClass.topic,
      description: liveClass.description || '',
      date: liveClass.date,
      startTime: liveClass.startTime,
      endTime: liveClass.endTime,
      platform: liveClass.platform as 'zoom' | 'google-meet' | 'youtube' | 'microsoft-teams',
      meetingLink: liveClass.meetingLink,
      meetingId: liveClass.meetingId || '',
      passcode: liveClass.passcode || '',
      isRecorded: liveClass.isRecorded
    });
    setLiveClassDialog(true);
  };

  const confirmDelete = () => {
    switch(deleteConfirmDialog.type) {
      case 'activity': handleDeleteActivity(deleteConfirmDialog.id); break;
      case 'assignment': handleDeleteAssignment(deleteConfirmDialog.id); break;
      case 'material': handleDeleteMaterial(deleteConfirmDialog.id); break;
      case 'liveclass': handleDeleteLiveClass(deleteConfirmDialog.id); break;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed': return <Badge className="bg-success/20 text-success border-success/30">Completed</Badge>;
      case 'today': return <Badge className="bg-primary/20 text-primary border-primary/30">Today</Badge>;
      case 'upcoming': return <Badge className="bg-muted text-muted-foreground">Upcoming</Badge>;
      case 'pending': return <Badge className="bg-warning/20 text-warning border-warning/30">Pending</Badge>;
      case 'submitted': return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Submitted</Badge>;
      case 'graded': return <Badge className="bg-success/20 text-success border-success/30">Graded</Badge>;
      case 'late': return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Late</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    activities: activities.length,
    assignments: assignments.length,
    materials: materials.length,
    liveClasses: liveClasses.length,
    liveNow: liveClasses.filter(c => c.isLive).length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background max-w-full overflow-x-hidden"
    >
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-accent/10 to-success/5 border-b border-border">
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl gradient-primary shadow-glow">
                  <LayoutDashboard className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2">
                    <span className="whitespace-nowrap">
                      {showOnlyLiveClasses ? 'Live Classes' : showOnlyLearningHub ? 'Learning Hub' : 'Teacher Admin'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      <Settings className="h-3 w-3 mr-1" />
                      Management
                    </Badge>
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {showOnlyLiveClasses ? 'Schedule and manage your live classes' : showOnlyLearningHub ? 'Manage activities, assignments & materials' : 'Manage Learning Hub & Live Classes'}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="px-3 py-1.5 gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {stats.activities} Activities
                </Badge>
                <Badge variant="outline" className="px-3 py-1.5 gap-2">
                  <ListTodo className="h-4 w-4 text-warning" />
                  {stats.assignments} Assignments
                </Badge>
                <Badge variant="outline" className="px-3 py-1.5 gap-2">
                  <FolderOpen className="h-4 w-4 text-accent" />
                  {stats.materials} Materials
                </Badge>
                {stats.liveNow > 0 && (
                  <Badge variant="destructive" className="px-3 py-1.5 gap-2 animate-pulse">
                    <Radio className="h-4 w-4" />
                    {stats.liveNow} Live
                  </Badge>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities, assignments, materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/80 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`w-full grid gap-1 bg-muted/50 p-1.5 rounded-xl h-auto ${
            showOnlyLiveClasses ? 'grid-cols-1' : showOnlyLearningHub ? 'grid-cols-3' : 'grid-cols-4'
          }`}>
            {!showOnlyLiveClasses && (
              <>
                <TabsTrigger value="activities" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Activities</span>
                </TabsTrigger>
                <TabsTrigger value="assignments" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg">
                  <ListTodo className="h-4 w-4" />
                  <span className="hidden sm:inline">Assignments</span>
                </TabsTrigger>
                <TabsTrigger value="materials" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg">
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Materials</span>
                </TabsTrigger>
              </>
            )}
            {!showOnlyLearningHub && (
              <TabsTrigger value="live-classes" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg">
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Live Classes</span>
                {stats.liveNow > 0 && (
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <AnimatePresence mode="wait">
            {/* Activities Tab */}
            <TabsContent value="activities" className="mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Class Activities by Subject
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Track and manage activities for each subject separately
                    </p>
                  </div>
                  <Button onClick={() => { resetActivityForm(); setEditingActivity(null); setActivityDialog(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Activity
                  </Button>
                </div>

                {/* Overall Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <Card className="p-3 bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{activities.length}</p>
                        <p className="text-xs text-muted-foreground">Total Activities</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3 bg-green-500/5 border-green-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{activities.filter(a => a.status === 'completed').length}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3 bg-blue-500/5 border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <AlertTriangle className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{activities.filter(a => a.status === 'today').length}</p>
                        <p className="text-xs text-muted-foreground">Today's Classes</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3 bg-amber-500/5 border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Clock className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{activities.filter(a => a.status === 'upcoming').length}</p>
                        <p className="text-xs text-muted-foreground">Upcoming</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Subject Activity Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockSubjects
                    .filter(subject => {
                      if (!searchQuery) return true;
                      const subjectActivities = activities.filter(a => a.subjectId === subject.id);
                      return subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             subject.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             subjectActivities.some(a => 
                               a.topicCovered.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               a.description.toLowerCase().includes(searchQuery.toLowerCase())
                             );
                    })
                    .map((subject) => (
                      <SubjectActivityBox
                        key={subject.id}
                        subject={subject}
                        activities={activities.filter(a => a.subjectId === subject.id)}
                        onEdit={openEditActivity}
                        onDelete={(id) => setDeleteConfirmDialog({ open: true, type: 'activity', id })}
                        onAddActivity={(subjectId) => {
                          resetActivityForm();
                          setActivityForm(prev => ({ ...prev, subjectId }));
                          setEditingActivity(null);
                          setActivityDialog(true);
                        }}
                      />
                    ))
                  }
                </div>

                {mockSubjects.length === 0 && (
                  <Card className="p-8 text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No subjects configured yet.</p>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ListTodo className="h-5 w-5 text-warning" />
                        Assignments
                      </CardTitle>
                      <CardDescription>Create and manage student assignments</CardDescription>
                    </div>
                    <Button onClick={() => { resetAssignmentForm(); setEditingAssignment(null); setAssignmentDialog(true); }} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Assignment
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead className="hidden sm:table-cell">Subject</TableHead>
                            <TableHead className="hidden md:table-cell">Deadline</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignments.filter(a => 
                            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            a.subjectName.toLowerCase().includes(searchQuery.toLowerCase())
                          ).map((assignment) => (
                            <TableRow 
                              key={assignment.id} 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => navigate(`/dashboard/assignment/${assignment.id}`)}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">{assignment.title}</p>
                                  <p className="text-xs text-muted-foreground sm:hidden">{assignment.subjectCode}</p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">{assignment.subjectCode}</TableCell>
                              <TableCell className="hidden md:table-cell">{format(parseISO(assignment.deadline), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                {assignment.priority === 'important' ? (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Important
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Normal</Badge>
                                )}
                              </TableCell>
                              <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-0.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/dashboard/assignment/${assignment.id}`)} title="View Details">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" onClick={() => openEditAssignment(assignment)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex text-destructive hover:text-destructive" onClick={() => setDeleteConfirmDialog({ open: true, type: 'assignment', id: assignment.id })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {assignments.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No assignments yet. Create your first assignment!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Materials Tab */}
            <TabsContent value="materials" className="mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-accent" />
                        Study Materials
                      </CardTitle>
                      <CardDescription>Upload and manage study materials</CardDescription>
                    </div>
                    <Button onClick={() => { resetMaterialForm(); setEditingMaterial(null); setMaterialDialog(true); }} className="gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Material
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[140px]">Title</TableHead>
                            <TableHead className="hidden sm:table-cell">Type</TableHead>
                            <TableHead className="hidden md:table-cell">Department</TableHead>
                            <TableHead className="hidden lg:table-cell">Subject</TableHead>
                            <TableHead className="hidden xl:table-cell">Size</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {materials.filter(m => 
                            m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.subject.toLowerCase().includes(searchQuery.toLowerCase())
                          ).map((material) => (
                            <TableRow key={material.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                                    material.type === 'pdf' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                    material.type === 'video' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                                    material.type === 'slide' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                  }`}>
                                    <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-medium text-sm line-clamp-1">{material.title}</span>
                                    <p className="text-xs text-muted-foreground sm:hidden uppercase">{material.type}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="outline" className="uppercase text-xs">{material.type}</Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm">{material.department}</TableCell>
                              <TableCell className="hidden lg:table-cell text-sm">{material.subject}</TableCell>
                              <TableCell className="hidden xl:table-cell text-sm">{material.size || material.duration || '-'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-0.5 sm:gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" onClick={() => openEditMaterial(material)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex text-destructive hover:text-destructive" onClick={() => setDeleteConfirmDialog({ open: true, type: 'material', id: material.id })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {materials.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No materials yet. Upload your first material!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Live Classes Tab */}
            <TabsContent value="live-classes" className="mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-destructive" />
                        Live Classes
                        {stats.liveNow > 0 && (
                          <Badge variant="destructive" className="animate-pulse gap-1">
                            <Radio className="h-3 w-3" />
                            {stats.liveNow} Live
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>Schedule and manage live classes</CardDescription>
                    </div>
                    <Button onClick={() => { resetLiveClassForm(); setEditingLiveClass(null); setLiveClassDialog(true); }} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Schedule Class
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[120px]">Subject</TableHead>
                            <TableHead className="hidden sm:table-cell">Topic</TableHead>
                            <TableHead className="hidden md:table-cell">Date & Time</TableHead>
                            <TableHead className="hidden lg:table-cell">Platform</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {liveClasses.filter(c => 
                            c.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.subjectName.toLowerCase().includes(searchQuery.toLowerCase())
                          ).map((liveClass) => (
                            <TableRow key={liveClass.id} className={liveClass.isLive ? 'bg-destructive/5' : ''}>
                              <TableCell>
                                <div className="min-w-0">
                                  <p className="font-medium truncate max-w-[120px] sm:max-w-none">{liveClass.subjectName}</p>
                                  <p className="text-xs text-muted-foreground">{liveClass.subjectCode}</p>
                                  <p className="text-xs text-muted-foreground sm:hidden mt-1">{liveClass.topic}</p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">{liveClass.topic}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {format(parseISO(liveClass.date), 'MMM dd')}
                                  <Clock className="h-3 w-3 ml-2" />
                                  {liveClass.startTime}
                                </div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Badge variant="outline" className="capitalize text-xs">{liveClass.platform.replace('-', ' ')}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={liveClass.isLive}
                                    onCheckedChange={() => toggleLiveStatus(liveClass.id)}
                                    className="data-[state=checked]:bg-destructive"
                                  />
                                  {liveClass.isLive && (
                                    <Badge variant="destructive" className="animate-pulse gap-1">
                                      <Radio className="h-3 w-3" />
                                      LIVE
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-0.5 sm:gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditLiveClass(liveClass)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmDialog({ open: true, type: 'liveclass', id: liveClass.id })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {liveClasses.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No live classes scheduled. Schedule your first class!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>

      {/* Activity Dialog */}
      <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Edit Activity' : 'Add Class Activity'}</DialogTitle>
            <DialogDescription>Record what was covered in class today</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={activityForm.subjectId} onValueChange={(v) => setActivityForm({...activityForm, subjectId: v})}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {mockSubjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic Covered</Label>
              <Input value={activityForm.topicCovered} onChange={(e) => setActivityForm({...activityForm, topicCovered: e.target.value})} placeholder="Enter topic" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={activityForm.description} onChange={(e) => setActivityForm({...activityForm, description: e.target.value})} placeholder="Brief description" />
            </div>
            <div className="space-y-2">
              <Label>Key Points (comma separated)</Label>
              <Input value={activityForm.keyPoints} onChange={(e) => setActivityForm({...activityForm, keyPoints: e.target.value})} placeholder="Point 1, Point 2, Point 3" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={activityForm.date} onChange={(e) => setActivityForm({...activityForm, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={activityForm.status} onValueChange={(v: any) => setActivityForm({...activityForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityDialog(false)}>Cancel</Button>
            <Button onClick={editingActivity ? handleEditActivity : handleAddActivity}>
              {editingActivity ? 'Update' : 'Add'} Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialog} onOpenChange={setAssignmentDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
            <DialogDescription>Create a new assignment for students</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={assignmentForm.subjectId} onValueChange={(v) => setAssignmentForm({...assignmentForm, subjectId: v})}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {mockSubjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={assignmentForm.title} onChange={(e) => setAssignmentForm({...assignmentForm, title: e.target.value})} placeholder="Assignment title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={assignmentForm.description} onChange={(e) => setAssignmentForm({...assignmentForm, description: e.target.value})} placeholder="Detailed instructions" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input type="date" value={assignmentForm.deadline} onChange={(e) => setAssignmentForm({...assignmentForm, deadline: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={assignmentForm.priority} onValueChange={(v: any) => setAssignmentForm({...assignmentForm, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentDialog(false)}>Cancel</Button>
            <Button onClick={editingAssignment ? handleEditAssignment : handleAddAssignment}>
              {editingAssignment ? 'Update' : 'Create'} Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Dialog */}
      <Dialog open={materialDialog} onOpenChange={setMaterialDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Edit Material' : 'Upload Study Material'}</DialogTitle>
            <DialogDescription>Upload study materials for students</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={materialForm.title} onChange={(e) => setMaterialForm({...materialForm, title: e.target.value})} placeholder="Material title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={materialForm.type} onValueChange={(v: any) => setMaterialForm({...materialForm, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="ebook">E-Book</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={materialForm.department} onValueChange={(v) => setMaterialForm({...materialForm, department: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select value={materialForm.shift} onValueChange={(v) => setMaterialForm({...materialForm, shift: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {shifts.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={materialForm.semester} onValueChange={(v) => setMaterialForm({...materialForm, semester: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {semesters.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={materialForm.subject} onChange={(e) => setMaterialForm({...materialForm, subject: e.target.value})} placeholder="Subject name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>File URL</Label>
                <Input value={materialForm.fileUrl} onChange={(e) => setMaterialForm({...materialForm, fileUrl: e.target.value})} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Size / Duration</Label>
                <Input value={materialForm.size} onChange={(e) => setMaterialForm({...materialForm, size: e.target.value})} placeholder="2.5 MB or 45 mins" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialDialog(false)}>Cancel</Button>
            <Button onClick={editingMaterial ? handleEditMaterial : handleAddMaterial}>
              {editingMaterial ? 'Update' : 'Upload'} Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Class Dialog */}
      <Dialog open={liveClassDialog} onOpenChange={setLiveClassDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLiveClass ? 'Edit Live Class' : 'Schedule Live Class'}</DialogTitle>
            <DialogDescription>Schedule a new live class session</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={liveClassForm.subjectId} onValueChange={(v) => setLiveClassForm({...liveClassForm, subjectId: v})}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {mockSubjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input value={liveClassForm.topic} onChange={(e) => setLiveClassForm({...liveClassForm, topic: e.target.value})} placeholder="Class topic" />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea value={liveClassForm.description} onChange={(e) => setLiveClassForm({...liveClassForm, description: e.target.value})} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={liveClassForm.date} onChange={(e) => setLiveClassForm({...liveClassForm, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={liveClassForm.startTime} onChange={(e) => setLiveClassForm({...liveClassForm, startTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={liveClassForm.endTime} onChange={(e) => setLiveClassForm({...liveClassForm, endTime: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={liveClassForm.platform} onValueChange={(v: any) => setLiveClassForm({...liveClassForm, platform: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {platforms.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meeting Link</Label>
              <Input value={liveClassForm.meetingLink} onChange={(e) => setLiveClassForm({...liveClassForm, meetingLink: e.target.value})} placeholder="https://zoom.us/j/..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meeting ID (Optional)</Label>
                <Input value={liveClassForm.meetingId} onChange={(e) => setLiveClassForm({...liveClassForm, meetingId: e.target.value})} placeholder="123 456 7890" />
              </div>
              <div className="space-y-2">
                <Label>Passcode (Optional)</Label>
                <Input value={liveClassForm.passcode} onChange={(e) => setLiveClassForm({...liveClassForm, passcode: e.target.value})} placeholder="abc123" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={liveClassForm.isRecorded} onCheckedChange={(v) => setLiveClassForm({...liveClassForm, isRecorded: v})} />
              <Label>Will be recorded</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiveClassDialog(false)}>Cancel</Button>
            <Button onClick={editingLiveClass ? handleEditLiveClass : handleAddLiveClass}>
              {editingLiveClass ? 'Update' : 'Schedule'} Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.open} onOpenChange={(open) => setDeleteConfirmDialog({...deleteConfirmDialog, open})}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmDialog({ open: false, type: '', id: '' })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
