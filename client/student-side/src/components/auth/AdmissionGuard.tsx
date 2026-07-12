/**
 * AdmissionGuard — shared banner + hook used across all student pages
 * to handle users who haven't completed admission.
 *
 * HOW TO CHANGE THE TEXT:
 *   Edit the strings in BANNER_TEXT below — the change will apply on every page.
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ─── Edit these strings to update the banner text on ALL pages at once ───────
const BANNER_TEXT = {
  notStarted: {
    title: 'Admission Not Completed',
    description: (
      <>
        তুমি এখনও এডমিশন কম্পিলিট করো নি, এডমিশন কম্পিলিট না করলে কোন ফিচার ব্যবহার করতে
        পারবে নাহ। তাই এডমিশন দ্রুত কম্পিলিট করো। কিভাবে করতে হবে বুঝতে না পারলে{' '}
        <a
          href="https://youtu.be/KmFUuvslHds?si=bLcBP8uWKAGi6kr8"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-900 hover:text-amber-950"
        >
          এখানে ক্লিক করো, ভিডিও টিউটোরিয়াল পাবে।
        </a>
      </>
    ),
    button: 'Complete Admission',
  },
  pending: {
    title: 'Admission Under Review',
    description: (
      <>তোমার এডমিশন আবেদন পর্যালোচনা করা হচ্ছে। অনুমোদনের পরে সব ডেটা দেখা যাবে।</>
    ),
    button: 'View Status',
  },
};
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the user's admission is not yet complete. */
export function useAdmissionIncomplete(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role === 'teacher') return false;

  const isValidUUID =
    user.relatedProfileId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      user.relatedProfileId
    );

  return (
    !isValidUUID ||
    user.admissionStatus === 'not_started' ||
    user.admissionStatus === 'pending'
  );
}

/** Returns true if profileId is a valid UUID — safe to use in API calls. */
export function useValidProfileId(): string | null {
  const { user } = useAuth();
  const id = user?.relatedProfileId ?? null;
  if (!id) return null;
  const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return ok ? id : null;
}

/** The amber banner — drop it at the top of any page JSX. */
export function AdmissionBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPending = user?.admissionStatus === 'pending';
  const text = isPending ? BANNER_TEXT.pending : BANNER_TEXT.notStarted;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-amber-900 text-sm">{text.title}</p>
        <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">{text.description}</p>
      </div>

      <button
        onClick={() => navigate('/dashboard/admission')}
        className="flex-shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
      >
        {text.button}
      </button>
    </motion.div>
  );
}

/**
 * Wrap a page's content with this component.
 * When admission is incomplete:
 *   - Shows the banner at the top
 *   - Renders children with reduced opacity so the layout is visible but
 *     clearly unavailable
 *
 * Usage:
 *   <AdmissionGuard>
 *     <YourPageContent />
 *   </AdmissionGuard>
 */
export function AdmissionGuard({ children }: { children: React.ReactNode }) {
  const incomplete = useAdmissionIncomplete();

  return (
    <div className="space-y-4">
      {incomplete && <AdmissionBanner />}
      <div className={incomplete ? 'opacity-40 pointer-events-none select-none' : ''}>
        {children}
      </div>
    </div>
  );
}
