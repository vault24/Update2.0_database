/**
 * Board Results.
 *
 * - "My Results": hero card (final CGPA / latest status) + per-semester
 *   history, fed automatically whenever the institute imports a BTEB PDF.
 * - "Friends": the whole class's latest results (same department + semester
 *   + shift), auto-populated — no roll typing. A button links to the public
 *   portal for searching any other roll.
 * - Teachers get a roll-search view instead (no personal result, no class).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BookmarkPlus,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Loader2,
  Search,
  Sparkles,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { toast } from 'sonner';
import {
  ResultHistory,
  ResultSummaryDialog,
  letterGrade,
} from '@/components/results/ResultHistory';
import {
  MotivationSlide,
  QUOTE_CHANGE,
  QUOTE_STRIVE,
} from '@/components/results/MotivationSlide';
import resultService, {
  ClassmatesResponse,
  RollSearchResponse,
} from '@/services/resultService';
import { useAuth } from '@/contexts/AuthContext';

const FRIENDS_KEY = 'boardResults.savedFriends';

interface SavedFriend {
  roll: string;
  label: string;
}

function loadFriends(): SavedFriend[] {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFriends(friends: SavedFriend[]) {
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  } catch {
    // localStorage full/blocked — the list just won't persist.
  }
}

/** Gradient hero: final CGPA + latest exam status at a glance.
 *  Green for passed; red for referred/failed — with an encouraging note. */
