import { motion } from 'framer-motion';
import { 
  GraduationCap, Mail, Phone, MapPin, Building, 
  Edit, Award, Calendar, BookOpen 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TeacherProfileHeaderProps {
  teacher: {
    name: string;
    department: string;
    designation?: string;
    email: string;
    phone?: string;
    employeeId?: string;
    joiningDate?: string;
    officeLocation?: string;
    specialization?: string;
  };
}

export function TeacherProfileHeader({ teacher }: TeacherProfileHeaderProps) {
  const quickInfo = [
    { icon: Mail, label: 'Email', value: teacher.email },
    { icon: Phone, label: 'Phone', value: teacher.phone || '+880 1XXX-XXXXXX' },
    { icon: MapPin, label: 'Office', value: teacher.officeLocation || 'Room 301, Main Building' },
    { icon: Building, label: 'Employee ID', value: teacher.employeeId || 'TCH-2024-001' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl md:rounded-2xl lg:rounded-3xl border border-border overflow-hidden shadow-card"
    >
      {/* Header Banner */}
      <div className="h-28 md:h-36 lg:h-44 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-pink-400/20 rounded-full translate-y-1/2 blur-2xl" />
      </div>
      
      <div className="px-4 md:px-6 lg:px-8 pb-4 md:pb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16">
          {/* Profile Avatar */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-xl md:rounded-2xl lg:rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl md:text-3xl lg:text-4xl font-bold text-white border-4 border-card shadow-xl"
          >
            {teacher.name.charAt(0)}
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold truncate">
                  {teacher.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {teacher.designation || 'Lecturer'}
                  </span>
                  <span className="text-xs md:text-sm text-muted-foreground">
                    {teacher.department}
                  </span>
                </div>
              </div>
              
              <Button variant="outline" size="sm" className="gap-2 self-start md:self-auto text-xs md:text-sm">
                <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4 mt-4 md:mt-6">
          {quickInfo.map((info, index) => (
            <motion.div
              key={info.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center gap-2 text-[11px] md:text-xs lg:text-sm"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <info.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] text-muted-foreground">{info.label}</p>
                <p className="font-medium truncate">{info.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap gap-4 md:gap-6 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-violet-500" />
            </div>
            <div>
              <p className="text-lg md:text-xl lg:text-2xl font-bold">12</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Courses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Award className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg md:text-xl lg:text-2xl font-bold">8+</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Years Exp.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-lg md:text-xl lg:text-2xl font-bold">{teacher.joiningDate || '2016'}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Joined</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
