/**
 * Google Sign-In helper (student portal)
 *
 * Loads Google Identity Services (GIS) on demand and, on a user gesture, opens
 * the Google account-chooser popup to obtain an OAuth 2.0 **access token**. That
 * token is sent to our backend (`POST /auth/google/`), which verifies it with
 * Google and reads the person's verified email + name.
 *
 * We deliberately use the access-token flow (`initTokenClient`) rather than
 * One Tap so the existing custom-styled "Continue with Google" button can open
 * the popup directly on click.
 */

/** OAuth Web Client ID, injected at build time. Empty string when unconfigured. */
export const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

/** Whether the "Continue with Google" button should be shown at all. */
export const isGoogleSignInEnabled = (): boolean => GOOGLE_CLIENT_ID.trim().length > 0;

const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Minimal typings for the slice of GIS we use (avoids pulling in @types/google.accounts).
interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}
interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Inject the GIS script once and resolve when it is ready. */
function loadGoogleScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In.')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow a retry on the next attempt
      reject(new Error('Failed to load Google Sign-In.'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/** Thrown when the user closes the popup or Google reports an error. */
export class GoogleSignInCancelled extends Error {
  constructor(message = 'Google sign-in was cancelled.') {
    super(message);
    this.name = 'GoogleSignInCancelled';
  }
}

/**
 * Open the Google popup and resolve with an OAuth access token.
 * Must be called from within a user-gesture handler (e.g. a button click) so
 * the browser allows the popup.
 */
export async function requestGoogleAccessToken(): Promise<string> {
  if (!isGoogleSignInEnabled()) {
    throw new Error('Google sign-in is not configured.');
  }

  await loadGoogleScript();

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error('Google Sign-In is unavailable. Please try again.');
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (resp) => {
        if (settled) return;
        settled = true;
        if (resp.error || !resp.access_token) {
          reject(new GoogleSignInCancelled(resp.error_description || resp.error || undefined));
          return;
        }
        resolve(resp.access_token);
      },
      error_callback: (err) => {
        if (settled) return;
        settled = true;
        reject(new GoogleSignInCancelled(err?.message));
      },
    });

    client.requestAccessToken();
  });
}
