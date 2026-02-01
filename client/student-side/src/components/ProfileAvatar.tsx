/**
 * Profile Avatar Component
 * Displays user profile picture using the profile picture hook
 */

import { useProfilePicture } from '@/hooks/useProfilePicture';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Loader2 } from 'lucide-react';

interface ProfileAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ProfileAvatar({ size = 'md', className = '' }: ProfileAvatarProps) {
  const { user } = useAuth();
  const { profilePictureUrl, loading } = useProfilePicture();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  // Debug logging
  console.log('ProfileAvatar debug:', {
    profilePictureUrl,
    loading,
    userName: user?.name,
    userRelatedProfileId: user?.relatedProfileId
  });

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {profilePictureUrl && !loading && (
        <AvatarImage 
          src={profilePictureUrl} 
          alt={`${user?.name || 'User'}'s profile picture`}
          className="object-cover"
          onError={(e) => {
            console.error('Profile picture failed to load:', profilePictureUrl);
            // Hide the image on error so fallback shows
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => {
            console.log('Profile picture loaded successfully:', profilePictureUrl);
          }}
        />
      )}
      <AvatarFallback className="bg-primary/10">
        {loading ? (
          <Loader2 className={`${iconSizes[size]} text-muted-foreground animate-spin`} />
        ) : user?.name ? (
          <span className="font-medium text-primary">
            {user.name.charAt(0).toUpperCase()}
          </span>
        ) : (
          <User className={`${iconSizes[size]} text-muted-foreground`} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

export default ProfileAvatar;