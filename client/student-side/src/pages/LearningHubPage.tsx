import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  GraduationCap,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Download,
  Activity,
  ListTodo,
  FolderOpen,
  Grid3X3,
  List,
  FolderTree,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { mockSubjects, mockClassActivities } from "@/data/mockClassActivities";
import { ActivityTimeline } from "@/components/class-activities/ActivityTimeline";
import { mockAssignments, Assignment } from "@/data/mockAssignments";
import { AssignmentCard } from "@/components/assignments/AssignmentCard";
import { AssignmentFilters } from "@/components/assignments/AssignmentFilters";
import { MaterialFilters } from "@/components/study-materials/MaterialFilters";
import { DepartmentFolder } from "@/components/study-materials/DepartmentFolder";
import { PDFBookCard } from "@/components/study-materials/PDFBookCard";
import { VideoCard } from "@/components/study-materials/VideoCard";
import { SlideCard } from "@/components/study-materials/SlideCard";
import { mockMaterials, departments, StudyMaterial } from "@/data/mockStudyMaterials";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import TeacherAdminPage from "./TeacherAdminPage";

type ViewMode = 'grid' | 'list' | 'folder';

interface FilterState {
  search: string;
  department: string;
  shift: string;
  semester: string;
  subject: string;
  type: string;
}

