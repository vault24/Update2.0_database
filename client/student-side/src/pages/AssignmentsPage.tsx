import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  User,
  Download,
  ExternalLink
} from "lucide-react";
import { mockAssignments, Assignment } from "@/data/mockAssignments";
import { AssignmentCard } from "@/components/assignments/AssignmentCard";
import { AssignmentFilters } from "@/components/assignments/AssignmentFilters";
import { format, parseISO } from "date-fns";

export default function AssignmentsPage() {
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Filter assignments
  const filteredAssignments = mockAssignments.filter((assignment) => {
    const matchesSubject = selectedSubject === 'all' || assignment.subjectId === selectedSubject;
    const matchesStatus = selectedStatus === 'all' || assignment.status === selectedStatus;
    return matchesSubject && matchesStatus;
  });

  // Sort: pending/important first, then by deadline
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    if (a.priority === 'important' && b.priority !== 'important') return -1;
    if (b.priority === 'important' && a.priority !== 'important') return 1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // Stats
  const stats = {
    total: mockAssignments.length,
    pending: mockAssignments.filter(a => a.status === 'pending').length,
    submitted: mockAssignments.filter(a => a.status === 'submitted').length,
    graded: mockAssignments.filter(a => a.status === 'graded').length,
    late: mockAssignments.filter(a => a.status === 'late').length,
  };

  const completionRate = Math.round(
    ((stats.submitted + stats.graded) / stats.total) * 100
  );

  return (
    <div className="min-h-screen bg-background max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 md:p-6 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Assignments
              </h1>
              <p className="text-sm text-muted-foreground">
                Track and manage your homework
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <CardContent className="p-3 text-center">
                <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.pending}</p>
                <p className="text-xs text-amber-600">Pending</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.submitted}</p>
                <p className="text-xs text-blue-600">Submitted</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.graded}</p>
                <p className="text-xs text-green-600">Graded</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
              <CardContent className="p-3 text-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.late}</p>
                <p className="text-xs text-red-600">Late</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-medium text-primary">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <AssignmentFilters
              selectedSubject={selectedSubject}
              selectedStatus={selectedStatus}
              onSubjectChange={setSelectedSubject}
              onStatusChange={setSelectedStatus}
            />
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {sortedAssignments.length} assignment(s)
          </p>
        </div>

        {/* Assignments List */}
        <div className="space-y-3">
          {sortedAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onViewDetails={setSelectedAssignment}
            />
          ))}
        </div>

        {sortedAssignments.length === 0 && (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No assignments match your filters.
            </p>
          </Card>
        )}
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
                {/* Subject */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Subject</h4>
                  <p className="text-foreground">{selectedAssignment.subjectName}</p>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-foreground">{selectedAssignment.description}</p>
                </div>

                {/* Dates */}
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

                {/* Teacher */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <User className="h-3 w-3" /> Teacher
                  </h4>
                  <p className="text-foreground">{selectedAssignment.teacherName}</p>
                </div>

                {/* Attachments */}
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

                {/* Grade */}
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

                {/* Submit Button (for pending) */}
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
    </div>
  );
}
