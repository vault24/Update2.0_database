import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, BookOpen, User, Calendar } from "lucide-react";
import { useState } from "react";
import { ClassActivity } from "@/data/mockClassActivities";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  activity: ClassActivity;
  isExpanded?: boolean;
}

export function ActivityCard({ activity, isExpanded: initialExpanded = false }: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const statusConfig = {
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    today: { label: 'Today', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    upcoming: { label: 'Upcoming', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  };

  const config = statusConfig[activity.status];

  return (
    <Card 
      className={cn(
        "transition-all duration-200 cursor-pointer hover:shadow-md",
        activity.status === 'today' && "ring-2 ring-primary/50 bg-primary/5"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={config.className}>{config.label}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(activity.date), 'MMM dd, yyyy')}
              </span>
            </div>
            
            <h4 className="font-semibold text-foreground line-clamp-2 mb-1">
              {activity.topicCovered}
            </h4>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {activity.description}
            </p>
          </div>
          
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
            {/* Key Points */}
            <div>
              <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Key Points
              </h5>
              <ul className="space-y-1">
                {activity.keyPoints.map((point, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Teacher */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{activity.teacherName}</span>
            </div>

            {/* Next Class Plan */}
            {activity.nextClassPlan && (
              <div className="bg-accent/50 rounded-lg p-3">
                <h5 className="text-sm font-medium text-foreground mb-2">
                  📚 Next Class Plan
                </h5>
                <p className="text-sm font-medium text-primary mb-2">
                  {activity.nextClassPlan.topic}
                </p>
                <div>
                  <span className="text-xs text-muted-foreground">Preparation:</span>
                  <ul className="mt-1 space-y-1">
                    {activity.nextClassPlan.preparation.map((prep, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-500">○</span>
                        {prep}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
