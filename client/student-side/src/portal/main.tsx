/**
 * Standalone entry for the public BTEB Result portal (result.html).
 *
 * Deliberately minimal: no router, no auth context, no PWA service worker —
 * just the shared PortalExperience. This keeps the bundle small (fast Core
 * Web Vitals) and the page fully public.
 */
import { createRoot } from 'react-dom/client';
import { PortalExperience } from '@/components/portal/PortalExperience';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <PortalExperience standalone />,
);
