import { motion } from 'framer-motion';
import { FileText, Download, ExternalLink, User, Clock, BookMarked } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudyMaterial } from '@/data/mockStudyMaterials';

interface PDFBookCardProps {
  material: StudyMaterial;
  index: number;
}

export function PDFBookCard({ material, index }: PDFBookCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isEbook = material.type === 'ebook';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group hover:shadow-elevated transition-all duration-300 border-border/50 overflow-hidden h-full">
        {/* Book Cover Style Header */}
        <div className={`relative h-32 ${isEbook ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700' : 'bg-gradient-to-br from-red-500 via-red-600 to-red-700'}`}>
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              {isEbook ? (
                <BookMarked className="w-10 h-10 mx-auto mb-2 drop-shadow-lg" />
              ) : (
                <FileText className="w-10 h-10 mx-auto mb-2 drop-shadow-lg" />
              )}
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                {isEbook ? 'E-Book' : 'PDF'}
              </Badge>
            </div>
          </div>
          {/* Decorative spine */}
          <div className={`absolute left-0 top-0 bottom-0 w-2 ${isEbook ? 'bg-emerald-800' : 'bg-red-800'}`} />
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
              Read
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
