import { motion } from 'framer-motion';
import { 
  Building, 
  Users, 
  Clock, 
  GraduationCap, 
  User, 
  Paperclip, 
  ExternalLink,
  Star,
  Check,
  FileText,
  Image,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Message } from '@/data/mockMessages';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface MessageCardProps {
  message: Message;
  onClick: () => void;
}

const typeConfig = {
  institute: {
    icon: Building,
    label: 'Institute',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  department: {
    icon: Users,
    label: 'Department',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  shift: {
    icon: Clock,
    label: 'Shift',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  },
  semester: {
    icon: GraduationCap,
    label: 'Semester',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  teacher: {
    icon: User,
    label: 'Teacher',
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  },
};

export function MessageCard({ message, onClick }: MessageCardProps) {
  const config = typeConfig[message.type];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-elevated overflow-hidden",
          !message.isRead && "border-l-4 border-l-primary bg-primary/5"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Avatar / Icon */}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              config.color.split(' ')[0]
            )}>
              <IconComponent className={cn("w-5 h-5", config.color.split(' ')[1])} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "font-semibold text-sm",
                    !message.isRead && "text-foreground"
                  )}>
                    {message.sender}
                  </span>
                  <Badge variant="outline" className={cn("text-xs py-0 h-5", config.color)}>
                    {config.label}
                  </Badge>
                  {message.priority === 'important' && (
                    <Badge variant="destructive" className="text-xs py-0 h-5">
                      <Star className="w-3 h-3 mr-0.5" />
                      Important
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!message.isRead && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3 className={cn(
                "text-sm mb-1 line-clamp-1",
                !message.isRead ? "font-semibold" : "font-medium"
              )}>
                {message.title}
              </h3>

              {/* Preview */}
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {message.content}
              </p>

              {/* Attachments & Links */}
              <div className="flex items-center gap-3 flex-wrap">
                {message.attachments && message.attachments.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Paperclip className="w-3 h-3" />
                    {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                  </span>
                )}
                {message.links && message.links.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="w-3 h-3" />
                    {message.links.length} link{message.links.length > 1 ? 's' : ''}
                  </span>
                )}
                {message.isRead && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                    <Check className="w-3 h-3" />
                    Read
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
