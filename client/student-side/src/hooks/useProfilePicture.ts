/**
 * Profile Picture Hook
 * Manages profile picture functionality using document service
 */

import { useState, useEffect } from 'react';
import { documentService } from '@/services/documentService';
import { studentService } from '@/services/studentService';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

export function useProfilePicture() {
  const { user } = useAuth();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.relatedProfileId) {
      loadProfilePicture();
    }
  }, [user?.relatedProfileId]);

  const loadProfilePicture = async () => {
    try {
      setLoading(true);
      
      const demoRole = localStorage.getItem('demoRole');
      
      // Always load from server to stay in sync across devices
      if (user?.relatedProfileId) {
        try {
          const student = await studentService.getMe(user.relatedProfileId);
          if (student.profilePhoto) {
            const normalizedUrl = student.profilePhoto.startsWith('/files/')
              ? `${API_BASE_URL.replace(/\/api$/, '')}${student.profilePhoto}`
              : student.profilePhoto;
            setProfilePictureUrl(normalizedUrl);
            return;
          }
        } catch (error) {
          console.warn('Could not load profile photo from student record:', error);
        }

        try {
          const response = await documentService.getMyDocuments(user.relatedProfileId, 'Photo');
          if (response.documents && response.documents.length > 0) {
            const photoDoc = response.documents[0]; // Use the first photo document
            await documentService.setAsProfilePicture(photoDoc.id, user.relatedProfileId);
            const updatedStudent = await studentService.getMe(user.relatedProfileId);
            if (updatedStudent.profilePhoto) {
              const normalizedUrl = updatedStudent.profilePhoto.startsWith('/files/')
                ? `${API_BASE_URL.replace(/\/api$/, '')}${updatedStudent.profilePhoto}`
                : updatedStudent.profilePhoto;
              setProfilePictureUrl(normalizedUrl);
              return;
            }
          }
        } catch (error) {
          console.warn('Could not auto-set profile picture:', error);
        }
      }
      setProfilePictureUrl(null);
    } catch (error) {
      console.error('Error loading profile picture:', error);
      setProfilePictureUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfilePicture = async (documentId: string) => {
    try {
      await documentService.setAsProfilePicture(documentId, user?.relatedProfileId);
      if (user?.relatedProfileId) {
        const updatedStudent = await studentService.getMe(user.relatedProfileId);
        const normalizedUrl = updatedStudent.profilePhoto?.startsWith('/files/')
          ? `${API_BASE_URL.replace(/\/api$/, '')}${updatedStudent.profilePhoto}`
          : updatedStudent.profilePhoto || null;
        setProfilePictureUrl(normalizedUrl);
      } else {
        setProfilePictureUrl(null);
      }
      return true;
    } catch (error) {
      console.error('Error updating profile picture:', error);
      return false;
    }
  };

  const clearProfilePicture = () => {
    setProfilePictureUrl(null);
  };

  return {
    profilePictureUrl,
    loading,
    updateProfilePicture,
    clearProfilePicture,
    refreshProfilePicture: loadProfilePicture,
  };
}
