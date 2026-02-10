import { motion } from 'framer-motion';
import { 
  Trophy, Target, Award, Folder, Plus, Trash2, Calendar, Edit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CareerHighlight, HighlightType } from '@/services/alumniService';

interface HighlightsCardProps {
  highlights: CareerHighlight[];
  onAdd?: () => void;
  onEdit?: (highlight: CareerHighlight) => void;
  onDelete?: (highlightId: string) => void;
  isEditable?: boolean;
}

export function HighlightsCard({ highlights, onAdd, onEdit, onDelete, isEditable = true }: HighlightsCardProps) {
  const getHighlightIcon = (type: HighlightType) => {
    switch (type) {
      case 'achievement':
        return Trophy;
      case 'milestone':
        return Target;
      case 'award':
        return Award;
      case 'project':
        return Folder;
      default:
        return Trophy;
    }
  };

  const getHighlightColor = (type: HighlightType) => {
    switch (type) {
      case 'achievement':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'milestone':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'award':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'project':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const typeLabels: Record<HighlightType, string> = {
    achievement: 'Achievement',
    milestone: 'Milestone',
    award: 'Award',
    project: 'Project',
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Career Highlights
        </CardTitle>
        {isEditable && (
          <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {highlights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No highlights added yet</p>
            {isEditable && (
              <Button variant="link" onClick={onAdd} className="mt-2">
                Add your first highlight
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map((highlight, index) => {
              const Icon = getHighlightIcon(highlight.type);
              const colorClass = getHighlightColor(highlight.type);

              return (
                <motion.div
                  key={highlight.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative p-4 rounded-xl border ${colorClass} group`}
                >
                  {isEditable && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => onEdit?.(highlight)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-destructive"
                        onClick={() => onDelete?.(highlight.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-background/50">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[highlight.type]}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-foreground line-clamp-1">{highlight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{highlight.description}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(highlight.date)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
