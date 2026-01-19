import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  Plus,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Activity {
  id: string;
  subjectId: string;
  subjectName: string;
  date: string;
  topicCovered: string;
  description: string;
  keyPoints: string[];
  teacherName: string;
  status: 'completed' | 'today' | 'upcoming';
}

interface Subject {
  id: string;
  name: string;
  code: string;
  color?: string;
}

interface SubjectActivityBoxProps {
  subject: Subject;
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  onAddActivity: (subjectId: string) => void;
}

const subjectColors: Record<string, { bg: string; border: string; text: string; light: string }> = {
  '1': { bg: 'bg-blue-500', border: 'border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', light: 'bg-blue-500/10' },
  '2': { bg: 'bg-green-500', border: 'border-green-500/30', text: 'text-green-600 dark:text-green-400', light: 'bg-green-500/10' },
  '3': { bg: 'bg-purple-500', border: 'border-purple-500/30', text: 'text-purple-600 dark:text-purple-400', light: 'bg-purple-500/10' },
  '4': { bg: 'bg-orange-500', border: 'border-orange-500/30', text: 'text-orange-600 dark:text-orange-400', light: 'bg-orange-500/10' },
  '5': { bg: 'bg-red-500', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400', light: 'bg-red-500/10' },
};

const defaultColor = { bg: 'bg-primary', border: 'border-primary/30', text: 'text-primary', light: 'bg-primary/10' };

export function SubjectActivityBox({ subject, activities, onEdit, onDelete, onAddActivity }: SubjectActivityBoxProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const colors = subjectColors[subject.id] || defaultColor;
  
  const completedCount = activities.filter(a => a.status === 'completed').length;
  const todayCount = activities.filter(a => a.status === 'today').length;
  const upcomingCount = activities.filter(a => a.status === 'upcoming').length;
  const totalActivities = activities.length;
  const completionRate = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;
  
  // Sort activities: today first, then upcoming by date, then completed by date desc
  const sortedActivities = [...activities].sort((a, b) => {
    if (a.status === 'today' && b.status !== 'today') return -1;
    if (b.status === 'today' && a.status !== 'today') return 1;
    if (a.status === 'upcoming' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status === 'upcoming') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'today': return <AlertCircle className="h-3.5 w-3.5 text-primary" />;
      case 'upcoming': return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 text-[10px] px-1.5">Done</Badge>;
      case 'today': return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 animate-pulse">Today</Badge>;
      case 'upcoming': return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5">Upcoming</Badge>;
      default: return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-lg",
        colors.border,
        "border-l-4",
        isExpanded && "ring-2 ring-primary/20"
      )}>
        <CardHeader className={cn("p-4", colors.light)}>
          <div className="flex items-start justify-between gap-3">
            <div 
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
              onClick={() => navigate(`/dashboard/subject-activities/${subject.id}`)}
            >
              <div className={cn("p-2.5 rounded-xl", colors.bg, "text-white shadow-lg group-hover:scale-105 transition-transform")}>
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold truncate flex items-center gap-2 group-hover:text-primary transition-colors">
                  {subject.name}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
                <p className="text-xs text-muted-foreground">{subject.code}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddActivity(subject.id);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center p-2 rounded-lg bg-card/80">
              <p className="text-lg font-bold text-foreground">{totalActivities}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-card/80">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{completedCount}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-card/80">
              <p className="text-lg font-bold text-primary">{todayCount}</p>
              <p className="text-[10px] text-muted-foreground">Today</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-card/80">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{upcomingCount}</p>
              <p className="text-[10px] text-muted-foreground">Upcoming</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Completion
              </span>
              <span className={cn("font-medium", colors.text)}>{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-1.5" />
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="p-0 border-t border-border">
                <ScrollArea className="max-h-80">
                  <div className="divide-y divide-border">
                    {sortedActivities.length > 0 ? (
                      sortedActivities.map((activity, index) => (
                        <motion.div 
                          key={activity.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "p-3 hover:bg-muted/50 transition-colors",
                            activity.status === 'today' && "bg-primary/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Status Indicator */}
                            <div className="mt-1">
                              {getStatusIcon(activity.status)}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="text-sm font-medium text-foreground truncate max-w-[200px]">
                                  {activity.topicCovered}
                                </h4>
                                {getStatusBadge(activity.status)}
                              </div>
                              
                              <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                                {activity.description}
                              </p>
                              
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(parseISO(activity.date), 'MMM dd')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  {activity.keyPoints.length} key points
                                </span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(activity);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(activity.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-muted-foreground">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No activities yet</p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => onAddActivity(subject.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add first activity
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
