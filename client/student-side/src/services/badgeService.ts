/**
 * Sidebar unread-badge service.
 *
 * Talks to the shared backend badge engine:
 *   GET  /badges/       -> { counts: { module: n, ... } }
 *   POST /badges/seen/  -> mark a module opened (resets its badge)
 */
import api from '@/lib/api';

export type BadgeCounts = Record<string, number>;

export const badgeService = {
  async getBadges(): Promise<BadgeCounts> {
    const res = await api.get<{ counts?: BadgeCounts }>('/badges/');
    return res?.counts ?? {};
  },

  async markSeen(module: string): Promise<void> {
    await api.post('/badges/seen/', { module });
  },
};
