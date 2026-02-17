import { motion } from 'framer-motion';
import { BookOpen, Plus, Edit, Trash2, Calendar, Award, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Course } from '@/services/alumniService';

interface CoursesCardProps {
  courses: Course[];
  onAdd?: () => void;
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
  isEditable?: boolean;
}

export function CoursesCard({ courses, onAdd, onEdit, onDelete, isEditable = true }: CoursesCardProps) {
  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: Course['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'planned':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getStatusLabel = (status: Course['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'planned':
        return 'Planned';
      default:
        return status;
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Courses & Certifications
        </CardTitle>
        {isEditable && (
          <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No courses added yet</p>
            {isEditable && (
              <Button variant="link" onClick={onAdd} className="mt-2">
                Add your first course
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors relative"
              >
                {/* Edit/Delete Actions */}
                {isEditable && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit?.(course)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete?.(course.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {/* Course Info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground">{course.name}</h4>
                      <Badge className={getStatusColor(course.status) + ' text-xs'}>
                        {getStatusLabel(course.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{course.provider}</p>
                    
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {course.completionDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(course.completionDate)}
                        </span>
                      )}
                      {course.certificateId && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {course.certificateId}
                        </span>
                      )}
                      {course.certificateUrl && (
                        <a
                          href={course.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Certificate
                        </a>
                      )}
                    </div>

                    {course.description && (
                      <p className="text-sm text-muted-foreground mt-2">{course.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
