/**
 * Profile Picture Hook
 * Manages profile picture functionality using document service
 */

import { useState, useEffect } from 'react';
import { documentService } from '@/services/documentService';
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
      
      // First try to get stored profile picture document ID
      const demoRole = localStorage.getItem('demoRole');
      let documentId: string | null = null;
      
      if (demoRole) {
        documentId = localStorage.getItem('demoProfilePicture');
      } else {
        documentId = localStorage.getItem('profilePictureDocumentId');
      }
      
      // If no stored profile picture, try to find a Photo category document
      if (!documentId && user?.relatedProfileId) {
        try {
          const response = await documentService.getMyDocuments(user.relatedProfileId, 'Photo');
          if (response.documents && response.documents.length > 0) {
            const photoDoc = response.documents[0]; // Use the first photo document
            await documentService.setAsProfilePicture(photoDoc.id);
            documentId = photoDoc.id;
          }
        } catch (error) {
          console.warn('Could not auto-set profile picture:', error);
        }
      }
      
      // If we have a document ID, create the preview URL
      if (documentId) {
        const url = documentService.getDocumentPreviewUrl(documentId);
        setProfilePictureUrl(url);
        console.log('Profile picture URL set:', url);
      } else {
        setProfilePictureUrl(null);
        console.log('No profile picture document found');
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
      setProfilePictureUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfilePicture = async (documentId: string) => {
    try {
      await documentService.setAsProfilePicture(documentId);
      const newUrl = documentService.getDocumentPreviewUrl(documentId);
      setProfilePictureUrl(newUrl);
      return true;
    } catch (error) {
      console.error('Error updating profile picture:', error);
      return false;
    }
  };

  const clearProfilePicture = () => {
    const demoRole = localStorage.getItem('demoRole');
    if (demoRole) {
      localStorage.removeItem('demoProfilePicture');
    } else {
      localStorage.removeItem('profilePictureDocumentId');
    }
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