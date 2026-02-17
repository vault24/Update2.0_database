import { motion } from 'framer-motion';
import { 
  MapPin, Mail, Phone, GraduationCap, Building2, Calendar,
  ExternalLink, Edit, Share2, Download
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlumniProfile } from '@/services/alumniService';

interface AlumniProfileHeaderProps {
  alumni: AlumniProfile;
  onEdit?: () => void;
  isEditable?: boolean;
}

export function AlumniProfileHeader({ alumni, onEdit, isEditable = true }: AlumniProfileHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSupportBadge = () => {
    switch (alumni.supportStatus) {
      case 'needSupport':
        return { label: 'Needs Support', variant: 'warning' as const };
      case 'needExtraSupport':
        return { label: 'Needs Extra Support', variant: 'destructive' as const };
      default:
        return { label: 'Independent', variant: 'success' as const };
    }
  };

  const getCategoryBadge = () => {
    switch (alumni.category) {
      case 'employed':
        return { label: 'Employed', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
      case 'higherStudies':
        return { label: 'Higher Studies', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' };
      case 'business':
        return { label: 'Entrepreneur', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' };
      default:
        return { label: 'Alumni', color: 'bg-primary/10 text-primary' };
    }
  };

  const supportBadge = getSupportBadge();
  const categoryBadge = getCategoryBadge();

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Gradient Banner */}
      <div className="h-28 sm:h-40 bg-gradient-to-r from-primary via-primary/80 to-primary/60 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjMCAwLTIgMi0yIDRzMiA0IDIgNCBzIDItMiA0LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          {alumni.linkedin && (
            <Button size="sm" variant="secondary" className="gap-1.5" asChild>
              <a href={alumni.linkedin} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">LinkedIn</span>
              </a>
            </Button>
          )}
          {alumni.portfolio && (
            <Button size="sm" variant="secondary" className="gap-1.5" asChild>
              <a href={alumni.portfolio} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Portfolio</span>
              </a>
            </Button>
          )}
          {isEditable && (
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 sm:px-6 pb-6">
        {/* Avatar - Overlapping Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-14 sm:-mt-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background shadow-xl">
              <AvatarImage src={alumni.avatar} alt={alumni.name} />
              <AvatarFallback className="text-xl sm:text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {getInitials(alumni.name)}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          <div className="flex-1 sm:pb-2">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{alumni.name}</h1>
              <Badge className={categoryBadge.color}>{categoryBadge.label}</Badge>
            </div>
            <p className="text-sm sm:text-lg text-muted-foreground">
              {alumni.currentJob} at {alumni.company}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
          >
            <div className="p-2 rounded-full bg-primary/10">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="font-medium text-sm">{alumni.department}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
          >
            <div className="p-2 rounded-full bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Graduated</p>
              <p className="font-medium text-sm">{alumni.graduationYear}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
          >
            <div className="p-2 rounded-full bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium text-sm">{alumni.location}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
          >
            <div className="p-2 rounded-full bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">GPA</p>
              <p className="font-medium text-sm">
                {alumni.gpa && typeof alumni.gpa === 'number' 
                  ? alumni.gpa.toFixed(2) 
                  : alumni.gpa || 'N/A'}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 mt-4 pt-4 border-t">
          <a href={`mailto:${alumni.email}`} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors truncate">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{alumni.email}</span>
          </a>
          <a href={`tel:${alumni.phone}`} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
            <Phone className="w-4 h-4 flex-shrink-0" />
            {alumni.phone}
          </a>
        </div>

        {/* Bio */}
        {alumni.bio && (
          <div className="mt-4 p-4 rounded-lg bg-muted/30">
            <p className="text-muted-foreground leading-relaxed">{alumni.bio}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
