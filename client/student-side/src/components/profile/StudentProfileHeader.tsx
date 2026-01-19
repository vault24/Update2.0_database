import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, Building, Edit, Share2, Copy, Check,
  GraduationCap, Calendar, Award, ExternalLink, QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StudentProfileHeaderProps {
  name: string;
  nameBangla?: string;
  department: string;
  semester: number | string;
  session?: string;
  shift?: string;
  email: string;
  phone?: string;
  location?: string;
  studentId: string;
  status?: string;
  avatarUrl?: string;
  onEdit?: () => void;
}

export function StudentProfileHeader({
  name,
  nameBangla,
  department,
  semester,
  session,
  shift,
  email,
  phone,
  location,
  studentId,
  status = 'active',
  avatarUrl,
  onEdit
}: StudentProfileHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const publicProfileUrl = `${window.location.origin}/student/${studentId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicProfileUrl);
    setCopied(true);
    toast.success('Profile link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name}'s Student Profile`,
          text: `Check out ${name}'s academic profile`,
          url: publicProfileUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-xl"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
      <div className="absolute top-1/2 right-1/3 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl" />
      
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />

      <div className="relative z-10 p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Avatar Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0"
          >
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-2xl lg:rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl md:text-4xl lg:text-5xl font-bold text-white shadow-2xl ring-4 ring-white/30">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover rounded-2xl lg:rounded-3xl" />
                ) : (
                  name.charAt(0).toUpperCase()
                )}
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                  "absolute -bottom-1 -right-1 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center ring-2 ring-white shadow-lg",
                  status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                )}
              >
                <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Info Section */}
          <div className="flex-1 min-w-0 text-white">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex flex-wrap items-start gap-2 mb-1">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold">
                  {name}
                </h1>
                <Badge className="bg-white/20 text-white border-white/30 text-[10px] md:text-xs">
                  {status === 'active' ? '● Active' : '○ Inactive'}
                </Badge>
              </div>
              {nameBangla && (
                <p className="text-white/70 text-sm md:text-base mb-2">{nameBangla}</p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-2 mb-3 md:mb-4"
            >
              <Badge className="bg-white/15 text-white border-0 backdrop-blur-sm text-xs md:text-sm">
                <GraduationCap className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {department}
              </Badge>
              <Badge className="bg-white/15 text-white border-0 backdrop-blur-sm text-xs md:text-sm">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Semester {semester}
              </Badge>
              {session && (
                <Badge className="bg-white/15 text-white border-0 backdrop-blur-sm text-xs md:text-sm">
                  Session: {session}
                </Badge>
              )}
              {shift && (
                <Badge className="bg-white/15 text-white border-0 backdrop-blur-sm text-xs md:text-sm">
                  {shift}
                </Badge>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3"
            >
              <div className="flex items-center gap-2 text-white/80 text-xs md:text-sm">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Building className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <span className="truncate">{studentId}</span>
              </div>
              <div className="flex items-center gap-2 text-white/80 text-xs md:text-sm">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <span className="truncate">{email}</span>
              </div>
              {phone && (
                <div className="flex items-center gap-2 text-white/80 text-xs md:text-sm">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="truncate">{phone}</span>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-2 text-white/80 text-xs md:text-sm">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="truncate">{location}</span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-row md:flex-col gap-2 self-start"
          >
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-white text-indigo-600 hover:bg-white/90 shadow-lg font-medium text-xs md:text-sm gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Share Profile</span>
                  <span className="sm:hidden">Share</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" />
                    Share Your Public Profile
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-2">Your public profile link:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={publicProfileUrl}
                        readOnly
                        className="flex-1 text-sm bg-background/50 border border-border rounded-lg px-3 py-2 truncate"
                      />
                      <Button
                        size="sm"
                        variant={copied ? "default" : "outline"}
                        onClick={handleCopyLink}
                        className="shrink-0"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleShareNative}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Native Share
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open(publicProfileUrl, '_blank')}
                    >
                      <User className="w-4 h-4" />
                      View Profile
                    </Button>
                  </div>

                  <div className="text-center text-xs text-muted-foreground">
                    <p>Share this link with employers, recruiters, or classmates to showcase your academic achievements.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {onEdit && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onEdit}
                className="text-white hover:bg-white/20 text-xs md:text-sm gap-1.5"
              >
                <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
