import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Upload,
  FileText,
  ChevronRight
} from "lucide-react";
import { Assignment } from "@/data/mockAssignments";
import { format, parseISO, differenceInHours, differenceInDays, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface AssignmentCardProps {
  assignment: Assignment;
  onViewDetails?: (assignment: Assignment) => void;
}

export function AssignmentCard({ assignment, onViewDetails }: AssignmentCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const deadline = parseISO(assignment.deadline);
      const now = new Date();
      
      if (isPast(deadline)) {
        return "Deadline passed";
      }
      
      const hoursLeft = differenceInHours(deadline, now);
      const daysLeft = differenceInDays(deadline, now);
      
      if (daysLeft > 1) {
        return `${daysLeft} days left`;
      } else if (hoursLeft > 0) {
        return `${hoursLeft} hours left`;
      } else {
        return "Due soon!";
      }
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 60000);
    return () => clearInterval(interval);
  }, [assignment.deadline]);

  const statusConfig = {
    pending: { 
      label: 'Pending', 
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      icon: Clock 
    },
    submitted: { 
      label: 'Submitted', 
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      icon: Upload 
    },
    late: { 
      label: 'Late', 
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      icon: AlertCircle 
    },
    graded: { 
      label: 'Graded', 
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      icon: CheckCircle2 
    },
  };

  const config = statusConfig[assignment.status];
  const StatusIcon = config.icon;
  
  const deadline = parseISO(assignment.deadline);
  const isOverdue = isPast(deadline) && assignment.status === 'pending';
  const isDueSoon = differenceInHours(deadline, new Date()) <= 24 && assignment.status === 'pending';

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md cursor-pointer",
        isOverdue && "border-red-300 bg-red-50/50 dark:bg-red-950/20",
        isDueSoon && !isOverdue && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
      )}
      onClick={() => onViewDetails?.(assignment)}
    >
      <CardContent className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5 sm:mb-2">
              <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                {assignment.subjectCode}
              </Badge>
              <Badge className={cn(config.className, "text-[10px] sm:text-xs px-1.5 sm:px-2")}>
                <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                {config.label}
              </Badge>
              {assignment.priority === 'important' && (
                <Badge variant="destructive" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                  Important
                </Badge>
              )}
            </div>
            
            <h4 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2">
              {assignment.title}
            </h4>
          </div>
          
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 mt-1" />
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
          {assignment.description}
        </p>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
          <span className="flex items-center gap-1">
            <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="truncate max-w-[80px] sm:max-w-none">{assignment.teacherName}</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {format(parseISO(assignment.assignedDate), 'MMM dd')}
          </span>
        </div>

        {/* Deadline & Timer */}
        <div className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 p-2 rounded-lg",
          isOverdue ? "bg-red-100 dark:bg-red-900/30" : 
          isDueSoon ? "bg-amber-100 dark:bg-amber-900/30" : 
          "bg-muted/50"
        )}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Clock className={cn(
              "h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0",
              isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-muted-foreground"
            )} />
            <span className="text-xs sm:text-sm">
              Due: {format(deadline, 'MMM dd, hh:mm a')}
            </span>
          </div>
          
          {assignment.status === 'pending' && (
            <span className={cn(
              "text-xs sm:text-sm font-medium ml-5 sm:ml-0",
              isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-primary"
            )}>
              {timeLeft}
            </span>
          )}
        </div>

        {/* Grade (if graded) */}
        {assignment.status === 'graded' && assignment.grade && (
          <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700 dark:text-green-400">Grade:</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-400">
                {assignment.grade}
              </span>
            </div>
            {assignment.feedback && (
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                "{assignment.feedback}"
              </p>
            )}
          </div>
        )}

        {/* Attachments indicator */}
        {assignment.attachments && assignment.attachments.length > 0 && (
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            {assignment.attachments.length} attachment(s)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
