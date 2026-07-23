import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Mail, Phone, GraduationCap, Building2, Calendar,
  ExternalLink, Edit, BadgeCheck, Clock, Linkedin, Globe,
  Camera, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlumniProfile, alumniService, ALUMNI_COVER_IMAGE } from '@/services/alumniService';

interface AlumniProfileHeaderProps {
  alumni: AlumniProfile;
  onEdit?: () => void;
  isEditable?: boolean;
  /** Called after the profile photo is successfully replaced. */
  onPhotoChange?: () => void;
}

export function AlumniProfileHeader({ alumni, onEdit, isEditable = true, onPhotoChange }: AlumniProfileHeaderProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [coverError, setCoverError] = useState(false);

  const MAX_MB = 5;

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { toast.error(`Image must be under ${MAX_MB}MB.`); return; }
    setUploadingAvatar(true);
    try {
      await alumniService.uploadAvatar(file);
      toast.success('Profile photo updated');
      onPhotoChange?.();
    } catch {
      toast.error('Failed to upload profile photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getCategoryBadge = () => {
    switch (alumni.category) {
      case 'employed':
        return { label: 'Employed', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
      case 'higherStudies':
        return { label: 'Higher Studies', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
      case 'business':
        return { label: 'Entrepreneur', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' };
      case 'established':
        return { label: 'Established Professional', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
      default:
        return { label: 'Alumni', color: 'bg-primary/10 text-primary' };
    }
  };

  const categoryBadge = getCategoryBadge();
  const showCover = !coverError;

  const infoTiles = [
    { icon: GraduationCap, label: 'Department', value: alumni.department || '—' },
    { icon: Calendar, label: 'Graduated', value: alumni.graduationYear || '—' },
    { icon: MapPin, label: 'Location', value: alumni.location && alumni.location !== 'N/A' ? alumni.location : '—' },
    {
      icon: Building2,
      label: 'Final CGPA',
      value: alumni.gpa && typeof alumni.gpa === 'number' ? alumni.gpa.toFixed(2) : (alumni.gpa as unknown as string) || 'N/A',
    },
  ];

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Cover — fixed institute banner (not user-editable) */}
      <div className="relative h-32 sm:h-48">
        {showCover ? (
          <>
            <img src={ALUMNI_COVER_IMAGE} alt="Institute cover" className="h-full w-full object-cover" onError={() => setCoverError(true)} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500">
            <div className="absolute -right-6 -top-8 text-white opacity-10">
              <GraduationCap className="h-44 w-44" />
            </div>
            <div className="absolute -bottom-10 left-16 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
          </div>
        )}

        {/* Cover actions */}
        <div className="absolute right-4 top-4 flex gap-2">
          {isEditable && (
            <Button size="sm" variant="secondary" className="gap-1.5 bg-white/90 text-foreground hover:bg-white" onClick={onEdit}>
              <Edit className="h-4 w-4" /><span className="hidden sm:inline">Edit profile</span>
            </Button>
          )}
        </div>
      </div>

      {/* Profile content */}
      <div className="px-4 pb-6 sm:px-6">
        {/* Avatar overlapping the cover */}
        <div className="-mt-14 flex flex-col gap-3 sm:-mt-16 sm:flex-row sm:items-end sm:gap-5">
          <motion.div
            initial={false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="group/avatar relative"
          >
            <Avatar className="h-28 w-28 border-4 border-background shadow-xl sm:h-32 sm:w-32">
              <AvatarImage src={alumni.avatar} alt={alumni.name} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-500 text-2xl font-bold text-white sm:text-3xl">
                {getInitials(alumni.name)}
              </AvatarFallback>
            </Avatar>
            {isEditable && (
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Change profile photo"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover/avatar:opacity-100 focus:opacity-100 disabled:opacity-100"
              >
                {uploadingAvatar ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          </motion.div>

          <div className="flex-1 sm:pb-2">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">{alumni.name}</h1>
              <Badge className={categoryBadge.color}>{categoryBadge.label}</Badge>
              {alumni.isVerified ? (
                <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </Badge>
              ) : (
                <Badge className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" /> {alumni.reviewStatus === 'pending' ? 'Pending Review' : 'Unverified'}
                </Badge>
              )}
            </div>
            {(alumni.currentJob || alumni.company) && (
              <p className="text-sm text-muted-foreground sm:text-lg">
                {alumni.currentJob}
                {alumni.currentJob && alumni.company ? ' at ' : ''}
                {alumni.company}
              </p>
            )}
          </div>

          {/* Quick links */}
          <div className="flex gap-2 sm:pb-2">
            {alumni.linkedin && (
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <a href={alumni.linkedin} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4" /><span className="hidden sm:inline">LinkedIn</span>
                </a>
              </Button>
            )}
            {alumni.portfolio && (
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <a href={alumni.portfolio} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" /><span className="hidden sm:inline">Portfolio</span>
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {infoTiles.map((tile, i) => (
            <motion.div
              key={tile.label}
              initial={false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <tile.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{tile.label}</p>
                <p className="truncate text-sm font-medium">{tile.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-4 flex flex-col flex-wrap gap-2 border-t pt-4 sm:flex-row sm:gap-4">
          {alumni.email && (
            <a href={`mailto:${alumni.email}`} className="flex items-center gap-2 truncate text-xs text-muted-foreground transition-colors hover:text-primary sm:text-sm">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{alumni.email}</span>
            </a>
          )}
          {alumni.phone && (
            <a href={`tel:${alumni.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary sm:text-sm">
              <Phone className="h-4 w-4 flex-shrink-0" />
              {alumni.phone}
            </a>
          )}
          {alumni.roll && (
            <span className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              <ExternalLink className="h-4 w-4 flex-shrink-0" /> Roll: {alumni.roll}
            </span>
          )}
        </div>

        {/* Bio */}
        {alumni.bio && (
          <div className="mt-4 rounded-xl bg-muted/30 p-4">
            <p className="leading-relaxed text-muted-foreground">{alumni.bio}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
