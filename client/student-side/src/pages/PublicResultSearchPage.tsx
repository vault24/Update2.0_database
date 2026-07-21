/**
 * Public Result Search — SPA wrapper around the shared portal experience.
 *
 * The same application serves every result URL:
 *   - result.spisg.gov.bd            (standalone entry, result.html)
 *   - /result, /results, /bteb-result (these SPA routes; in production nginx
 *     301s them to the canonical subdomain — this wrapper covers local dev
 *     and client-side navigation)
 */
import { PortalExperience } from '@/components/portal/PortalExperience';

export default function PublicResultSearchPage() {
  return <PortalExperience />;
}