export default function LearningHubPage() {
  const { user } = useAuth();

  // If teacher, show the admin panel with learning hub tabs
  if (user?.role === 'teacher') {
    return <TeacherAdminPage defaultTab="activities" showOnlyLearningHub />;
  }
  const [activeTab, setActiveTab] = useState("activities");
  
  // Class Activities State
  const [selectedSubject, setSelectedSubject] = useState(mockSubjects[0].id);
  
  // Assignments State
  const [selectedAssignmentSubject, setSelectedAssignmentSubject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Study Materials State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    department: '',
    shift: '',
    semester: '',
    subject: '',
    type: '',
  });

  // Class Activities Logic
  const filteredActivities = mockClassActivities.filter(
    (activity) => activity.subjectId === selectedSubject
  );
  const selectedSubjectInfo = mockSubjects.find(s => s.id === selectedSubject);

  const getActivityStats = (subjectId: string) => {
    const activities = mockClassActivities.filter(a => a.subjectId === subjectId);
    return {
      completed: activities.filter(a => a.status === 'completed').length,
      today: activities.filter(a => a.status === 'today').length,
      upcoming: activities.filter(a => a.status === 'upcoming').length,
    };
  };

  // Assignments Logic
  const filteredAssignments = mockAssignments.filter((assignment) => {
    const matchesSubject = selectedAssignmentSubject === 'all' || assignment.subjectId === selectedAssignmentSubject;
    const matchesStatus = selectedStatus === 'all' || assignment.status === selectedStatus;
    return matchesSubject && matchesStatus;
  });

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    if (a.priority === 'important' && b.priority !== 'important') return -1;
    if (b.priority === 'important' && a.priority !== 'important') return 1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const assignmentStats = {
    total: mockAssignments.length,
    pending: mockAssignments.filter(a => a.status === 'pending').length,
    submitted: mockAssignments.filter(a => a.status === 'submitted').length,
    graded: mockAssignments.filter(a => a.status === 'graded').length,
    late: mockAssignments.filter(a => a.status === 'late').length,
  };

  const completionRate = Math.round(
    ((assignmentStats.submitted + assignmentStats.graded) / assignmentStats.total) * 100
  );

  // Study Materials Logic
  const filteredMaterials = useMemo(() => {
    return mockMaterials.filter((material) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          material.title.toLowerCase().includes(searchLower) ||
          material.subject.toLowerCase().includes(searchLower) ||
          material.uploadedBy.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.department && filters.department !== 'all' && material.department !== filters.department) return false;
      if (filters.shift && filters.shift !== 'all' && material.shift !== filters.shift) return false;
      if (filters.semester && filters.semester !== 'all' && material.semester !== filters.semester) return false;
      if (filters.subject && filters.subject !== 'all' && material.subject !== filters.subject) return false;
      if (filters.type && filters.type !== 'all' && material.type !== filters.type) return false;
      return true;
    });
  }, [filters]);

  const materialsByDepartment = useMemo(() => {
    return departments.reduce((acc, dept) => {
      const deptMaterials = filteredMaterials.filter(m => m.department === dept);
      if (deptMaterials.length > 0) {
        acc[dept] = deptMaterials;
      }
      return acc;
    }, {} as Record<string, typeof filteredMaterials>);
  }, [filteredMaterials]);

  const tabVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background max-w-full overflow-x-hidden"
    >
      {/* Beautiful Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 border-b border-border">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-accent/10 rounded-full blur-2xl" />
        
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl gradient-primary shadow-glow">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                  Learning Hub
                  <Badge variant="secondary" className="text-xs font-normal">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Activities, Assignments & Study Materials in one place
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-card/60 backdrop-blur-sm border-primary/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{mockClassActivities.length}</p>
                    <p className="text-xs text-muted-foreground">Activities</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm border-warning/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{assignmentStats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm border-success/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm border-accent/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <BookOpen className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{mockMaterials.length}</p>
                    <p className="text-xs text-muted-foreground">Materials</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full md:w-auto grid grid-cols-3 gap-1 bg-muted/50 p-1.5 rounded-xl">
            <TabsTrigger 
              value="activities" 
              className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg transition-all"
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Class Activities</span>
              <span className="sm:hidden">Activities</span>
            </TabsTrigger>
            <TabsTrigger 
              value="assignments" 
              className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg transition-all"
            >
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Assignments</span>
              <span className="sm:hidden">Tasks</span>
              {assignmentStats.pending > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {assignmentStats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="materials" 
              className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg transition-all"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Study Materials</span>
              <span className="sm:hidden">Materials</span>
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            {/* Class Activities Tab */}
            <TabsContent value="activities" className="mt-0">
              <motion.div
                key="activities"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4 max-w-full overflow-x-hidden"
              >
                {/* Subject Selection */}
                <ScrollArea className="w-full -mx-1 px-1">
                  <div className="flex gap-2 pb-2">
                    {mockSubjects.map((subject) => {
                      const stats = getActivityStats(subject.id);
                      const isSelected = selectedSubject === subject.id;
                      
                      return (
                        <button
                          key={subject.id}
                          onClick={() => setSelectedSubject(subject.id)}
                          className={`flex-shrink-0 p-2 sm:p-3 rounded-xl border-2 transition-all min-w-[80px] sm:min-w-0 ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-primary/50 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${subject.color}`} />
                            <span className="font-medium text-xs sm:text-sm whitespace-nowrap">
                              {subject.code}
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap truncate max-w-[70px] sm:max-w-none">
                            {subject.name}
                          </p>
                          {stats.today > 0 && (
                            <Badge variant="default" className="mt-1 text-[10px] sm:text-xs px-1.5">
                              Today
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Selected Subject Info */}
                {selectedSubjectInfo && (
                  <Card className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-primary/20">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 ${selectedSubjectInfo.color}`} />
                          <div className="min-w-0 flex-1">
                            <h2 className="font-semibold text-sm sm:text-base text-foreground truncate">
                              {selectedSubjectInfo.name}
                            </h2>
                            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                              <GraduationCap className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{selectedSubjectInfo.teacherName}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-green-600 border-green-300 dark:text-green-400 dark:border-green-700 text-[10px] sm:text-xs">
                            {getActivityStats(selectedSubject).completed} Done
                          </Badge>
                          <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700 text-[10px] sm:text-xs">
                            {getActivityStats(selectedSubject).upcoming} Upcoming
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Activity Timeline */}
                <div className="max-w-full overflow-x-hidden">
                  <ActivityTimeline activities={filteredActivities} />
                </div>

                {filteredActivities.length === 0 && (
                  <Card className="p-6 sm:p-8 text-center border-dashed">
                    <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground">
                      No class activities recorded for this subject yet.
                    </p>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="mt-0">
              <motion.div
                key="assignments"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-3 sm:space-y-4 max-w-full overflow-x-hidden"
              >
                {/* Stats Overview */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                  <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-2 sm:p-3 text-center">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mx-auto mb-0.5 sm:mb-1" />
                      <p className="text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-400">{assignmentStats.pending}</p>
                      <p className="text-[10px] sm:text-xs text-amber-600">Pending</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-2 sm:p-3 text-center">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mx-auto mb-0.5 sm:mb-1" />
                      <p className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{assignmentStats.submitted}</p>
                      <p className="text-[10px] sm:text-xs text-blue-600">Submitted</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                    <CardContent className="p-2 sm:p-3 text-center">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mx-auto mb-0.5 sm:mb-1" />
                      <p className="text-lg sm:text-2xl font-bold text-green-700 dark:text-green-400">{assignmentStats.graded}</p>
                      <p className="text-[10px] sm:text-xs text-green-600">Graded</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                    <CardContent className="p-2 sm:p-3 text-center">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mx-auto mb-0.5 sm:mb-1" />
                      <p className="text-lg sm:text-2xl font-bold text-red-700 dark:text-red-400">{assignmentStats.late}</p>
                      <p className="text-[10px] sm:text-xs text-red-600">Late</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Bar */}
                <Card className="border-primary/20">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                      <span className="text-muted-foreground font-medium">Completion Rate</span>
                      <span className="font-bold text-primary">{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-2 sm:h-3" />
                  </CardContent>
                </Card>

                {/* Filters */}
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <AssignmentFilters
                      selectedSubject={selectedAssignmentSubject}
                      selectedStatus={selectedStatus}
                      onSubjectChange={setSelectedAssignmentSubject}
                      onStatusChange={setSelectedStatus}
                    />
                  </CardContent>
                </Card>

                {/* Results count */}
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{sortedAssignments.length}</span> assignment(s)
                  </p>
                </div>

                {/* Assignments List */}
                <div className="space-y-2 sm:space-y-3">
                  {sortedAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onViewDetails={setSelectedAssignment}
                    />
                  ))}
                </div>

                {sortedAssignments.length === 0 && (
                  <Card className="p-6 sm:p-8 text-center border-dashed">
                    <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground">
                      No assignments match your filters.
                    </p>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            {/* Study Materials Tab */}
            <TabsContent value="materials" className="mt-0">
              <motion.div
                key="materials"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                {/* View Mode Toggle */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{filteredMaterials.length}</span> materials
                  </p>
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                    <TabsList className="grid grid-cols-3 w-fit h-9">
                      <TabsTrigger value="grid" className="gap-1.5 px-3">
                        <Grid3X3 className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">Grid</span>
                      </TabsTrigger>
                      <TabsTrigger value="list" className="gap-1.5 px-3">
                        <List className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">List</span>
                      </TabsTrigger>
                      <TabsTrigger value="folder" className="gap-1.5 px-3">
                        <FolderTree className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">Folders</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Filters */}
                <MaterialFilters filters={filters} onFilterChange={setFilters} />

                {/* Sorted & Grouped Content */}
                {(() => {
                  // Sort materials by type: PDF/Ebook first, then Videos, then Slides
                  const typeOrder = { pdf: 1, ebook: 2, video: 3, slide: 4 };
                  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
                    return typeOrder[a.type] - typeOrder[b.type];
                  });

                  // Group by type
                  const pdfEbooks = sortedMaterials.filter(m => m.type === 'pdf' || m.type === 'ebook');
                  const videos = sortedMaterials.filter(m => m.type === 'video');
                  const slides = sortedMaterials.filter(m => m.type === 'slide');

                  const renderMaterialCard = (material: StudyMaterial, idx: number) => {
                    switch (material.type) {
                      case 'pdf':
                      case 'ebook':
                        return <PDFBookCard key={material.id} material={material} index={idx} />;
                      case 'video':
                        return <VideoCard key={material.id} material={material} index={idx} />;
                      case 'slide':
                        return <SlideCard key={material.id} material={material} index={idx} />;
                      default:
                        return <PDFBookCard key={material.id} material={material} index={idx} />;
                    }
                  };

                  if (viewMode === 'folder') {
                    return (
                      <div className="space-y-4">
                        {Object.keys(materialsByDepartment).length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            No materials found matching your filters
                          </div>
                        ) : (
                          Object.entries(materialsByDepartment).map(([dept, materials], idx) => (
                            <DepartmentFolder
                              key={dept}
                              department={dept}
                              materials={materials}
                              defaultOpen={idx === 0}
                            />
                          ))
                        )}
                      </div>
                    );
                  }

                  if (sortedMaterials.length === 0) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        No materials found matching your filters
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {/* PDF & E-Books Section */}
                      {pdfEbooks.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-red-500" />
                            </div>
                            <h3 className="font-semibold">PDF & E-Books</h3>
                            <Badge variant="secondary" className="text-xs">{pdfEbooks.length}</Badge>
                          </div>
                          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                            {pdfEbooks.map((material, idx) => renderMaterialCard(material, idx))}
                          </div>
                        </div>
                      )}

                      {/* Videos Section */}
                      {videos.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                              <Activity className="w-4 h-4 text-purple-500" />
                            </div>
                            <h3 className="font-semibold">Video Lectures</h3>
                            <Badge variant="secondary" className="text-xs">{videos.length}</Badge>
                          </div>
                          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                            {videos.map((material, idx) => renderMaterialCard(material, idx))}
                          </div>
                        </div>
                      )}

                      {/* Slides Section */}
                      {slides.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-orange-500" />
                            </div>
                            <h3 className="font-semibold">Presentation Slides</h3>
                            <Badge variant="secondary" className="text-xs">{slides.length}</Badge>
                          </div>
                          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                            {slides.map((material, idx) => renderMaterialCard(material, idx))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>

      {/* Assignment Detail Sheet */}
      <Sheet open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedAssignment && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{selectedAssignment.subjectCode}</Badge>
                  {selectedAssignment.priority === 'important' && (
                    <Badge variant="destructive">Important</Badge>
                  )}
                </div>
                <SheetTitle className="text-left">{selectedAssignment.title}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Subject</h4>
                  <p className="text-foreground">{selectedAssignment.subjectName}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-foreground">{selectedAssignment.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Assigned
                    </h4>
                    <p className="text-foreground">
                      {format(parseISO(selectedAssignment.assignedDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Deadline
                    </h4>
                    <p className="text-foreground">
                      {format(parseISO(selectedAssignment.deadline), 'MMM dd, yyyy hh:mm a')}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <User className="h-3 w-3" /> Teacher
                  </h4>
                  <p className="text-foreground">{selectedAssignment.teacherName}</p>
                </div>

                {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Attachments</h4>
                    <div className="space-y-2">
                      {selectedAssignment.attachments.map((file, index) => (
                        <Button key={index} variant="outline" className="w-full justify-start">
                          <Download className="h-4 w-4 mr-2" />
                          {file}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAssignment.status === 'graded' && (
                  <Card className="bg-green-50 dark:bg-green-950/30">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                        Grade Received
                      </h4>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                        {selectedAssignment.grade}
                      </p>
                      {selectedAssignment.feedback && (
                        <p className="text-sm text-green-600 dark:text-green-500 mt-2">
                          "{selectedAssignment.feedback}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {selectedAssignment.status === 'pending' && (
                  <Button className="w-full" size="lg">
                    Submit Assignment
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
