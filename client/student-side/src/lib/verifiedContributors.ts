/**
 * Verified Project Contributors — single source of truth.
 * ------------------------------------------------------
 * The official student developers who built this platform. Any UI that
 * renders a student name can pass the roll number to <VerifiedBadge /> and
 * the badge + contributor popover appear automatically when it matches.
 *
 * To add a new verified contributor, append one entry here — no component
 * or page changes required. (The admin panel keeps its own copy of this
 * file; update both when the roster changes.)
 */

export interface VerifiedContributor {
  /** Current/board roll number — the identity key used across the system. */
  roll: string;
  name: string;
  role: string;
  contributions: string[];
}

export const VERIFIED_CONTRIBUTORS: VerifiedContributor[] = [
  {
    roll: '830577',
    name: 'Md Mahadi Hasan',
    role: 'Team Leader',
    contributions: [
      'Project planning',
      'Task assignment',
      'Team coordination',
      'Website development',
      'Final decision making',
    ],
  },
  {
    roll: '822566',
    name: 'Md. Zunaiyed Hafiz',
    role: 'Resource Manager',
    contributions: [
      'Server research',
      'Server setup & deployment',
      'ISP & network management',
      'Tools & resource management',
    ],
  },
  {
    roll: '822557',
    name: 'Salman Farsi',
    role: 'Technical Lead & Security Auditor',
    contributions: [
      'Technical architecture',
      'Security testing',
      'Performance optimization',
      'Technical support & troubleshooting',
    ],
  },
  {
    roll: '822553',
    name: 'Md. Toufiq Talukder',
    role: 'Project Monitor & Quality Assurance (QA)',
    contributions: [
      'Progress monitoring',
      'Website retesting',
      'Quality assurance',
      'Final testing',
    ],
  },
];

const BY_ROLL = new Map(VERIFIED_CONTRIBUTORS.map((c) => [c.roll, c]));

/** Look up a contributor by roll number (tolerates non-string / padded input). */
export function getVerifiedContributor(
  roll: string | number | null | undefined,
): VerifiedContributor | undefined {
  if (roll === null || roll === undefined) return undefined;
  return BY_ROLL.get(String(roll).trim());
}