function ResultHero({ data }: { data: RollSearchResponse }) {
  const latest = data.results[0];
  if (!latest) return null;

  const styles = {
    passed: {
      gradient: 'from-emerald-600 via-emerald-600 to-teal-700 shadow-emerald-600/20',
      soft: 'text-emerald-100',
      title: 'Passed',
      note: 'Congratulations — keep it up!',
    },
    referred: {
      gradient: 'from-rose-600 via-red-600 to-red-700 shadow-red-600/20',
      soft: 'text-rose-100',
      title: 'Referred',
      note: 'You can clear these subjects — keep striving.',
    },
    other: {
      gradient: 'from-rose-600 via-red-600 to-red-700 shadow-red-600/20',
      soft: 'text-rose-100',
      title: 'Needs Attention',
      note: 'Check the details below and talk to your department.',
    },
  } as const;
  const style =
    latest.resultType === 'passed'
      ? styles.passed
      : latest.resultType === 'referred'
        ? styles.referred
        : styles.other;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg sm:p-6 ${style.gradient}`}
    >
      <Sparkles className="absolute -right-4 -top-4 h-24 w-24 text-white/10" />
      <p className={`text-sm ${style.soft}`}>Roll {data.roll}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`text-xs uppercase tracking-wide ${style.soft}`}>
            Latest — Semester {latest.exam.semester} ({latest.exam.regulationYear} Reg.)
          </p>
          <p className="mt-1 text-2xl font-bold">{style.title}</p>
          <p className={`mt-0.5 text-sm ${style.soft}`}>{style.note}</p>
        </div>
        {data.finalCgpa && (
          <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur-sm">
            <p className={`text-[11px] uppercase tracking-wide ${style.soft}`}>Final CGPA</p>
            <p className="text-3xl font-extrabold">{data.finalCgpa}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MyResultsTab() {
  const [data, setData] = useState<RollSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await resultService.getMyResults();
        if (!cancelled) setData(response);
      } catch {
        if (!cancelled) setError('Could not load your board results. Please try again later.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading results…
      </div>
    );
  }
  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }
  if (!data) return null;
  const latestType = data.results[0]?.resultType;
  const quotes =
    latestType === 'passed'
      ? [QUOTE_STRIVE]
      : [QUOTE_CHANGE, QUOTE_STRIVE];
  return (
    <div className="space-y-4">
      {data.found && <ResultHero data={data} />}
      {data.found && <MotivationSlide quotes={quotes} />}
      {/* Dashboard = minimal: no published-date chips, just GPA + trend + rank. */}
      <ResultHistory data={data} showHeader={false} dense />
    </div>
  );
}

/** Teacher view: search any student's result by roll, with a saved list. */
function RollSearchView() {
  const [friends, setFriends] = useState<SavedFriend[]>(loadFriends);
  const [roll, setRoll] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<RollSearchResponse | null>(null);

  const noun = 'student';
  const savedLabel = 'Saved rolls';

  const isSaved = useMemo(
    () => result !== null && friends.some((f) => f.roll === result.roll),
    [friends, result],
  );

  const search = async (targetRoll?: string) => {
    const trimmed = (targetRoll ?? roll).trim();
    if (!/^\d{4,10}$/.test(trimmed)) {
      toast.error('Enter a valid numeric roll number');
      return;
    }
    setRoll(trimmed);
    setSearching(true);
    try {
      setResult(await resultService.searchRoll(trimmed));
    } catch {
      toast.error('Search failed — please try again in a minute.');
    } finally {
      setSearching(false);
    }
  };

  const saveCurrent = () => {
    if (!result || !result.found) return;
    const label = result.institute?.name?.split(',')[0] ?? '';
    const next = [...friends, { roll: result.roll, label }];
    setFriends(next);
    saveFriends(next);
    toast.success(`Roll ${result.roll} saved`);
  };

  const removeFriend = (target: string) => {
    const next = friends.filter((f) => f.roll !== target);
    setFriends(next);
    saveFriends(next);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex gap-2">
            <Input
              value={roll}
              onChange={(event) => setRoll(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && search()}
              placeholder="Student's board roll number"
              inputMode="numeric"
              aria-label={`${noun}'s board roll number`}
            />
            <Button onClick={() => search()} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">Search</span>
            </Button>
          </div>

          {friends.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">
                {savedLabel}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {friends.map((friend) => (
                  <Badge
                    key={friend.roll}
                    variant="outline"
                    className="cursor-pointer gap-1 border-emerald-300 py-1 pl-2.5 pr-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                    onClick={() => search(friend.roll)}
                    title={friend.label || undefined}
                  >
                    {friend.roll}
                    <button
                      type="button"
                      aria-label={`Remove ${friend.roll}`}
                      className="rounded-full p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-800"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFriend(friend.roll);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-3">
          {result.found && !isSaved && (
            <Button variant="outline" size="sm" onClick={saveCurrent}>
              <BookmarkPlus className="mr-1.5 h-4 w-4" />
              Save roll {result.roll}
            </Button>
          )}
          <ResultHistory data={result} />
        </div>
      )}

      {!result && friends.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Search a {noun}'s roll number to see their result, and save it for
            quick checking after every publication.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** One classmate's compact current-semester card. Tap to see full history. */
function FriendCard({
  friend,
  onOpen,
}: {
  friend: ClassmatesResponse['friends'][number];
  onOpen: (friend: ClassmatesResponse['friends'][number]) => void;
}) {
  const initials = friend.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const gpaValue = friend.gpa != null ? parseFloat(friend.gpa) : null;

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(friend)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(friend)}
    >
      <CardContent className="flex items-center gap-3 p-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
          {initials || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {friend.name}
            <VerifiedBadge roll={friend.roll} size={14} className="ml-1" />
          </p>
          <p className="text-xs text-muted-foreground">Roll : {friend.roll}</p>
          {friend.resultType && friend.resultType !== 'passed' && friend.subjectCodes.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {friend.subjectCodes.map((code) => (
                <span
                  key={code}
                  className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400"
                >
                  {code}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          {gpaValue != null ? (
            <>
              <p className="flex items-center justify-end gap-1 text-lg font-extrabold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {friend.gpa}
              </p>
              <p className="text-xs text-muted-foreground">
                {letterGrade(gpaValue)}
                {friend.semester && ` · ${friend.semester} sem`}
              </p>
            </>
          ) : friend.resultType ? (
            <p className="flex items-center gap-1 text-sm font-semibold text-red-600">
              <XCircle className="h-4 w-4" aria-hidden />
              {friend.resultType === 'referred' || friend.resultType === 'failed'
                ? `${friend.subjectCodes.length} due`
                : 'Pending'}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No result yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Students' Friends tab: the whole class's latest results, auto-populated. */
function FriendsTab() {
  const [data, setData] = useState<ClassmatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Full-history popup for a tapped friend.
  const [detail, setDetail] = useState<RollSearchResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const openFriend = async (friend: ClassmatesResponse['friends'][number]) => {
    if (!friend.resultType) {
      toast.info(`${friend.name} has no published result yet.`);
      return;
    }
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await resultService.searchRoll(friend.roll));
    } catch {
      toast.error('Could not load the full result.');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    resultService
      .getClassmates()
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your class friends. Please try again later.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Class banner + portal-search button (search itself lives on the
          public portal — /bteb-result 301s to result.spisg.gov.bd). */}
      <Card className="border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="flex items-center gap-1.5 font-semibold">
              <Users className="h-4 w-4 text-emerald-600" aria-hidden />
              Class friends
              {data && (
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">
                  {data.classInfo.count}
                </Badge>
              )}
            </p>
            {data && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {data.classInfo.department} · {data.classInfo.semester} semester
                {data.classInfo.shift && ` · ${data.classInfo.shift} shift`}
              </p>
            )}
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800 dark:hover:bg-emerald-900/40">
            <a href="/bteb-result" target="_blank" rel="noopener">
              <Search className="mr-1.5 h-4 w-4 text-emerald-600" aria-hidden />
              Search any roll
              <ExternalLink className="ml-1.5 h-3 w-3 text-muted-foreground" aria-hidden />
            </a>
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
          Loading class results…
        </div>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && data && data.friends.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden />
            No other students found in your class yet.
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && data.friends.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.friends.map((friend) => (
            <FriendCard key={friend.roll} friend={friend} onOpen={openFriend} />
          ))}
        </div>
      )}

      {/* Full previous + current results for the tapped friend. */}
      {detailLoading && detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden />
        </div>
      )}
      {detail && (
        <ResultSummaryDialog data={detail} open={detailOpen} onOpenChange={setDetailOpen} />
      )}
    </div>
  );
}

export default function BoardResultsPage() {
  const { user } = useAuth();
  // Teachers have no personal board roll, so they get the search view only
  // (look up any student's official result by roll number).
  const isTeacher = user?.role === 'teacher';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
          <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Board Results</h1>
          <p className="text-sm text-muted-foreground">
            {isTeacher
              ? "Look up any student's official BTEB result by roll number"
              : "Official BTEB semester results — yours and your friends'"}
          </p>
        </div>
      </div>

      {isTeacher ? (
        <RollSearchView />
      ) : (
        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">My Results</TabsTrigger>
            <TabsTrigger value="friends">
              <Users className="mr-1.5 h-4 w-4" />
              Friends
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mine" className="mt-4">
            <MyResultsTab />
          </TabsContent>
          <TabsContent value="friends" className="mt-4">
            <FriendsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
