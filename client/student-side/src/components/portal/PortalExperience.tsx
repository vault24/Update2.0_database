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
  ExternalLink,
  FileText,
  GraduationCap,
  Landmark,
  Loader2,
  LogIn,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ResultHistory } from '@/components/results/ResultHistory';
import { RoutineDialog } from '@/components/results/RoutineDialog';
import {
  MotivationSlide,
  QUOTE_CHANGE,
  QUOTE_STRIVE,
} from '@/components/results/MotivationSlide';
import resultService, {
  RecentExam,
  RollSearchResponse,
} from '@/services/resultService';

/**
 * Brand mark. Uses the uploaded BTEB seal at /bteb-logo.png when present,
 * and falls back to an emerald graduation-cap badge so the header always
 * renders (drop the file into public/bteb-logo.png to activate the seal).
 */
function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`flex items-center justify-center rounded-lg bg-emerald-600 ${className}`}>
        <GraduationCap className="h-[60%] w-[60%] text-white" aria-hidden />
      </span>
    );
  }
  return (
    <img
      src="/bteb-logo.png"
      alt="Bangladesh Technical Education Board"
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

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

// Canonical portal metadata. Applied at runtime so the tab title, canonical
// URL and social tags are correct even when the origin served the student
// index.html shell instead of the dedicated result.html (host-detected
// render). Kept in sync with result.html's static <head>.
const PORTAL_TITLE =
  'BTEB Result – Diploma & Polytechnic Semester Result Search by Roll';
const PORTAL_DESCRIPTION =
  'Check your BTEB result instantly by roll number. Diploma in Engineering ' +
  'semester results, GPA history, CGPA and referred subjects for every ' +
  'polytechnic institute in Bangladesh — free, fast and from official BTEB notices.';
const PORTAL_URL = 'https://result.spisg.gov.bd/';

function upsertTag(
  selector: string,
  create: () => HTMLElement,
  attr: string,
  value: string,
) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function applyPortalMetadata() {
  document.title = PORTAL_TITLE;
  upsertTag(
    'link[rel="canonical"]',
    () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    },
    'href',
    PORTAL_URL,
  );
  const metas: [string, string, string][] = [
    ['meta[name="description"]', 'name=description', PORTAL_DESCRIPTION],
    ['meta[property="og:title"]', 'property=og:title', PORTAL_TITLE],
    ['meta[property="og:description"]', 'property=og:description', PORTAL_DESCRIPTION],
    ['meta[property="og:url"]', 'property=og:url', PORTAL_URL],
    ['meta[name="twitter:title"]', 'name=twitter:title', PORTAL_TITLE],
    ['meta[name="twitter:description"]', 'name=twitter:description', PORTAL_DESCRIPTION],
  ];
  for (const [selector, spec, value] of metas) {
    const [attr, key] = spec.split('=');
    upsertTag(
      selector,
      () => {
        const m = document.createElement('meta');
        m.setAttribute(attr, key);
        return m;
      },
      'content',
      value,
    );
  }
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
  const [routineOpen, setRoutineOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (target: string, updateUrl = true) => {
    const trimmed = target.trim();
    if (!ROLL_PATTERN.test(trimmed)) {
      setError('Please enter a valid numeric board roll number (4–10 digits).');
      return;
    }
    // Dismiss the mobile keyboard as the search begins.
    inputRef.current?.blur();
    setError('');
    setSearching(true);
    try {
      const response = await resultService.searchRoll(trimmed);
      setResult(response);
      setRoll(trimmed);
      if (response.found) setRecent(pushRecent(trimmed));
      if (updateUrl) syncUrl(trimmed);
      // Bring the result into view from the top on mobile.
      requestAnimationFrame(() =>
        window.scrollTo({ top: 0, behavior: 'smooth' }),
      );
    } catch {
      setError('Search is temporarily unavailable. Please try again in a minute.');
    } finally {
      setSearching(false);
    }
  }, []);

  // On mobile, gently lift the page when the search box gains focus so the
  // on-screen keyboard doesn't cover it.
  const handleSearchFocus = useCallback(() => {
    if (window.matchMedia('(max-width: 640px)').matches) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
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

  // Own the document metadata so the tab title / canonical / social tags are
  // the portal's — even when the origin served the student index.html shell.
  useEffect(() => {
    applyPortalMetadata();
  }, []);

  // Reflect the current result in the tab title (nice shareable-link titles).
  useEffect(() => {
    document.title = result?.found
      ? `Roll ${result.roll} — BTEB Result`
      : PORTAL_TITLE;
  }, [result]);

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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <a
            href={standalone ? '/' : '/results'}
            className="flex items-center gap-2 font-bold"
            onClick={(event) => {
              event.preventDefault();
              clearResult();
            }}
          >
            <LogoMark />
            <span>
              BTEB Result
              <span className="ml-1.5 hidden text-xs font-normal text-muted-foreground sm:inline">
                by Sirajganj Polytechnic Institute
              </span>
            </span>
          </a>
          <nav aria-label="Portal">
            <a href="https://spisg.gov.bd/" className="portal-login-btn group">
              <span className="portal-login-shine" aria-hidden />
              <LogIn className="h-4 w-4" aria-hidden />
              <span>Login to My SGPI</span>
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
              onFocus={handleSearchFocus}
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

          {/* Motivational verses — shown under the search on the landing,
              hidden once a result is on screen. */}
          {showLanding && (
            <div className="mx-auto mt-6 max-w-2xl">
              <MotivationSlide quotes={[QUOTE_STRIVE, QUOTE_CHANGE]} />
            </div>
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
                  onRoutine: result.found ? () => setRoutineOpen(true) : undefined,
                }}
              />
            </div>
          </section>
        )}

        {result?.found && (
          <RoutineDialog roll={result.roll} open={routineOpen} onOpenChange={setRoutineOpen} />
        )}

        {showLanding && (
          <>
            <RecentExams exams={exams} />
            <AboutSection />
          </>
        )}
      </main>

      <footer className="portal-no-print border-t bg-emerald-50/50 dark:bg-emerald-950/20">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <LogoMark className="h-8 w-8" />
                BTEB Result
              </div>
              <p className="text-sm text-muted-foreground">
                Search Bangladesh Technical Education Board diploma &amp;
                polytechnic semester results by roll number — free, fast, and
                taken straight from the official BTEB result notices.
              </p>
            </div>

            <nav aria-label="Quick links">
              <h3 className="mb-3 text-sm font-semibold">Quick Links</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href={standalone ? '/' : '/results'} className="transition-colors hover:text-emerald-600">
                    Result Search
                  </a>
                </li>
                <li>
                  <a href="https://spisg.gov.bd/" className="inline-flex items-center gap-1 transition-colors hover:text-emerald-600">
                    Login to My SGPI <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </li>
                <li>
                  <a href="https://spisg.gov.bd/" className="inline-flex items-center gap-1 transition-colors hover:text-emerald-600">
                    Institute Website <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label="Resources">
              <h3 className="mb-3 text-sm font-semibold">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="http://www.bteb.gov.bd/" className="inline-flex items-center gap-1 transition-colors hover:text-emerald-600">
                    BTEB Official <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </li>
                <li>How to check your result</li>
                <li>Understanding referred subjects</li>
              </ul>
            </nav>

            <div>
              <h3 className="mb-3 text-sm font-semibold">Institute</h3>
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                Sirajganj Polytechnic Institute,
                <br />
                Sirajganj, Bangladesh
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-emerald-100 pt-5 text-xs text-muted-foreground dark:border-emerald-900/40 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Results from officially published BTEB notices. Not affiliated
              with BTEB — for corrections, contact your institute.
            </p>
            <p>
              © {new Date().getFullYear()}{' '}
              <a href="https://spisg.gov.bd/" className="font-medium hover:text-emerald-600">
                Sirajganj Polytechnic Institute
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/*
        Print: only the result cards, on clean white paper with no wasted
        space or blank trailing pages. We neutralise the full-height gradient
        wrapper, drop shadows, keep each semester card whole, and let the
        browser flow exactly the printed content — nothing else.
      */}
      <style>{`
        /* Animated "Login to My SGPI" button */
        .portal-login-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          overflow: hidden;
          border-radius: 9999px;
          padding: 0.5rem 1.1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(110deg, #059669 0%, #0d9488 50%, #10b981 100%);
          background-size: 200% 100%;
          box-shadow: 0 6px 18px -6px rgba(5, 150, 105, 0.55);
          transition: transform 0.2s ease, box-shadow 0.2s ease, background-position 0.6s ease;
          animation: portal-login-glow 3s ease-in-out infinite;
          white-space: nowrap;
        }
        .portal-login-btn:hover {
          transform: translateY(-1px) scale(1.04);
          background-position: 100% 0;
          box-shadow: 0 10px 24px -6px rgba(5, 150, 105, 0.7);
        }
        .portal-login-btn:active { transform: translateY(0) scale(0.99); }
        .portal-login-shine {
          position: absolute;
          inset: 0;
          transform: translateX(-120%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
        }
        .portal-login-btn:hover .portal-login-shine {
          transition: transform 0.7s ease;
          transform: translateX(120%);
        }
        @keyframes portal-login-glow {
          0%, 100% { box-shadow: 0 6px 18px -6px rgba(5, 150, 105, 0.45); }
          50% { box-shadow: 0 8px 22px -4px rgba(16, 185, 129, 0.75); }
        }
        @media (prefers-reduced-motion: reduce) {
          .portal-login-btn { animation: none; }
        }

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
