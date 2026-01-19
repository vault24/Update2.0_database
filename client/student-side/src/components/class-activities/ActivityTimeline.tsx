import { ClassActivity } from "@/data/mockClassActivities";
import { ActivityCard } from "./ActivityCard";
import { cn } from "@/lib/utils";

interface ActivityTimelineProps {
  activities: ClassActivity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  // Sort activities by date (newest first for completed, oldest first for upcoming)
  const sortedActivities = [...activities].sort((a, b) => {
    if (a.status === 'today') return -1;
    if (b.status === 'today') return 1;
    if (a.status === 'upcoming' && b.status === 'upcoming') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const todayActivities = sortedActivities.filter(a => a.status === 'today');
  const upcomingActivities = sortedActivities.filter(a => a.status === 'upcoming');
  const completedActivities = sortedActivities.filter(a => a.status === 'completed');

  const renderSection = (title: string, items: ClassActivity[], defaultExpanded: boolean = false) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4 sm:mb-6">
        <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3">
          {title}
        </h3>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 sm:left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-3 sm:space-y-4">
            {items.map((activity, index) => (
              <div key={activity.id} className="relative flex gap-2 sm:gap-4">
                {/* Timeline dot */}
                <div className={cn(
                  "relative z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0",
                  activity.status === 'today' && "bg-primary text-primary-foreground",
                  activity.status === 'upcoming' && "bg-amber-500 text-white",
                  activity.status === 'completed' && "bg-green-500 text-white"
                )}>
                  {index + 1}
                </div>
                
                {/* Activity Card */}
                <div className="flex-1 pb-1 sm:pb-2 min-w-0">
                  <ActivityCard 
                    activity={activity} 
                    isExpanded={defaultExpanded || activity.status === 'today'} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderSection("Today's Class", todayActivities, true)}
      {renderSection("Upcoming Classes", upcomingActivities)}
      {renderSection("Previous Classes", completedActivities)}
    </div>
  );
}
