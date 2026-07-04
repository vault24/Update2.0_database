import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Guards a page with unsaved edits against accidental navigation:
 *  - browser reload / tab close -> native beforeunload prompt
 *  - in-app link clicks (sidebar, topbar, any <a href>) -> custom confirm
 *    dialog; navigation proceeds only after "Leave anyway".
 *
 * Works with <BrowserRouter> (no data-router useBlocker required): internal
 * link clicks are intercepted in the capture phase before react-router
 * handles them.
 *
 * Usage:
 *   const guard = useUnsavedChangesGuard(isDirty);
 *   ...
 *   <UnsavedChangesDialog guard={guard} />
 */
export interface UnsavedChangesGuard {
  showPrompt: boolean;
  confirmLeave: () => void;
  cancelLeave: () => void;
}

export function useUnsavedChangesGuard(dirty: boolean): UnsavedChangesGuard {
  const navigate = useNavigate();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Reload / close tab: the browser shows its own confirmation.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // In-app navigation: intercept internal link clicks before react-router.
  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      // Respect modified clicks / already-handled events.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank') return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return; // external: beforeunload covers it
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, []);

  const confirmLeave = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) navigate(href);
  }, [pendingHref, navigate]);

  const cancelLeave = useCallback(() => setPendingHref(null), []);

  return { showPrompt: !!pendingHref, confirmLeave, cancelLeave };
}

export function UnsavedChangesDialog({ guard }: { guard: UnsavedChangesGuard }) {
  return (
    <AlertDialog open={guard.showPrompt} onOpenChange={(open) => { if (!open) guard.cancelLeave(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Unsaved changes
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes on this page. If you leave now, your edits will be lost.
            Save your changes first, or leave anyway to discard them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={guard.cancelLeave}>Stay on this page</AlertDialogCancel>
          <AlertDialogAction
            onClick={guard.confirmLeave}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Leave anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
