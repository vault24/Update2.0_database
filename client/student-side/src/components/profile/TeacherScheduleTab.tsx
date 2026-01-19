import { motion } from 'framer-motion';
import { 
  Clock, MapPin, Users, Coffee, BookOpen, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';

interface ScheduleSlot {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  subjectCode: string;
  department: string;
  semester: number;
  room: string;
  type: 'class' | 'lab' | 'break';
}

const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

// Mock schedule data
const mockSchedule: Record<DayOfWeek, ScheduleSlot[]> = {
  Sunday: [
    { id: '1', startTime: '09:00', endTime: '10:30', subject: 'Database Systems', subjectCode: 'CSE-401', department: 'CSE', semester: 4, room: '301', type: 'class' },
    { id: '2', startTime: '10:30', endTime: '11:00', subject: 'Break', subjectCode: '', department: '', semester: 0, room: '', type: 'break' },
    { id: '3', startTime: '11:00', endTime: '12:30', subject: 'Software Engineering', subjectCode: 'CSE-501', department: 'CSE', semester: 5, room: '402', type: 'class' },
    { id: '4', startTime: '15:30', endTime: '17:00', subject: 'Computer Networks', subjectCode: 'EEE-501', department: 'EEE', semester: 5, room: '201', type: 'class' },
  ],
  Monday: [
    { id: '5', startTime: '09:00', endTime: '10:30', subject: 'Software Engineering', subjectCode: 'CSE-501', department: 'CSE', semester: 5, room: '402', type: 'class' },
    { id: '6', startTime: '14:00', endTime: '16:00', subject: 'Database Lab', subjectCode: 'CSE-401L', department: 'CSE', semester: 4, room: 'Lab-1', type: 'lab' },
  ],
  Tuesday: [
    { id: '7', startTime: '14:00', endTime: '15:30', subject: 'Web Development', subjectCode: 'CSE-601', department: 'CSE', semester: 6, room: '305', type: 'class' },
  ],
  Wednesday: [
    { id: '8', startTime: '09:00', endTime: '10:30', subject: 'Database Systems', subjectCode: 'CSE-401', department: 'CSE', semester: 4, room: '301', type: 'class' },
    { id: '9', startTime: '11:00', endTime: '12:30', subject: 'Web Development', subjectCode: 'CSE-601', department: 'CSE', semester: 6, room: '305', type: 'class' },
  ],
  Thursday: [
    { id: '10', startTime: '11:00', endTime: '12:30', subject: 'Computer Networks', subjectCode: 'EEE-501', department: 'EEE', semester: 5, room: '201', type: 'class' },
    { id: '11', startTime: '14:00', endTime: '15:30', subject: 'Software Engineering', subjectCode: 'CSE-501', department: 'CSE', semester: 5, room: '402', type: 'class' },
  ],
};

const typeStyles = {
  class: {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    icon: BookOpen,
    iconBg: 'bg-primary',
  },
  lab: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: BookOpen,
    iconBg: 'bg-emerald-500',
  },
  break: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: Coffee,
    iconBg: 'bg-amber-500',
  },
};

export function TeacherScheduleTab() {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const today = new Date().getDay();
    if (today === 0) return 'Sunday';
    if (today >= 1 && today <= 4) return days[today] as DayOfWeek;
    return 'Sunday'; // Default to Sunday for Friday/Saturday
  });

  const currentDayIndex = days.indexOf(selectedDay);

  const goToPrevDay = () => {
    if (currentDayIndex > 0) {
      setSelectedDay(days[currentDayIndex - 1]);
    }
  };

  const goToNextDay = () => {
    if (currentDayIndex < days.length - 1) {
      setSelectedDay(days[currentDayIndex + 1]);
    }
  };

  const totalClasses = Object.values(mockSchedule).flat().filter(s => s.type !== 'break').length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Week Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl md:rounded-2xl border border-border p-4 md:p-6 shadow-card"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm md:text-base lg:text-lg font-semibold">Weekly Overview</h3>
          <span className="text-[10px] md:text-xs text-muted-foreground">
            {totalClasses} classes this week
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {days.map((day) => {
            const dayClasses = mockSchedule[day].filter(s => s.type !== 'break');
            const isSelected = day === selectedDay;
            const isToday = new Date().getDay() === days.indexOf(day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "relative p-2 md:p-3 rounded-lg md:rounded-xl border transition-all",
                  isSelected 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-card hover:bg-muted border-border"
                )}
              >
                {isToday && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
                )}
                <p className="text-[10px] md:text-xs font-medium">{day.slice(0, 3)}</p>
                <p className={cn(
                  "text-lg md:text-xl font-bold",
                  isSelected ? "text-primary-foreground" : ""
                )}>
                  {dayClasses.length}
                </p>
                <p className={cn(
                  "text-[9px] md:text-[10px]",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  classes
                </p>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Day Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevDay}
          disabled={currentDayIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <h3 className="text-base md:text-lg font-semibold">{selectedDay}'s Schedule</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextDay}
          disabled={currentDayIndex === days.length - 1}
          className="gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Schedule Timeline */}
      <div className="space-y-3 md:space-y-4">
        {mockSchedule[selectedDay].length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-xl md:rounded-2xl border border-border p-8 text-center"
          >
            <Coffee className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No classes scheduled for {selectedDay}</p>
          </motion.div>
        ) : (
          mockSchedule[selectedDay].map((slot, index) => {
            const styles = typeStyles[slot.type];
            const Icon = styles.icon;

            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={cn(
                  "bg-card rounded-xl md:rounded-2xl border p-4 md:p-5 shadow-card transition-all",
                  styles.border,
                  slot.type !== 'break' && "hover:shadow-card-hover"
                )}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Time Column */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center",
                      styles.iconBg
                    )}>
                      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="w-0.5 h-full bg-border mt-2 hidden md:block" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm md:text-base font-semibold">{slot.subject}</h4>
                        {slot.subjectCode && (
                          <p className="text-xs text-muted-foreground">{slot.subjectCode}</p>
                        )}
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] md:text-xs font-medium capitalize",
                        styles.bg
                      )}>
                        {slot.type}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-[10px] md:text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                      </div>
                      {slot.room && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{slot.type === 'lab' ? slot.room : `Room ${slot.room}`}</span>
                        </div>
                      )}
                      {slot.department && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{slot.department} - Sem {slot.semester}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
