import { useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  User,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Flag,
  MessageSquare,
  Lightbulb,
  CheckCircle2,
  Clock,
  Eye,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Allegation,
  allegationCategories,
  severityLevels,
  allegationStatuses,
} from "@/data/mockAllegations";

interface AllegationCardProps {
  allegation: Allegation;
}

export function AllegationCard({ allegation }: AllegationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const category = allegationCategories.find((c) => c.value === allegation.category);
  const severity = severityLevels.find((s) => s.value === allegation.severity);
  const status = allegationStatuses.find((s) => s.value === allegation.status);

  const getCategoryIcon = () => {
    switch (allegation.category) {
      case 'academic_dishonesty':
        return BookOpen;
      case 'discipline_violation':
        return Shield;
      case 'moral_misconduct':
        return AlertTriangle;
      default:
        return Flag;
    }
  };

  const CategoryIcon = getCategoryIcon();

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${
      allegation.isEscalated ? 'border-destructive/50 bg-destructive/5' : ''
    }`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="space-y-3">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {allegation.isEscalated && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      Escalated
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1">
                    <CategoryIcon className="w-3 h-3" />
                    {category?.label}
                  </Badge>
                  <Badge className={`${severity?.color} text-white text-xs`}>
                    {severity?.label}
                  </Badge>
                </div>
                <Badge variant="secondary" className={`${status?.color} text-white text-xs shrink-0`}>
                  {status?.label}
                </Badge>
              </div>

              {/* Student Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{allegation.studentName}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {allegation.studentRoll} • {allegation.departmentName}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Sem {allegation.semester} • {allegation.shift} Shift
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(allegation.incidentDate), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(allegation.reportedAt), 'h:mm a')}
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator />
          <CardContent className="p-4 space-y-4 bg-muted/30">
            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Eye className="w-4 h-4 text-muted-foreground" />
                Incident Description
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                {allegation.description}
              </p>
            </div>

            {/* Teacher Advice */}
            <div className="space-y-2">
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
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Suggested Corrective Action
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {allegation.suggestedAction}
                </p>
              </div>
            )}

            {/* Action Taken */}
            {allegation.actionTaken && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
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
              <span>Reported: {format(new Date(allegation.reportedAt), 'MMM d, yyyy h:mm a')}</span>
              {allegation.resolvedAt && (
                <span className="text-green-600">
                  Resolved: {format(new Date(allegation.resolvedAt), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
