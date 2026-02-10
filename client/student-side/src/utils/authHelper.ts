/**
 * Authentication Helper
 * Utilities for managing authentication state and debugging
 */

import { apiClient } from '@/lib/api';

export interface AuthStatus {
  isAuthenticated: boolean;
  user?: any;
  error?: string;
}

/**
 * Check current authentication status
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
  try {
    // First get CSRF token
    await apiClient.get('auth/csrf/');
    
    // Then check authentication
    const response = await apiClient.get<{ user?: any }>('auth/me/');
    
    return {
      isAuthenticated: true,
      user: response?.user
    };
  } catch (error: any) {
    console.error('Auth check failed:', error);
    return {
      isAuthenticated: false,
      error: error.error || 'Authentication check failed'
    };
  }
}

/**
 * Attempt to login with stored credentials or prompt user
 */
export async function ensureAuthentication(): Promise<boolean> {
  try {
    const authStatus = await checkAuthStatus();
    
    if (authStatus.isAuthenticated) {
      console.log('User is already authenticated:', authStatus.user?.username);
      return true;
    }
    
    // If not authenticated, check if we have demo mode
    const demoRole = localStorage.getItem('demoRole');
    if (demoRole) {
      console.log('Using demo mode, authentication not required');
      return true;
    }
    
    // For real users, they need to login
    console.warn('User not authenticated, login required');
    return false;
    
  } catch (error) {
    console.error('Authentication check failed:', error);
    return false;
  }
}

/**
 * Debug authentication state
 */
export function debugAuthState() {
  console.log('=== Authentication Debug ===');
  console.log('Demo role:', localStorage.getItem('demoRole'));
  console.log('User ID:', localStorage.getItem('userId'));
  console.log('Related Profile ID:', localStorage.getItem('relatedProfileId'));
  console.log('Has logged out:', localStorage.getItem('hasLoggedOut'));
  console.log('Cookies:', document.cookie);
  console.log('============================');
}