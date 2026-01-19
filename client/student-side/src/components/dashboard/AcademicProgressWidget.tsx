import { motion } from 'framer-motion';
import { TrendingUp, Award, BookOpen, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AcademicProgressWidgetProps {
  cgpa?: number;
  completedCredits?: number;
  totalCredits?: number;
  currentSemester?: number;
  totalSemesters?: number;
}

export function AcademicProgressWidget({
  cgpa = 3.65,
  completedCredits = 78,
  totalCredits = 160,
  currentSemester = 5,
  totalSemesters = 8,
}: AcademicProgressWidgetProps) {
  const creditProgress = (completedCredits / totalCredits) * 100;
  const semesterProgress = (currentSemester / totalSemesters) * 100;

  const getGradeColor = (gpa: number) => {
    if (gpa >= 3.7) return 'from-emerald-500 to-green-500';
    if (gpa >= 3.3) return 'from-blue-500 to-cyan-500';
    if (gpa >= 3.0) return 'from-yellow-500 to-amber-500';
    return 'from-orange-500 to-red-500';
  };

  const getGradeLabel = (gpa: number) => {
    if (gpa >= 3.7) return 'Excellent';
    if (gpa >= 3.3) return 'Very Good';
    if (gpa >= 3.0) return 'Good';
    return 'Average';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-card rounded-2xl border border-border p-5 shadow-card"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 bg-accent/10 rounded-lg">
          <TrendingUp className="w-5 h-5 text-accent" />
        </div>
        <h3 className="text-lg font-semibold">Academic Progress</h3>
      </div>

      {/* CGPA Display */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
            className={cn(
              "w-20 h-20 rounded-2xl flex flex-col items-center justify-center",
              `bg-gradient-to-br ${getGradeColor(cgpa)}`,
              "text-white shadow-lg"
            )}
          >
            <span className="text-2xl font-bold">{cgpa.toFixed(2)}</span>
            <span className="text-xs opacity-80">CGPA</span>
          </motion.div>
          <div>
            <p className="text-lg font-semibold">{getGradeLabel(cgpa)}</p>
            <p className="text-sm text-muted-foreground">Performance Grade</p>
          </div>
        </div>
        <Award className="w-8 h-8 text-yellow-500" />
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        {/* Credits Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Credits Completed</span>
            </div>
            <span className="text-sm font-bold text-primary">
              {completedCredits}/{totalCredits}
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${creditProgress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalCredits - completedCredits} credits remaining
          </p>
        </div>

        {/* Semester Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Degree Progress</span>
            </div>
            <span className="text-sm font-bold text-accent">
              Semester {currentSemester}/{totalSemesters}
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${semesterProgress}%` }}
              transition={{ duration: 1, delay: 0.6 }}
              className="h-full bg-gradient-to-r from-accent to-success rounded-full"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalSemesters - currentSemester} semesters to graduation
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">A+</p>
          <p className="text-xs text-muted-foreground">Last Grade</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">12</p>
          <p className="text-xs text-muted-foreground">Subjects Done</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">Top 10%</p>
          <p className="text-xs text-muted-foreground">Class Rank</p>
        </div>
      </div>
    </motion.div>
  );
}
