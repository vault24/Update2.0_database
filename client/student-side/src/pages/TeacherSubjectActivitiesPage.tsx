import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Users,
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  GraduationCap,
} from "lucide-react";
import { format, parseISO, isToday, isFuture, isPast } from "date-fns";
import { cn } from "@/lib/utils";

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
  nextClassPlan?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  color?: string;
  teacherName?: string;
}

// Mock subjects
const mockSubjects: Subject[] = [
  { id: '1', name: 'Data Structures', code: 'CSE-301', teacherName: 'Dr. Rahman' },
  { id: '2', name: 'Database Management', code: 'CSE-302', teacherName: 'Prof. Ahmed' },
  { id: '3', name: 'Web Development', code: 'CSE-303', teacherName: 'Ms. Fatima' },
  { id: '4', name: 'Computer Networks', code: 'CSE-304', teacherName: 'Mr. Karim' },
  { id: '5', name: 'Operating Systems', code: 'CSE-305', teacherName: 'Dr. Hossain' },
];

// Mock activities
const initialActivities: Activity[] = [
  { id: '1', subjectId: '1', subjectName: 'Data Structures', date: '2024-12-30', topicCovered: 'AVL Trees', description: 'Introduction to self-balancing BST, understanding balance factors and rotation operations', keyPoints: ['Balance factor calculation', 'Single & double rotations', 'Time complexity O(log n)'], teacherName: 'Dr. Rahman', status: 'today', nextClassPlan: 'Red-Black Trees introduction' },
  { id: '2', subjectId: '1', subjectName: 'Data Structures', date: '2024-12-29', topicCovered: 'Binary Search Trees', description: 'Complete BST operations including insertion, deletion, and traversal', keyPoints: ['BST properties', 'In-order traversal', 'Deletion cases'], teacherName: 'Dr. Rahman', status: 'completed' },
  { id: '3', subjectId: '1', subjectName: 'Data Structures', date: '2024-12-28', topicCovered: 'Tree Fundamentals', description: 'Introduction to tree data structure and binary trees', keyPoints: ['Tree terminology', 'Binary tree types', 'Tree representations'], teacherName: 'Dr. Rahman', status: 'completed' },
  { id: '4', subjectId: '1', subjectName: 'Data Structures', date: '2025-01-02', topicCovered: 'Red-Black Trees', description: 'Self-balancing BST with color properties', keyPoints: ['Color properties', 'Insertion rules', 'Balancing'], teacherName: 'Dr. Rahman', status: 'upcoming' },
  { id: '5', subjectId: '2', subjectName: 'Database Management', date: '2024-12-29', topicCovered: 'Normalization', description: '3NF and BCNF concepts with examples', keyPoints: ['Transitive dependency', 'Functional dependency'], teacherName: 'Prof. Ahmed', status: 'completed' },
  { id: '6', subjectId: '3', subjectName: 'Web Development', date: '2024-12-30', topicCovered: 'React Hooks', description: 'useState and useEffect hooks in React', keyPoints: ['State management', 'Side effects', 'Dependency arrays'], teacherName: 'Ms. Fatima', status: 'today' },
];

