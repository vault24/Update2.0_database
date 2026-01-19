import { motion } from 'framer-motion';
import { FileText, Video, Presentation, BookOpen, Download, ExternalLink, User, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudyMaterial } from '@/data/mockStudyMaterials';
import { cn } from '@/lib/utils';

interface MaterialCardProps {
  material: StudyMaterial;
  index: number;
}

const typeConfig = {
  pdf: {
    icon: FileText,
    label: 'PDF',
    color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    iconColor: 'text-red-500',
  },
  video: {
    icon: Video,
    label: 'Video',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    iconColor: 'text-purple-500',
  },
  slide: {
    icon: Presentation,
    label: 'Slide',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    iconColor: 'text-orange-500',
  },
  ebook: {
    icon: BookOpen,
    label: 'E-Book',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    iconColor: 'text-emerald-500',
  },
};

export function MaterialCard({ material, index }: MaterialCardProps) {
  const config = typeConfig[material.type];
  const IconComponent = config.icon;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleView = () => {
    if (material.type === 'video') {
      window.open(material.fileUrl, '_blank');
    } else {
      // For PDFs, slides, ebooks - would normally open a viewer
      console.log('Opening:', material.title);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group hover:shadow-elevated transition-all duration-300 border-border/50 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Icon */}
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
              config.color.split(' ')[0] // Just the background
            )}>
              <IconComponent className={cn("w-6 h-6", config.iconColor)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {material.title}
                </h3>
                <Badge variant="outline" className={cn("flex-shrink-0 text-xs", config.color)}>
                  {config.label}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge variant="secondary" className="text-xs font-normal">
                  {material.subject}
                </Badge>
                <Badge variant="secondary" className="text-xs font-normal">
                  {material.semester}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {material.uploadedBy}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(material.uploadedAt)}
                </span>
              </div>

              {/* Meta info */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {material.size || material.duration}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-3"
                    onClick={handleView}
                  >
                    {material.type === 'video' ? (
                      <>
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Watch
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        View
                      </>
                    )}
                  </Button>
                  {material.type !== 'video' && (
                    <Button variant="outline" size="sm" className="h-8 px-3">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
