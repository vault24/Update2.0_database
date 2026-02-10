import { motion } from 'framer-motion';
import { 
  Briefcase, GraduationCap, Building2, MoreHorizontal,
  MapPin, Calendar, Plus, Edit, Trash2, Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CareerEntry, CareerType } from '@/services/alumniService';

interface CareerTimelineProps {
  careers: CareerEntry[];
  onAdd?: () => void;
  onEdit?: (career: CareerEntry) => void;
  onDelete?: (careerId: string) => void;
  isEditable?: boolean;
}

export function CareerTimeline({ careers, onAdd, onEdit, onDelete, isEditable = true }: CareerTimelineProps) {
  const getCareerIcon = (type: CareerType) => {
    switch (type) {
      case 'job':
        return Briefcase;
      case 'higherStudies':
        return GraduationCap;
      case 'business':
        return Building2;
      default:
        return MoreHorizontal;
    }
  };

  const getCareerColor = (type: CareerType) => {
    switch (type) {
      case 'job':
        return 'bg-emerald-500';
      case 'higherStudies':
        return 'bg-blue-500';
      case 'business':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCareerBadge = (type: CareerType) => {
    switch (type) {
      case 'job':
        return { label: 'Employment', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
      case 'higherStudies':
        return { label: 'Education', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' };
      case 'business':
        return { label: 'Business', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' };
      default:
        return { label: 'Other', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' };
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const sortedCareers = [...careers].sort((a, b) => {
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          Career Journey
        </CardTitle>
        {isEditable && (
          <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {careers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No career entries yet</p>
            {isEditable && (
              <Button variant="link" onClick={onAdd} className="mt-2">
                Add your first career entry
              </Button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />

            <div className="space-y-6">
              {sortedCareers.map((career, index) => {
                const Icon = getCareerIcon(career.type);
                const badge = getCareerBadge(career.type);
                const iconColor = getCareerColor(career.type);

                return (
                  <motion.div
                    key={career.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-12 group"
                  >
                    {/* Timeline Dot */}
                    <div className={`absolute left-0 top-1 w-10 h-10 rounded-full ${iconColor} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    {/* Content Card */}
                    <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors relative">
                      {/* Edit/Delete Actions */}
                      {isEditable && (
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit?.(career)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete?.(career.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="font-semibold text-foreground">{career.position}</h4>
                        {career.current && (
                          <Badge variant="default" className="bg-primary/10 text-primary text-xs">
                            Current
                          </Badge>
                        )}
                        <Badge className={badge.color + ' text-xs'}>{badge.label}</Badge>
                      </div>

                      {/* Company & Location */}
                      <p className="text-muted-foreground font-medium">{career.company}</p>
                      
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {career.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(career.startDate)} - {career.current ? 'Present' : formatDate(career.endDate || '')}
                        </span>
                      </div>

                      {/* Description */}
                      {career.description && (
                        <p className="mt-3 text-sm text-muted-foreground">{career.description}</p>
                      )}

                      {/* Achievements */}
                      {career.achievements && career.achievements.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {career.achievements.map((achievement, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground">{achievement}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Type-specific info */}
                      {career.type === 'job' && career.salary && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">Salary:</span> {career.salary}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
