/**
 * Academic display helpers shared across pages.
 *
 * `formatFinalCgpa` is the single source of truth for the "Final CGPA" shown on
 * BOTH the Student details and Alumni details pages. They render the same
 * student record, so they must never disagree — keeping the computation here
 * means a change lands in both places at once.
 */

interface FinalCgpaInput {
  finalCgpa?: number | string | null;
  semesterResults?: Array<{ cgpa?: number | string | null }> | null;
}

/**
 * The Final CGPA for a student, as a display string:
 *   1. the stored cumulative `finalCgpa`, formatted to 2 decimals; else
 *   2. the last semester result's `cgpa` (whatever precision it carries); else
 *   3. the `empty` placeholder.
 */
export function formatFinalCgpa(student: FinalCgpaInput | null | undefined, empty = '—'): string {
  if (!student) return empty;

  const raw = student.finalCgpa;
  if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
    const n = Number(raw);
    return Number.isFinite(n) ? n.toFixed(2) : empty;
  }

  const results = student.semesterResults;
  if (results && results.length > 0) {
    const last = results[results.length - 1];
    if (last?.cgpa !== null && last?.cgpa !== undefined) return String(last.cgpa);
  }

  return empty;
}
