/**
 * Sidebar unread-badge service (admin portal).
 *
 * Talks to the shared backend badge engine:
 *   GET  /badges/       -> { counts: { module: n, ... } }
 *   POST /badges/seen/  -> mark a module opened (resets its badge)
 */
import { apiClient } from '@/lib/api';

export type BadgeCounts = Record<string, number>;

export const badgeService = {
  async getBadges(): Promise<BadgeCounts> {
    const res = await apiClient.get<{ counts?: BadgeCounts }>('/badges/');
    return res?.counts ?? {};
  },

  async markSeen(module: string): Promise<void> {
    await apiClient.post('/badges/seen/', { module });
  },
};
