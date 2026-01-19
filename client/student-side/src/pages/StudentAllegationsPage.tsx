import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  MessageSquare,
  Calendar,
  Eye,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  mockAllegations,
  allegationCategories,
  severityLevels,
  allegationStatuses,
  Allegation,
  SeverityLevel,
} from "@/data/mockAllegations";
import { cn } from "@/lib/utils";

// Get severity color classes for profile sync
const getSeverityStyles = (severity: SeverityLevel) => {
  switch (severity) {
    case 'minor':
      return {
        border: 'border-yellow-500',
        bg: 'bg-yellow-500/10',
        ring: 'ring-yellow-500/30',
        text: 'text-yellow-600 dark:text-yellow-400',
        gradient: 'from-yellow-500/20 to-yellow-500/5',
      };
    case 'moderate':
      return {
        border: 'border-orange-500',
        bg: 'bg-orange-500/10',
        ring: 'ring-orange-500/30',
        text: 'text-orange-600 dark:text-orange-400',
        gradient: 'from-orange-500/20 to-orange-500/5',
      };
    case 'serious':
      return {
        border: 'border-destructive',
        bg: 'bg-destructive/10',
        ring: 'ring-destructive/30',
        text: 'text-destructive',
        gradient: 'from-destructive/20 to-destructive/5',
      };
    default:
      return {
        border: 'border-muted',
        bg: 'bg-muted/10',
        ring: 'ring-muted/30',
        text: 'text-muted-foreground',
        gradient: 'from-muted/20 to-muted/5',
      };
  }
};

// Student Allegation Card with severity-synced profile
function StudentAllegationCard({ allegation }: { allegation: Allegation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const category = allegationCategories.find((c) => c.value === allegation.category);
  const severity = severityLevels.find((s) => s.value === allegation.severity);
  const status = allegationStatuses.find((s) => s.value === allegation.status);
  const styles = getSeverityStyles(allegation.severity);

  const getStatusProgress = () => {
    switch (allegation.status) {
      case 'reported': return 25;
      case 'under_review': return 50;
      case 'action_taken': return 75;
      case 'resolved': return 100;
      default: return 0;
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      styles.border,
      "border-l-4"
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className={cn(
            "p-4 cursor-pointer transition-colors",
            `bg-gradient-to-r ${styles.gradient}`
          )}>
            <div className="space-y-3">
              {/* Header with severity-synced profile */}
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center ring-2 shrink-0",
                  styles.bg,
                  styles.ring
                )}>
                  <AlertTriangle className={cn("w-6 h-6", styles.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn(severity?.color, "text-white text-xs")}>
                      {severity?.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {category?.label}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1 text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(allegation.incidentDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary" className={cn(status?.color, "text-white text-xs")}>
                    {status?.label}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{getStatusProgress()}%</span>
                </div>
                <Progress value={getStatusProgress()} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator />
          <CardContent className="p-4 space-y-4 bg-muted/20">
            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Eye className="w-4 h-4 text-muted-foreground" />
                What Happened
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                {allegation.description}
              </p>
            </div>

            {/* Teacher Guidance */}
            <div className={cn(
              "space-y-2 p-3 rounded-lg",
              styles.bg
            )}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Teacher's Guidance
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                {allegation.teacherAdvice}
              </p>
            </div>

            {/* Suggested Action */}
            {allegation.suggestedAction && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Suggested Improvement
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {allegation.suggestedAction}
                </p>
              </div>
            )}

            {/* Action Taken */}
            {allegation.actionTaken && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Action Taken
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {allegation.actionTaken}
                </p>
              </div>
            )}

            {/* Footer Info */}
            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span>Reported by: <strong>{allegation.reportedBy}</strong></span>
              <span>{format(new Date(allegation.reportedAt), 'MMM d, yyyy')}</span>
              {allegation.resolvedAt && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Resolved {format(new Date(allegation.resolvedAt), 'MMM d')}
                </span>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function StudentAllegationsPage() {
  // In a real app, this would be filtered by the logged-in student's ID
  // For demo, we'll show mock data for a specific student
  const studentAllegations = useMemo(() => {
    // Simulating logged-in student's allegations (s1 - Rahim Ahmed who has a serious allegation)
    return mockAllegations.filter((a) => a.studentId === 's1' || a.studentId === 's2');
  }, []);

  const stats = useMemo(() => {
    const total = studentAllegations.length;
    const resolved = studentAllegations.filter((a) => a.status === 'resolved').length;
    const pending = studentAllegations.filter((a) => a.status !== 'resolved').length;
    const mostSevere = studentAllegations.reduce((max, a) => {
      const order = { minor: 1, moderate: 2, serious: 3 };
      return order[a.severity] > order[max] ? a.severity : max;
    }, 'minor' as SeverityLevel);
    return { total, resolved, pending, mostSevere };
  }, [studentAllegations]);

  const headerStyles = getSeverityStyles(stats.mostSevere);

  return (
    <div className="space-y-6 pb-8">
      {/* Header with severity-synced colors */}
      <div className={cn(
        "rounded-2xl p-6 relative overflow-hidden",
        `bg-gradient-to-br ${headerStyles.gradient}`,
        headerStyles.border,
        "border"
      )}>
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className={cn("w-7 h-7", headerStyles.text)} />
                My Behavioral Record
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Review your reports and focus on improvement
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4 mt-4">
            <div className="text-center">
              <p className={cn("text-2xl font-bold", headerStyles.text)}>{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Guidance Note */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Focus on Growth</h4>
              <p className="text-xs text-muted-foreground mt-1">
                These reports are designed to help you grow and improve. Take the guidance seriously 
                and work with your teachers to address any concerns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allegations List */}
      <div className="space-y-3">
        {studentAllegations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500/50 mb-4" />
              <h3 className="font-medium text-lg mb-1">No Reports</h3>
              <p className="text-sm text-muted-foreground">
                You have no behavioral reports. Keep up the good work!
              </p>
            </CardContent>
          </Card>
        ) : (
          studentAllegations.map((allegation) => (
            <StudentAllegationCard key={allegation.id} allegation={allegation} />
          ))
        )}
      </div>
    </div>
  );
}