const subjectColors: Record<string, { bg: string; border: string; text: string; light: string; gradient: string }> = {
  '1': { bg: 'bg-blue-500', border: 'border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', light: 'bg-blue-500/10', gradient: 'from-blue-500 to-blue-600' },
  '2': { bg: 'bg-green-500', border: 'border-green-500/30', text: 'text-green-600 dark:text-green-400', light: 'bg-green-500/10', gradient: 'from-green-500 to-green-600' },
  '3': { bg: 'bg-purple-500', border: 'border-purple-500/30', text: 'text-purple-600 dark:text-purple-400', light: 'bg-purple-500/10', gradient: 'from-purple-500 to-purple-600' },
  '4': { bg: 'bg-orange-500', border: 'border-orange-500/30', text: 'text-orange-600 dark:text-orange-400', light: 'bg-orange-500/10', gradient: 'from-orange-500 to-orange-600' },
  '5': { bg: 'bg-red-500', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400', light: 'bg-red-500/10', gradient: 'from-red-500 to-red-600' },
};

const defaultColor = { bg: 'bg-primary', border: 'border-primary/30', text: 'text-primary', light: 'bg-primary/10', gradient: 'from-primary to-primary' };

export default function TeacherSubjectActivitiesPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("timeline");
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  
  // Dialog states
  const [activityDialog, setActivityDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  
  // Form state
  const [activityForm, setActivityForm] = useState({
    topicCovered: '',
    description: '',
    keyPoints: '',
    date: '',
    status: 'upcoming' as 'completed' | 'today' | 'upcoming',
    nextClassPlan: ''
  });

  const subject = mockSubjects.find(s => s.id === subjectId);
  const colors = subjectColors[subjectId || '1'] || defaultColor;
  
  if (!subject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Subject Not Found</h2>
          <p className="text-muted-foreground mb-4">The subject you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard/learning-hub')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Learning Hub
          </Button>
        </Card>
      </div>
    );
  }

  // Filter activities for this subject
  const subjectActivities = activities.filter(a => a.subjectId === subjectId);
  
  const filteredActivities = subjectActivities.filter(activity => {
    const matchesSearch = activity.topicCovered.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || activity.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Sort activities by date
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    if (a.status === 'today' && b.status !== 'today') return -1;
    if (b.status === 'today' && a.status !== 'today') return 1;
    if (a.status === 'upcoming' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status === 'upcoming') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Stats
  const stats = {
    total: subjectActivities.length,
    completed: subjectActivities.filter(a => a.status === 'completed').length,
    today: subjectActivities.filter(a => a.status === 'today').length,
    upcoming: subjectActivities.filter(a => a.status === 'upcoming').length,
    completionRate: subjectActivities.length > 0 
      ? Math.round((subjectActivities.filter(a => a.status === 'completed').length / subjectActivities.length) * 100) 
      : 0
  };

  const resetForm = () => {
    setActivityForm({
      topicCovered: '',
      description: '',
      keyPoints: '',
      date: '',
      status: 'upcoming',
      nextClassPlan: ''
    });
  };

  const handleAddActivity = () => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      subjectId: subjectId!,
      subjectName: subject.name,
      date: activityForm.date,
      topicCovered: activityForm.topicCovered,
      description: activityForm.description,
      keyPoints: activityForm.keyPoints.split(',').map(k => k.trim()).filter(k => k),
      teacherName: subject.teacherName || 'Current Teacher',
      status: activityForm.status,
      nextClassPlan: activityForm.nextClassPlan
    };
    setActivities([...activities, newActivity]);
    setActivityDialog(false);
    resetForm();
    toast({ title: "Activity Added", description: "Class activity has been added successfully." });
  };

  const handleEditActivity = () => {
    if (!editingActivity) return;
    const updated = activities.map(a => 
      a.id === editingActivity.id 
        ? { 
            ...a, 
            topicCovered: activityForm.topicCovered, 
            description: activityForm.description, 
            keyPoints: activityForm.keyPoints.split(',').map(k => k.trim()).filter(k => k), 
            date: activityForm.date, 
            status: activityForm.status,
            nextClassPlan: activityForm.nextClassPlan
          }
        : a
    );
    setActivities(updated);
    setActivityDialog(false);
    setEditingActivity(null);
    resetForm();
    toast({ title: "Activity Updated", description: "Class activity has been updated." });
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
    setDeleteDialog({ open: false, id: '' });
    toast({ title: "Activity Deleted", description: "Class activity has been removed." });
  };

  const openEditDialog = (activity: Activity) => {
    setEditingActivity(activity);
    setActivityForm({
      topicCovered: activity.topicCovered,
      description: activity.description,
      keyPoints: activity.keyPoints.join(', '),
      date: activity.date,
      status: activity.status,
      nextClassPlan: activity.nextClassPlan || ''
    });
    setActivityDialog(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'today': return <AlertCircle className="h-4 w-4 text-primary" />;
      case 'upcoming': return <Clock className="h-4 w-4 text-amber-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">Completed</Badge>;
      case 'today': return <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">Today</Badge>;
      case 'upcoming': return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">Upcoming</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={cn("bg-gradient-to-r", colors.light, "border-b border-border")}>
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard/learning-hub')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className={cn("p-3 rounded-xl", colors.bg, "text-white shadow-lg")}>
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                {subject.name}
                <Badge variant="outline" className="text-xs">{subject.code}</Badge>
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {subject.teacherName}
              </p>
            </div>
            <Button onClick={() => { resetForm(); setEditingActivity(null); setActivityDialog(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Activity</span>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3 bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", colors.light)}>
                  <BookOpen className={cn("h-4 w-4", colors.text)} />
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">Done</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <AlertCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{stats.today}</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.upcoming}</p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 bg-card/80 backdrop-blur-sm col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold">{stats.completionRate}%</p>
                  <Progress value={stats.completionRate} className="h-1 mt-1" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="timeline" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>

            {/* Search & Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-0">
            <div className="space-y-4">
              {/* Today's Class Highlight */}
              {sortedActivities.filter(a => a.status === 'today').length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Today's Class
                  </h3>
                  {sortedActivities.filter(a => a.status === 'today').map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="border-primary/30 bg-primary/5 overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">{activity.topicCovered}</h3>
                                {getStatusBadge(activity.status)}
                              </div>
                              <p className="text-muted-foreground mb-3">{activity.description}</p>
                              
                              {/* Key Points */}
                              <div className="mb-3">
                                <h4 className="text-sm font-medium mb-2">Key Points:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {activity.keyPoints.map((point, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {point}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {activity.nextClassPlan && (
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                  <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Next Class Plan
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">{activity.nextClassPlan}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" onClick={() => openEditDialog(activity)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialog({ open: true, id: activity.id })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Upcoming Classes */}
              {sortedActivities.filter(a => a.status === 'upcoming').length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Upcoming Classes
                  </h3>
                  <div className="space-y-3">
                    {sortedActivities.filter(a => a.status === 'upcoming').map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            expandedActivity === activity.id && "ring-2 ring-primary/20"
                          )}
                          onClick={() => setExpandedActivity(expandedActivity === activity.id ? null : activity.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                {getStatusIcon(activity.status)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{activity.topicCovered}</h4>
                                    {getStatusBadge(activity.status)}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{activity.description}</p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(parseISO(activity.date), 'MMM dd, yyyy')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <FileText className="h-3 w-3" />
                                      {activity.keyPoints.length} key points
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(activity)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteDialog({ open: true, id: activity.id })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {expandedActivity === activity.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>

                            <AnimatePresence>
                              {expandedActivity === activity.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-4 pt-4 border-t border-border"
                                >
                                  <div className="space-y-3">
                                    <div>
                                      <h5 className="text-sm font-medium mb-2">Key Points</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {activity.keyPoints.map((point, idx) => (
                                          <Badge key={idx} variant="secondary">{point}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Classes */}
              {sortedActivities.filter(a => a.status === 'completed').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Completed Classes
                  </h3>
                  <div className="space-y-3">
                    {sortedActivities.filter(a => a.status === 'completed').map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md opacity-80 hover:opacity-100",
                            expandedActivity === activity.id && "ring-2 ring-primary/20 opacity-100"
                          )}
                          onClick={() => setExpandedActivity(expandedActivity === activity.id ? null : activity.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                {getStatusIcon(activity.status)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{activity.topicCovered}</h4>
                                    {getStatusBadge(activity.status)}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{activity.description}</p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(parseISO(activity.date), 'MMM dd, yyyy')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(activity)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteDialog({ open: true, id: activity.id })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {expandedActivity === activity.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>

                            <AnimatePresence>
                              {expandedActivity === activity.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-4 pt-4 border-t border-border"
                                >
                                  <div className="space-y-3">
                                    <div>
                                      <h5 className="text-sm font-medium mb-2">Key Points Covered</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {activity.keyPoints.map((point, idx) => (
                                          <Badge key={idx} variant="secondary">{point}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {sortedActivities.length === 0 && (
                <Card className="p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-semibold mb-2">No Activities Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterStatus !== 'all' 
                      ? "No activities match your search criteria."
                      : "Start by adding your first class activity."}
                  </p>
                  <Button onClick={() => { resetForm(); setEditingActivity(null); setActivityDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Activity
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="mt-0">
            <Card className="p-6">
              <div className="text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">Calendar View Coming Soon</h3>
                <p>View your activities in a calendar format.</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Activity Dialog */}
      <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Edit Activity' : 'Add New Activity'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Topic Covered *</Label>
              <Input
                value={activityForm.topicCovered}
                onChange={(e) => setActivityForm(prev => ({ ...prev, topicCovered: e.target.value }))}
                placeholder="e.g., AVL Trees Introduction"
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={activityForm.description}
                onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what was covered"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Key Points (comma separated) *</Label>
              <Input
                value={activityForm.keyPoints}
                onChange={(e) => setActivityForm(prev => ({ ...prev, keyPoints: e.target.value }))}
                placeholder="Point 1, Point 2, Point 3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={activityForm.date}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select 
                  value={activityForm.status} 
                  onValueChange={(v) => setActivityForm(prev => ({ ...prev, status: v as 'completed' | 'today' | 'upcoming' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Next Class Plan (optional)</Label>
              <Input
                value={activityForm.nextClassPlan}
                onChange={(e) => setActivityForm(prev => ({ ...prev, nextClassPlan: e.target.value }))}
                placeholder="What will be covered next?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityDialog(false)}>Cancel</Button>
            <Button 
              onClick={editingActivity ? handleEditActivity : handleAddActivity}
              disabled={!activityForm.topicCovered || !activityForm.description || !activityForm.date}
            >
              {editingActivity ? 'Update' : 'Add'} Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: deleteDialog.id })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this activity? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: '' })}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleDeleteActivity(deleteDialog.id)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
