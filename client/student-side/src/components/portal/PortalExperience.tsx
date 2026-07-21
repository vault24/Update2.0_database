/**
 * The public BTEB Result portal — the complete search experience.
 *
 * Rendered in two places so every URL serves the same application:
 *   - the dedicated portal entry (result.html → result.spisg.gov.bd)
 *   - the student SPA routes /result, /results, /bteb-result (dev + client
 *     navigation; in production nginx 301s these to the canonical subdomain)
 *
 * UX goals: instant search (indexed DB lookup, <300ms server-side), shareable
 * links (?roll= synced to the URL), recent searches, print + PDF download,
 * semantic accessible markup that doubles as the SEO surface.
 */
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  GraduationCap,
  Landmark,
  Loader2,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ResultHistory } from '@/components/results/ResultHistory';
import resultService, {
  RecentExam,
  RollSearchResponse,
} from '@/services/resultService';

const RECENT_KEY = 'portal.recentSearches';
const MAX_RECENT = 8;
const ROLL_PATTERN = /^\d{4,10}$/;

function loadRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((r) => typeof r === 'string') : [];
  } catch {
    return [];
  }
}

function pushRecent(roll: string): string[] {
  const next = [roll, ...loadRecent().filter((r) => r !== roll)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode) — recents just don't persist.
  }
  return next;
}

function rollFromUrl(): string {
  return new URLSearchParams(window.location.search).get('roll') ?? '';
}

function syncUrl(roll: string | null) {
  const url = new URL(window.location.href);
  if (roll) url.searchParams.set('roll', roll);
  else url.searchParams.delete('roll');
  window.history.pushState({}, '', url);
}

function ordinal(n: number): string {
  const map: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };
  return map[n] ?? `${n}th`;
}

