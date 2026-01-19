import { motion } from 'framer-motion';
import { Presentation, Download, ExternalLink, User, Clock, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudyMaterial } from '@/data/mockStudyMaterials';

interface SlideCardProps {
  material: StudyMaterial;
  index: number;
}

export function SlideCard({ material, index }: SlideCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group hover:shadow-elevated transition-all duration-300 border-border/50 overflow-hidden h-full">
        {/* Slide Preview Style Header */}
        <div className="relative h-32 bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600">
          {/* Slide deck effect */}
          <div className="absolute inset-3 flex flex-col gap-1">
            {/* Stacked slides effect */}
            <div className="absolute inset-0 bg-white/10 rounded-lg transform rotate-2 translate-x-1 translate-y-1" />
            <div className="absolute inset-0 bg-white/20 rounded-lg transform -rotate-1 -translate-x-0.5" />
            <div className="relative bg-white/30 backdrop-blur-sm rounded-lg flex-1 flex items-center justify-center border border-white/40">
              <div className="text-center text-white">
                <Presentation className="w-8 h-8 mx-auto mb-1 drop-shadow-md" />
                <div className="flex items-center gap-1 justify-center">
                  <Layers className="w-3 h-3" />
                  <span className="text-xs font-medium">Slides</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Corner fold effect */}
          <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 bg-white/30 transform rotate-45 translate-x-6 -translate-y-6" />
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {material.title}
          </h3>

          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge variant="secondary" className="text-xs font-normal">
              {material.subject}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {material.semester}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {material.uploadedBy}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Clock className="w-3 h-3" />
            {formatDate(material.uploadedAt)}
            {material.size && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>{material.size}</span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-8">
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              View
            </Button>
            <Button variant="default" size="sm" className="flex-1 h-8">
              <Download className="w-3.5 h-3.5 mr-1" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
