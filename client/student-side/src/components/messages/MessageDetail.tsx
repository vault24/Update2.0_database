import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Building, 
  Users, 
  Clock, 
  GraduationCap, 
  User, 
  Paperclip, 
  ExternalLink,
  Star,
  FileText,
  Image,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Message } from '@/data/mockMessages';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessageDetailProps {
  message: Message | null;
  onClose: () => void;
}

const typeConfig = {
  institute: {
    icon: Building,
    label: 'Institute-wide Message',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  department: {
    icon: Users,
    label: 'Department Message',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  shift: {
    icon: Clock,
    label: 'Shift Message',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  semester: {
    icon: GraduationCap,
    label: 'Semester Message',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  teacher: {
    icon: User,
    label: 'Teacher Message',
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  },
};

export function MessageDetail({ message, onClose }: MessageDetailProps) {
  if (!message) return null;

  const config = typeConfig[message.type];
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 lg:relative lg:bg-transparent lg:backdrop-blur-none"
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border shadow-xl overflow-y-auto lg:relative lg:max-w-none lg:border-0 lg:shadow-none"
        >
          {/* Header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-4 z-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="hidden lg:flex">
                <X className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg truncate">{message.title}</h2>
                <p className="text-sm text-muted-foreground">{config.label}</p>
              </div>
              {message.priority === 'important' && (
                <Badge variant="destructive">
                  <Star className="w-3 h-3 mr-1" />
                  Important
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-6">
            {/* Sender Info */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                config.color
              )}>
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">{message.sender}</p>
                <p className="text-sm text-muted-foreground">{message.senderRole}</p>
              </div>
              <p className="ml-auto text-sm text-muted-foreground">
                {format(new Date(message.createdAt), 'PPp')}
              </p>
            </div>

            <Separator />

            {/* Message Body */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Attachments ({message.attachments.length})
                </h3>
                <div className="space-y-2">
                  {message.attachments.map((attachment) => (
                    <Card key={attachment.id} className="overflow-hidden">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          attachment.type === 'pdf' ? 'bg-red-500/10' : 'bg-blue-500/10'
                        )}>
                          {attachment.type === 'pdf' ? (
                            <FileText className="w-5 h-5 text-red-500" />
                          ) : (
                            <Image className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">{attachment.size}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {message.links && message.links.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Links ({message.links.length})
                </h3>
                <div className="space-y-2">
                  {message.links.map((link) => (
                    <Card key={link.id} className="overflow-hidden hover:bg-secondary/50 transition-colors">
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ExternalLink className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{link.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                          </div>
                        </CardContent>
                      </a>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