/** Landing strip: recently published examinations. */
function RecentExams({ exams }: { exams: RecentExam[] }) {
  if (exams.length === 0) return null;
  return (
    <section aria-labelledby="recent-exams-heading" className="mt-10">
      <h2
        id="recent-exams-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Recently Published Results
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {exams.slice(0, 4).map((exam) => (
          <Card
            key={`${exam.semester}-${exam.regulationYear}-${exam.heldIn}`}
            className="border-emerald-100 transition-shadow hover:shadow-md dark:border-emerald-900/40"
          >
            <CardContent className="p-4">
              <p className="font-semibold">
                {ordinal(exam.semester)} Semester
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                  {exam.regulationYear} Regulation
                </span>
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{exam.program}</p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {exam.publicationDate ?? '—'}
                </span>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">
                  {exam.resultCount.toLocaleString()} results
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/** Trust strip under the hero search. */
function TrustStrip() {
  const items = [
    { icon: Zap, text: 'Instant search' },
    { icon: ShieldCheck, text: 'From official BTEB notices' },
    { icon: Landmark, text: 'Sirajganj Polytechnic Institute' },
  ];
  return (
    <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground sm:text-sm">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          {text}
        </li>
      ))}
    </ul>
  );
}

/** SEO / helper content shown on the landing view only. */
function AboutSection() {
  return (
    <section aria-labelledby="about-heading" className="portal-no-print mt-14 border-t pt-8">
      <h2 id="about-heading" className="text-lg font-bold">
        About BTEB Diploma Result Search
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Search Bangladesh Technical Education Board (BTEB) diploma results by
        roll number — semester GPA, CGPA, referred subjects and your complete
        polytechnic result history in one place. Results are imported from the
        officially published BTEB result notices, so what you see here matches
        the board's gazette exactly. The search works for students of every
        polytechnic institute in Bangladesh, on any device, free of charge.
      </p>

      <h2 className="mt-8 text-lg font-bold">Frequently Asked Questions</h2>
      <div className="mt-3 max-w-3xl space-y-2">
        <details className="group rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            How do I check my BTEB diploma result?
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Type your board roll number in the search box above and press
            Search. Your semester result, GPA history, CGPA and any referred
            subjects appear instantly — no account or registration needed.
          </p>
        </details>
        <details className="group rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Which semesters and regulations are covered?
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Every semester result the board has published for your roll —
            including older regulations — is shown together as one history,
            with the CGPA when your final semester result is out.
          </p>
        </details>
        <details className="group rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            What does “referred” mean in a BTEB result?
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Referred means you must clear the listed subjects in a later exam.
            The referred subject codes are shown with your result, along with
            the semesters they belong to.
          </p>
        </details>
        <details className="group rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Can I download or print my result?
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Yes — after searching, use the Download PDF button for a clean
            transcript-style copy, or Print for a paper copy. You can also
            share the link directly with family or your institute.
          </p>
        </details>
      </div>
    </section>
  );
}

export function PortalExperience({ standalone = false }: { standalone?: boolean }) {
  const [roll, setRoll] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RollSearchResponse | null>(null);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [exams, setExams] = useState<RecentExam[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (target: string, updateUrl = true) => {
    const trimmed = target.trim();
    if (!ROLL_PATTERN.test(trimmed)) {
      setError('Please enter a valid numeric board roll number (4–10 digits).');
      return;
    }
    setError('');
    setSearching(true);
    try {
      const response = await resultService.searchRoll(trimmed);
      setResult(response);
      setRoll(trimmed);
      if (response.found) setRecent(pushRecent(trimmed));
      if (updateUrl) syncUrl(trimmed);
    } catch {
      setError('Search is temporarily unavailable. Please try again in a minute.');
    } finally {
      setSearching(false);
    }
  }, []);

  // Shareable links: ?roll= auto-searches on load; browser Back works.
  useEffect(() => {
    const initial = rollFromUrl();
    if (ROLL_PATTERN.test(initial)) {
      setRoll(initial);
      runSearch(initial, false);
    }
    const onPop = () => {
      const fromUrl = rollFromUrl();
      if (ROLL_PATTERN.test(fromUrl)) runSearch(fromUrl, false);
      else setResult(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [runSearch]);

  useEffect(() => {
    resultService.getRecentExams().then(setExams).catch(() => {});
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    runSearch(roll);
  };

  const clearResult = () => {
    setResult(null);
    setError('');
    syncUrl(null);
    inputRef.current?.focus();
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `BTEB Result — Roll ${result?.roll}`, url });
        return;
      }
    } catch {
      // fall through to clipboard (user may have dismissed the sheet)
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the link — copy it from the address bar.');
    }
  };

  const download = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      await resultService.downloadResultPdf(result.roll);
    } catch {
      setError('PDF download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const showLanding = result === null;

  return (
    <div className="portal-root min-h-screen bg-gradient-to-b from-emerald-50 via-background to-background dark:from-emerald-950/30">
      {/* Header */}
      <header className="portal-no-print border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a
            href={standalone ? '/' : '/results'}
            className="flex items-center gap-2 font-bold"
            onClick={(event) => {
              event.preventDefault();
              clearResult();
            }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <GraduationCap className="h-5 w-5 text-white" aria-hidden />
            </span>
            <span>
              BTEB Result
              <span className="ml-1.5 hidden text-xs font-normal text-muted-foreground sm:inline">
                by Sirajganj Polytechnic Institute
              </span>
            </span>
          </a>
          <nav aria-label="Portal">
            <a
              href="https://spisg.gov.bd/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Student Portal
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16">
        {/* Hero + search — always visible so a new search is one tap away */}
        <section
          aria-labelledby="search-heading"
          className={`portal-no-print ${showLanding ? 'pt-12 sm:pt-20' : 'pt-6'}`}
        >
          {showLanding && (
            <div className="mb-7 text-center">
              <h1
                id="search-heading"
                className="text-3xl font-extrabold tracking-tight sm:text-5xl"
              >
                BTEB Result <span className="text-emerald-600">Search</span>
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Diploma &amp; polytechnic semester results for every institute in
                Bangladesh — GPA history, CGPA and referred subjects, straight
                from the official BTEB result notices.
              </p>
            </div>
          )}

          <form
            onSubmit={submit}
            role="search"
            aria-label="Result search"
            className="mx-auto flex max-w-2xl gap-2"
          >
            <label htmlFor="portal-roll" className="sr-only">
              Board roll number
            </label>
            <input
              id="portal-roll"
              ref={inputRef}
              value={roll}
              onChange={(event) => setRoll(event.target.value.replace(/\D/g, ''))}
              placeholder="Enter your board roll number…"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              className="w-full rounded-xl border-2 border-emerald-200 bg-background px-4 py-3.5 text-base shadow-sm outline-none transition-colors focus:border-emerald-500 dark:border-emerald-900"
            />
            <Button
              type="submit"
              disabled={searching}
              className="h-auto rounded-xl bg-emerald-600 px-5 text-base hover:bg-emerald-700"
            >
              {searching ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Search className="h-5 w-5" aria-hidden />
              )}
              <span className="ml-1.5 hidden sm:inline">Search</span>
            </Button>
          </form>

          {error && (
            <p role="alert" className="mx-auto mt-3 max-w-2xl text-center text-sm text-red-600">
              {error}
            </p>
          )}

          {recent.length > 0 && showLanding && (
            <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-1.5">
              <span className="text-xs text-muted-foreground">Recent:</span>
              {recent.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => runSearch(entry)}
                  className="rounded-full border border-emerald-200 px-3 py-1 text-xs text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                >
                  {entry}
                </button>
              ))}
            </div>
          )}

          {showLanding && <TrustStrip />}
        </section>

        {/* Result view */}
        {result && (
          <section aria-label="Search result" className="mt-8">
            <div className="portal-no-print mb-4">
              <Button variant="ghost" size="sm" onClick={clearResult}>
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
                New search
              </Button>
            </div>
            <div className="portal-print-area">
              <ResultHistory
                data={result}
                actions={{
                  onDownload: download,
                  downloading,
                  onShare: share,
                  shareLabel: copied ? 'Link copied' : 'Share',
                  onPrint: () => window.print(),
                }}
              />
            </div>
          </section>
        )}

        {showLanding && (
          <>
            <RecentExams exams={exams} />
            <AboutSection />
          </>
        )}
      </main>

      <footer className="portal-no-print border-t py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Results from officially published BTEB notices. For corrections,
            contact your institute.
          </p>
          <p>
            © {new Date().getFullYear()}{' '}
            <a href="https://spisg.gov.bd/" className="hover:text-foreground">
              Sirajganj Polytechnic Institute
            </a>
          </p>
        </div>
      </footer>

      {/*
        Print: only the result cards, on clean white paper with no wasted
        space or blank trailing pages. We neutralise the full-height gradient
        wrapper, drop shadows, keep each semester card whole, and let the
        browser flow exactly the printed content — nothing else.
      */}
      <style>{`
        @media print {
          @page { margin: 14mm; }
          html, body { background: #fff !important; }
          /* Collapse the app chrome so only the result cards remain. */
          .portal-no-print { display: none !important; }
          .portal-root {
            min-height: 0 !important;
            background: none !important;
          }
          .portal-root main { padding: 0 !important; max-width: none !important; }
          .portal-print-area { margin: 0 !important; }
          .portal-print-area > div { gap: 8px !important; }
          /* Result header + cards: flat, ink-friendly, page-break aware. */
          .result-card {
            break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
          .result-card * { color: #0f172a !important; }
          .result-card .text-emerald-600,
          .result-card .text-emerald-600 * { color: #047857 !important; }
          .result-card .text-red-600,
          .result-card .text-red-500,
          .result-card .text-red-700 { color: #b91c1c !important; }
        }
      `}</style>
    </div>
  );
}
