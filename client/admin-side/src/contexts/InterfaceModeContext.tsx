import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '@/lib/api';
import type { InterfaceMode } from '@/config/permissions';

interface InterfaceModeContextType {
  /** Current interface mode: 'simple' or 'advanced'. */
  mode: InterfaceMode;
  isAdvanced: boolean;
  /** Persist a specific mode (backend + local). */
  setMode: (mode: InterfaceMode) => Promise<void>;
  /** Flip between simple and advanced. */
  toggleMode: () => Promise<void>;
  /** True while the change is being saved to the backend. */
  isSaving: boolean;
  /** Whether the Alumni pages are shown in the sidebar (visibility only). */
  alumniVisible: boolean;
  /** Persist the Alumni sidebar visibility (backend + local). */
  setAlumniVisible: (visible: boolean) => Promise<void>;
  /** True while the alumni-visibility change is being saved. */
  isSavingAlumni: boolean;
}

const InterfaceModeContext = createContext<InterfaceModeContextType | undefined>(undefined);

export function InterfaceModeProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const [mode, setModeState] = useState<InterfaceMode>('simple');
  const [isSaving, setIsSaving] = useState(false);
  const [alumniVisible, setAlumniVisibleState] = useState(true);
  const [isSavingAlumni, setIsSavingAlumni] = useState(false);

  // Keep local mode in sync with the authenticated user's stored preference.
  useEffect(() => {
    if (user?.interface_mode === 'advanced' || user?.interface_mode === 'simple') {
      setModeState(user.interface_mode);
    }
  }, [user?.interface_mode, user?.id]);

  // Keep the alumni sidebar visibility in sync with the stored preference.
  useEffect(() => {
    if (typeof user?.alumni_visible === 'boolean') {
      setAlumniVisibleState(user.alumni_visible);
    }
  }, [user?.alumni_visible, user?.id]);

  const setMode = async (next: InterfaceMode) => {
    if (next === mode) return;

    // Optimistic update — sidebar, routes and widgets react immediately.
    const previous = mode;
    setModeState(next);
    updateUser({ interface_mode: next });
    setIsSaving(true);

    try {
      await apiClient.put('auth/profile/', { interface_mode: next });
    } catch (err) {
      // Revert on failure so UI never claims a mode that wasn't saved.
      setModeState(previous);
      updateUser({ interface_mode: previous });
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMode = () => setMode(mode === 'advanced' ? 'simple' : 'advanced');

  // Persist the Alumni sidebar visibility exactly like the interface mode:
  // optimistic local update, saved to the user profile, reverted on failure.
  const setAlumniVisible = async (next: boolean) => {
    if (next === alumniVisible) return;

    const previous = alumniVisible;
    setAlumniVisibleState(next);
    updateUser({ alumni_visible: next });
    setIsSavingAlumni(true);

    try {
      await apiClient.put('auth/profile/', { alumni_visible: next });
    } catch (err) {
      setAlumniVisibleState(previous);
      updateUser({ alumni_visible: previous });
      throw err;
    } finally {
      setIsSavingAlumni(false);
    }
  };

  return (
    <InterfaceModeContext.Provider
      value={{
        mode, isAdvanced: mode === 'advanced', setMode, toggleMode, isSaving,
        alumniVisible, setAlumniVisible, isSavingAlumni,
      }}
    >
      {children}
    </InterfaceModeContext.Provider>
  );
}

export function useInterfaceMode() {
  const context = useContext(InterfaceModeContext);
  if (context === undefined) {
    throw new Error('useInterfaceMode must be used within an InterfaceModeProvider');
  }
  return context;
}
