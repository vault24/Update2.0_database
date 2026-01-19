import { motion } from 'framer-motion';
import { Play, Clock, User, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudyMaterial } from '@/data/mockStudyMaterials';

interface VideoCardProps {
  material: StudyMaterial;
  index: number;
}

export function VideoCard({ material, index }: VideoCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Generate a thumbnail placeholder based on the title
  const getThumbnailColor = () => {
    const colors = [
      'from-purple-600 via-purple-700 to-indigo-800',
      'from-blue-600 via-blue-700 to-cyan-800',
      'from-pink-600 via-rose-700 to-red-800',
      'from-orange-500 via-orange-600 to-red-700',
      'from-teal-600 via-teal-700 to-emerald-800',
    ];
    const hash = material.title.length % colors.length;
    return colors[hash];
  };

  const handleWatch = () => {
    window.open(material.fileUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group hover:shadow-elevated transition-all duration-300 border-border/50 overflow-hidden h-full">
        {/* Video Thumbnail */}
        <div className={`relative h-36 bg-gradient-to-br ${getThumbnailColor()} cursor-pointer`} onClick={handleWatch}>
          {/* Video pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full" style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(255,255,255,0.1) 10px,
                rgba(255,255,255,0.1) 20px
              )`,
            }} />
          </div>
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                <Play className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" />
              </div>
            </div>
          </div>

          {/* Duration badge */}
          {material.duration && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-black/70 text-white border-0 backdrop-blur-sm text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {material.duration}
              </Badge>
            </div>
          )}

          {/* Video badge */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-purple-500/90 text-white border-0 text-xs">
              Video
            </Badge>
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

          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {material.uploadedBy}
            </span>
            <span>{formatDate(material.uploadedAt)}</span>
          </div>

          <Button variant="default" size="sm" className="w-full h-8 gap-2" onClick={handleWatch}>
            <ExternalLink className="w-3.5 h-3.5" />
            Watch Now
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
