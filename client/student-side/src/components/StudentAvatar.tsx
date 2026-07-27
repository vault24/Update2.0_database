/**
 * StudentAvatar — the ONE component for rendering a student's image anywhere in
 * the Teacher / Student portal (Take Attendance, records, lists, details,
 * search, alumni, analytics…).
 *
 * It centralises the system-wide female-student photo privacy rule so no page
 * can accidentally bypass it:
 *
 *   • Female students  → ALWAYS a generic female avatar. Their real photo is
 *     never rendered here, even if a `photoUrl` is somehow supplied (the API is
 *     the primary guard; this is defence-in-depth).
 *   • Male students    → their real photo when available, else initials.
 *
 * Pass `gender` (preferred) and/or `avatarVariant` from the API. If neither is
 * known the component treats the student as non-restricted and shows the photo,
 * so ALWAYS pass gender for student records.
 */
import { useState } from 'react';
import { User } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface StudentAvatarProps {
  name?: string | null;
  gender?: string | null;
  /** 'female' forces the female placeholder; sent by the API alongside gender. */
  avatarVariant?: string | null;
  photoUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

const SIZE_PX: Record<AvatarSize, string> = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

const ICON_PX: Record<AvatarSize, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
  xl: 'w-10 h-10',
};

/** Absolute URL for a `/files/...` server path; passes through anything else. */
function normalizePhotoUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/files/')) {
    return `${API_BASE_URL.replace(/\/api$/, '')}${url}`;
  }
  return url;
}

function isFemale(gender?: string | null, avatarVariant?: string | null): boolean {
  if (avatarVariant && avatarVariant.toLowerCase() === 'female') return true;
  return (gender || '').trim().toLowerCase() === 'female';
}

function initialsOf(name?: string | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Generic female avatar silhouette — reused across the portal. */
function FemaleAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Student avatar" className={className}>
      <defs>
        <linearGradient id="stuFemaleAvatarBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#stuFemaleAvatarBg)" />
      <path
        d="M32 9c-11.5 0-19 8.5-19 19.5 0 7 2.2 11.5 4.6 13.8l3.4-2.3c-1.4-3.2-2-6.4-2-9.5 0-1.9.3-3.7.9-5.3C22.6 27.9 27 30 32 30s9.4-2.1 12.1-4.8c.6 1.6.9 3.4.9 5.3 0 3.1-.6 6.3-2 9.5l3.4 2.3C48.8 40 51 35.5 51 28.5 51 17.5 43.5 9 32 9z"
        fill="#fff"
        opacity="0.95"
      />
      <circle cx="32" cy="26.5" r="8.5" fill="#fff" opacity="0.95" />
      <path
        d="M32 38.5c-9.2 0-16.4 5-18.4 12.2C18.4 56.6 24.8 60 32 60s13.6-3.4 18.4-9.3C48.4 43.5 41.2 38.5 32 38.5z"
        fill="#fff"
        opacity="0.95"
      />
    </svg>
  );
}

export function StudentAvatar({
  name,
  gender,
  avatarVariant,
  photoUrl,
  size = 'md',
  className,
}: StudentAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const female = isFemale(gender, avatarVariant);
  const base = cn(
    'relative shrink-0 rounded-full overflow-hidden flex items-center justify-center',
    SIZE_PX[size],
    className,
  );

  // Female students: generic avatar only, never the real photo.
  if (female) {
    return <FemaleAvatar className={base} />;
  }

  const showPhoto = !!photoUrl && !imgFailed;
  if (showPhoto) {
    return (
      <span className={cn(base, 'bg-muted')}>
        <img
          src={normalizePhotoUrl(photoUrl!)}
          alt={name ? `${name}'s photo` : 'Student photo'}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  // Fallback: initials, else a neutral user glyph.
  const initials = initialsOf(name);
  return (
    <span className={cn(base, 'bg-primary/10 font-semibold text-primary')}>
      {initials || <User className={cn('text-muted-foreground', ICON_PX[size])} />}
    </span>
  );
}

export default StudentAvatar;
