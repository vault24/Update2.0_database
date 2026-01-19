import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, GraduationCap } from "lucide-react";
import { mockSubjects, mockClassActivities } from "@/data/mockClassActivities";
import { ActivityTimeline } from "@/components/class-activities/ActivityTimeline";

export default function ClassActivitiesPage() {
  const [selectedSubject, setSelectedSubject] = useState(mockSubjects[0].id);

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

  return (
    <div className="min-h-screen bg-background max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 md:p-6 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Class Activities
              </h1>
              <p className="text-sm text-muted-foreground">
                Track what was taught and what's coming next
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Subject Selection - Horizontal Scroll on Mobile */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {mockSubjects.map((subject) => {
              const stats = getActivityStats(subject.id);
              const isSelected = selectedSubject === subject.id;
              
              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`flex-shrink-0 p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                    <span className="font-medium text-sm whitespace-nowrap">
                      {subject.code}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {subject.name}
                  </p>
                  {stats.today > 0 && (
                    <Badge variant="default" className="mt-1 text-xs">
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
          <Card className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 ${selectedSubjectInfo.color}`} />
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground truncate">
                      {selectedSubjectInfo.name}
                    </h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <GraduationCap className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{selectedSubjectInfo.teacherName}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-green-600 border-green-300 dark:text-green-400 dark:border-green-700 text-xs">
                    {getActivityStats(selectedSubject).completed} Done
                  </Badge>
                  <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700 text-xs">
                    {getActivityStats(selectedSubject).upcoming} Upcoming
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Timeline */}
        <ActivityTimeline activities={filteredActivities} />

        {filteredActivities.length === 0 && (
          <Card className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No class activities recorded for this subject yet.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
