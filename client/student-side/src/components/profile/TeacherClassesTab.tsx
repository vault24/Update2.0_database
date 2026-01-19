import { motion } from 'framer-motion';
import { 
  Users, Clock, MapPin, BookOpen, GraduationCap, 
  ChevronRight, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AssignedClass {
  id: string;
  subjectName: string;
  subjectCode: string;
  department: string;
  semester: number;
  shift: string;
  studentCount: number;
  schedule: { day: string; time: string; room: string }[];
}

// Mock data
const mockAssignedClasses: AssignedClass[] = [
  {
    id: '1',
    subjectName: 'Database Management Systems',
    subjectCode: 'CSE-401',
    department: 'Computer Science',
    semester: 4,
    shift: '1st Shift',
    studentCount: 65,
    schedule: [
      { day: 'Sunday', time: '09:00 - 10:30', room: '301' },
      { day: 'Wednesday', time: '11:00 - 12:30', room: '301' },
    ],
  },
  {
    id: '2',
    subjectName: 'Software Engineering',
    subjectCode: 'CSE-501',
    department: 'Computer Science',
    semester: 5,
    shift: '1st Shift',
    studentCount: 58,
    schedule: [
      { day: 'Monday', time: '09:00 - 10:30', room: '402' },
      { day: 'Thursday', time: '14:00 - 15:30', room: '402' },
    ],
  },
  {
    id: '3',
    subjectName: 'Web Development',
    subjectCode: 'CSE-601',
    department: 'Computer Science',
    semester: 6,
    shift: '2nd Shift',
    studentCount: 42,
    schedule: [
      { day: 'Tuesday', time: '14:00 - 15:30', room: '305' },
    ],
  },
  {
    id: '4',
    subjectName: 'Computer Networks',
    subjectCode: 'EEE-501',
    department: 'Electrical & Electronics',
    semester: 5,
    shift: '1st Shift',
    studentCount: 55,
    schedule: [
      { day: 'Sunday', time: '15:30 - 17:00', room: '201' },
      { day: 'Thursday', time: '11:00 - 12:30', room: '201' },
    ],
  },
];

const subjectColors = [
  { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-600', gradient: 'from-violet-500 to-purple-600' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-600' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-600', gradient: 'from-pink-500 to-rose-600' },
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' },
];

export function TeacherClassesTab() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-4 shadow-card"
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold">{mockAssignedClasses.length}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Active Courses</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-4 shadow-card"
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold">
                {mockAssignedClasses.reduce((sum, c) => sum + c.studentCount, 0)}
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Total Students</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-4 shadow-card"
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold">
                {new Set(mockAssignedClasses.map(c => c.department)).size}
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Departments</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-4 shadow-card"
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold">
                {mockAssignedClasses.reduce((sum, c) => sum + c.schedule.length, 0)}
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Weekly Classes</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Class Cards */}
      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        {mockAssignedClasses.map((classItem, index) => {
          const colors = subjectColors[index % subjectColors.length];
          
          return (
            <motion.div
              key={classItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className={cn(
                "bg-card rounded-xl md:rounded-2xl border p-4 md:p-5 shadow-card",
                "hover:shadow-card-hover transition-all duration-300 group cursor-pointer",
                colors.border
              )}
              onClick={() => navigate('/dashboard/students')}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg",
                    colors.gradient
                  )}>
                    <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-semibold">{classItem.subjectName}</h3>
                    <p className={cn("text-xs font-medium", colors.text)}>{classItem.subjectCode}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] md:text-xs">
                    <GraduationCap className="w-3 h-3" />
                    {classItem.department}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] md:text-xs">
                    Semester {classItem.semester}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] md:text-xs">
                    {classItem.shift}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{classItem.studentCount} students</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{classItem.schedule.length} classes/week</span>
                  </div>
                </div>

                <div className="space-y-1">
                  {classItem.schedule.slice(0, 2).map((sched, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] md:text-xs">
                      <span className="font-medium w-20">{sched.day}</span>
                      <span className="text-muted-foreground">{sched.time}</span>
                      <span className="flex items-center gap-1 text-muted-foreground ml-auto">
                        <MapPin className="w-3 h-3" />
                        Room {sched.room}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
