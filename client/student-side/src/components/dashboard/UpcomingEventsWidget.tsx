import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight,
  BookOpen,
  FileText,
  Users
} from 'lucide-react';
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  type: 'class' | 'exam' | 'assignment' | 'meeting';
  date: Date;
  time: string;
  location?: string;
  color: string;
}

// Mock events - in production these would come from API
const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Data Structures Quiz',
    type: 'exam',
    date: new Date(),
    time: '10:00 AM',
    location: 'Room 301',
    color: 'from-red-500 to-orange-500'
  },
  {
    id: '2',
    title: 'Web Dev Assignment Due',
    type: 'assignment',
    date: addDays(new Date(), 1),
    time: '11:59 PM',
    color: 'from-yellow-500 to-amber-500'
  },
  {
    id: '3',
    title: 'Database Lab',
    type: 'class',
    date: addDays(new Date(), 2),
    time: '02:00 PM',
    location: 'Lab 4',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: '4',
    title: 'Project Meeting',
    type: 'meeting',
    date: addDays(new Date(), 3),
    time: '03:30 PM',
    location: 'Online',
    color: 'from-purple-500 to-pink-500'
  },
];

const typeIcons = {
  class: BookOpen,
  exam: FileText,
  assignment: FileText,
  meeting: Users,
};

export function UpcomingEventsWidget() {
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-card rounded-2xl border border-border p-5 shadow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Upcoming Events</h3>
        </div>
        <button className="text-sm text-primary hover:underline flex items-center gap-1">
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {mockEvents.slice(0, 4).map((event, index) => {
          const Icon = typeIcons[event.type];
          
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.01, x: 4 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
                "bg-secondary/30 hover:bg-secondary/50 transition-all cursor-pointer",
                "border border-transparent hover:border-border"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                `bg-gradient-to-br ${event.color}`
              )}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{event.title}</h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className={cn(
                    "font-medium",
                    isToday(event.date) && "text-destructive"
                  )}>
                    {getDateLabel(event.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {event.time}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 hidden sm:flex">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </motion.div>
          );
        })}
      </div>

      {mockEvents.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        </div>
      )}
    </motion.div>
  );
}
