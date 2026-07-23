import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Eye, GraduationCap, Briefcase, Calendar, Users, TrendingUp, Clock,
  Heart, HeartHandshake, ShieldCheck, ShieldAlert, Loader2, AlertCircle, RefreshCw,
  X, SlidersHorizontal, Building2, Layers, UserCheck, BadgeCheck,
  ArrowRight, Inbox, LayoutGrid, List, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { alumniService, Alumni as AlumniType } from '@/services/alumniService';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { API_BASE_URL } from '@/config/api';
import { getSessionsRange, getYearsRange } from '@/components/add-student/config';

// Backend origin that serves uploaded files (strip the trailing "/api").
const FILE_BASE = API_BASE_URL.replace(/\/api\/?$/, '');

/** Resolve a stored file path (e.g. "/files/.../photo.jpg") to a loadable URL. */
const resolveFileUrl = (path?: string): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${FILE_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Fixed filter ranges: sessions/years from 2000 to today, shifts Morning/Day.
const SESSION_FILTER_OPTIONS = getSessionsRange(2000);
const YEAR_FILTER_OPTIONS = getYearsRange(2000);
const SHIFT_FILTER_OPTIONS = ['Morning', 'Day'];

type AlumniCategory =
  | 'all' | 'recent' | 'established' | 'verified'
  | 'receiving_support' | 'needs_extra_support' | 'no_support_needed';
type ViewMode = 'grid' | 'list';

const VIEW_STORAGE_KEY = 'admin-alumni-directory-view';

export interface DisplayAlumni {
  id: string;
  name: string;
  roll: string;
  department: string;
  graduationYear: string;
  session: string;
  shift: string;
  currentJob: string;
  company: string;
  avatar: string;
  category: 'recent' | 'established';
  supportStatus: 'receiving_support' | 'needs_extra_support' | 'no_support_needed';
  registrationSource: string;
  isVerified: boolean;
  reviewStatus: string;
}

const ALL = 'all';

const categoryPills: { value: AlumniCategory; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Users },
  { value: 'recent', label: 'Recent', icon: Calendar },
  { value: 'established', label: 'Established', icon: TrendingUp },
  { value: 'verified', label: 'Verified', icon: BadgeCheck },
  { value: 'receiving_support', label: 'Need Support', icon: Heart },
  { value: 'needs_extra_support', label: 'Need Extra Support', icon: HeartHandshake },
  { value: 'no_support_needed', label: 'No Support Needed', icon: ShieldCheck },
];

const sourceLabels: Record<string, string> = {
  pipeline: 'Promoted',
  admin_manual: 'Manually Added',
  self_registration: 'Self Registered',
};

/**
 * Alumni Directory — browse, search and manage APPROVED alumni.
 * Pending / rejected self-registrations (and the create/reminder tools)
 * live on the Alumni Requests page.
 */
export default function AlumniDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState(ALL);
  const [session, setSession] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [shift, setShift] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [category, setCategory] = useState<AlumniCategory>('all');
  const [sortBy, setSortBy] = useState('year_desc');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [view, setView] = useState<ViewMode>(() =>
    (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) === 'list' ? 'list' : 'grid',
  );

  const [alumniData, setAlumniData] = useState<DisplayAlumni[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Department Heads land with their own department pre-selected (once,
  // on first load — clearing the filter afterwards is respected).
  const deptDefaultApplied = useRef(false);

  useEffect(() => {
    fetchAlumni();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await alumniService.getAlumni({ page_size: 1000 });
      const transformed: DisplayAlumni[] = response.results.map((a: AlumniType) => ({
        id: a.student.id,
        name: a.student.fullNameEnglish || 'Unknown',
        roll: a.student.currentRollNumber || 'N/A',
        department: a.student.department?.name || 'Unknown',
        graduationYear: a.graduationYear?.toString() || 'N/A',
        session: a.student.session || '',
        shift: a.student.shift || '',
        currentJob: a.currentPosition?.positionTitle || 'Not specified',
        company: a.currentPosition?.organizationName || '',
        avatar: resolveFileUrl(a.student.profilePhoto),
        category: a.alumniType,
        supportStatus: a.currentSupportCategory,
        registrationSource: a.registrationSource || 'pipeline',
        isVerified: a.isVerified ?? true,
        reviewStatus: a.reviewStatus || 'approved',
      }));

      // The directory lists approved alumni only; pending requests are
      // handled on the Alumni Requests page (we keep the count for the link).
      const approved = transformed.filter((a) => a.reviewStatus === 'approved');
      setAlumniData(approved);
      setPendingCount(transformed.filter((a) => a.reviewStatus === 'pending').length);

      // Default a Department Head's view to their own department.
      if (!deptDefaultApplied.current && user?.role === 'department_head' && user.department_name) {
        if (approved.some((a) => a.department === user.department_name)) {
          setDepartment(user.department_name);
        }
        deptDefaultApplied.current = true;
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Dynamic filter option lists derived from the loaded dataset.
  const departments = useMemo(
    () => Array.from(new Set(alumniData.map((a) => a.department).filter(Boolean))).sort(),
    [alumniData],
  );

  const stats = useMemo(() => ({
    all: alumniData.length,
    recent: alumniData.filter((a) => a.category === 'recent').length,
    established: alumniData.filter((a) => a.category === 'established').length,
    verified: alumniData.filter((a) => a.isVerified).length,
    receiving_support: alumniData.filter((a) => a.supportStatus === 'receiving_support').length,
    needs_extra_support: alumniData.filter((a) => a.supportStatus === 'needs_extra_support').length,
    no_support_needed: alumniData.filter((a) => a.supportStatus === 'no_support_needed').length,
  }), [alumniData]);

  const matchesCategory = (a: DisplayAlumni) => {
    switch (category) {
      case 'all': return true;
      case 'recent': return a.category === 'recent';
      case 'established': return a.category === 'established';
      case 'verified': return a.isVerified;
      case 'receiving_support': return a.supportStatus === 'receiving_support';
      case 'needs_extra_support': return a.supportStatus === 'needs_extra_support';
      case 'no_support_needed': return a.supportStatus === 'no_support_needed';
      default: return true;
    }
  };

  const filtered = useMemo(() => {
    const result = alumniData.filter((a) => {
      const q = search.toLowerCase();
      const matchesSearch = q === '' ||
        a.name.toLowerCase().includes(q) ||
        a.roll.toLowerCase().includes(q) ||
        a.company.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (department === ALL || a.department === department) &&
        (session === ALL || a.session === session) &&
        (year === ALL || a.graduationYear === year) &&
        (shift === ALL || a.shift === shift) &&
        (source === ALL || a.registrationSource === source) &&
        matchesCategory(a)
      );
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'year_asc': return a.graduationYear.localeCompare(b.graduationYear);
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        default: return b.graduationYear.localeCompare(a.graduationYear); // year_desc
      }
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumniData, search, department, session, year, shift, source, category, sortBy]);

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (department !== ALL) chips.push({ key: 'dept', label: department, clear: () => setDepartment(ALL) });
    if (session !== ALL) chips.push({ key: 'session', label: `Session ${session}`, clear: () => setSession(ALL) });
    if (year !== ALL) chips.push({ key: 'year', label: `Class of ${year}`, clear: () => setYear(ALL) });
    if (shift !== ALL) chips.push({ key: 'shift', label: `${shift} Shift`, clear: () => setShift(ALL) });
    if (source !== ALL) chips.push({ key: 'source', label: sourceLabels[source] || source, clear: () => setSource(ALL) });
    return chips;
  }, [department, session, year, shift, source]);

  // Advanced (collapsed) filters that are currently active — used for the
  // little counter on the "Filters" button so nothing active is ever hidden.
  const advancedActiveCount = [session, year, shift, source].filter((v) => v !== ALL).length;

  const clearAll = () => {
    setSearch(''); setDepartment(ALL); setSession(ALL); setYear(ALL);
    setShift(ALL); setSource(ALL); setCategory('all');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading alumni data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Alumni</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchAlumni}><RefreshCw className="w-4 h-4 mr-2" /> Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Hero: identity + at-a-glance numbers ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 p-6 text-primary-foreground shadow-lg"
      >
        <div className="absolute -right-8 -top-8 opacity-10">
          <GraduationCap className="w-44 h-44" />
        </div>
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold mb-1">Alumni Directory</h1>
            <p className="text-primary-foreground/80">
              Browse, search and manage the institute's graduate network.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={fetchAlumni} className="bg-white/15 hover:bg-white/25 text-primary-foreground border-0">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <Button
                variant="secondary" size="sm" onClick={() => navigate('/alumni-requests')}
                className={cn(
                  'border-0 text-primary-foreground',
                  pendingCount > 0 ? 'bg-orange-500/80 hover:bg-orange-500' : 'bg-white/15 hover:bg-white/25',
                )}
              >
                <Inbox className="w-4 h-4 mr-2" />
                {pendingCount > 0 ? `${pendingCount} Pending Request${pendingCount > 1 ? 's' : ''}` : 'Alumni Requests'}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Glass stat blocks */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <HeroStat icon={Users} value={stats.all} label="Graduates" />
            <HeroStat icon={BadgeCheck} value={stats.verified} label="Verified" />
            <HeroStat icon={Building2} value={departments.length} label="Departments" />
          </div>
        </div>
      </motion.div>

      {/* ── Toolbar: search / department / sort / view / advanced filters ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-2 border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, roll, or company…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Department (always visible — the most used filter) */}
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="h-10 w-[190px]">
                    <Building2 className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-10 w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year_desc">Newest graduates</SelectItem>
                    <SelectItem value="year_asc">Oldest graduates</SelectItem>
                    <SelectItem value="name_asc">Name (A–Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z–A)</SelectItem>
                  </SelectContent>
                </Select>

                {/* More filters */}
                <Button
                  variant={showAdvanced || advancedActiveCount > 0 ? 'default' : 'outline'}
                  size="sm"
                  className="h-10"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {advancedActiveCount > 0 && (
                    <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background/25 px-1 text-[11px] font-bold">
                      {advancedActiveCount}
                    </span>
                  )}
                  <ChevronDown className={cn('w-3.5 h-3.5 ml-1.5 transition-transform', showAdvanced && 'rotate-180')} />
                </Button>

                {/* View toggle */}
                <div className="flex items-center rounded-lg border border-border p-0.5 h-10">
                  <button
                    onClick={() => setView('grid')}
                    aria-label="Grid view"
                    className={cn(
                      'flex h-full items-center justify-center rounded-md px-2.5 transition-colors',
                      view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    aria-label="List view"
                    className={cn(
                      'flex h-full items-center justify-center rounded-md px-2.5 transition-colors',
                      view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced filters (collapsible) */}
            <AnimatePresence initial={false}>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <FilterSelect icon={Layers} value={session} onChange={setSession} allLabel="All Sessions" options={SESSION_FILTER_OPTIONS} format={(s) => `Session ${s}`} />
                    <FilterSelect icon={Calendar} value={year} onChange={setYear} allLabel="All Years" options={YEAR_FILTER_OPTIONS} format={(y) => `Class of ${y}`} />
                    <FilterSelect icon={Clock} value={shift} onChange={setShift} allLabel="All Shifts" options={SHIFT_FILTER_OPTIONS} format={(s) => `${s} Shift`} />
                    <FilterSelect icon={UserCheck} value={source} onChange={setSource} allLabel="All Sources" options={Object.keys(sourceLabels)} format={(s) => sourceLabels[s] || s} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.map((chip) => (
                  <Badge key={chip.key} variant="secondary" className="gap-1 pl-2.5 pr-1 py-1">
                    {chip.label}
                    <button onClick={chip.clear} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs text-muted-foreground">
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Category pills + result count ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {categoryPills.map((pill) => {
            const active = category === pill.value;
            return (
              <button
                key={pill.value}
                onClick={() => setCategory(pill.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                <pill.icon className="w-3.5 h-3.5" />
                {pill.label}
                <span className={cn(
                  'rounded-full px-1.5 py-px text-[10px] font-bold',
                  active ? 'bg-primary-foreground/20' : 'bg-muted',
                )}>
                  {stats[pill.value as keyof typeof stats] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground shrink-0">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {stats.all} alumni
        </p>
      </div>

      {/* ── Results: grid or list ─────────────────────────────────────────── */}
      {filtered.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((alumni, index) => (
            <AlumniGridCard key={alumni.id} alumni={alumni} index={index} onOpen={() => navigate(`/alumni/${alumni.id}`)} />
          ))}
        </div>
      )}

      {filtered.length > 0 && view === 'list' && (
        <Card className="border-2 border-border/50 overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((alumni, index) => (
              <AlumniListRow key={alumni.id} alumni={alumni} index={index} onOpen={() => navigate(`/alumni/${alumni.id}`)} />
            ))}
          </div>
        </Card>
      )}

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-2 border-dashed border-border">
            <CardContent className="p-12 text-center">
              <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                <GraduationCap className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Alumni Found</h3>
              <p className="text-muted-foreground mb-4">No alumni match your current filters.</p>
              {(activeFilters.length > 0 || search || category !== 'all') && (
                <Button variant="outline" onClick={clearAll}><X className="w-4 h-4 mr-2" /> Clear filters</Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

/* ────────────────────────────── sub-components ─────────────────────────── */

function HeroStat({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-3 text-center min-w-[96px]">
      <Icon className="w-4 h-4 mx-auto mb-1 opacity-80" />
      <p className="text-2xl font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-primary-foreground/75 font-medium">{label}</p>
    </div>
  );
}

const getSupportBadge = (s: DisplayAlumni['supportStatus']) => {
  switch (s) {
    case 'receiving_support':
      return { className: 'bg-orange-500 text-white', icon: Heart, label: 'Receiving support' };
    case 'needs_extra_support':
      return { className: 'bg-red-500 text-white', icon: HeartHandshake, label: 'Needs extra support' };
    default:
      return { className: 'bg-green-500 text-white', icon: ShieldCheck, label: 'No support needed' };
  }
};

/**
 * Alumni review-state chip (green Verified / orange Unverified).
 * NOTE: deliberately NOT named `VerifiedBadge` — that name is the imported
 * blue contributor badge; a local declaration with the same name shadows the
 * import and made every card show an "Unverified" chip beside the name.
 */
function VerificationChip({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge variant="outline" className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 text-[10px]">
      <BadgeCheck className="w-3 h-3 mr-0.5" /> Verified
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 text-[10px]">
      <ShieldAlert className="w-3 h-3 mr-0.5" /> Unverified
    </Badge>
  );
}

function AlumniAvatar({ alumni, size = 'md' }: { alumni: DisplayAlumni; size?: 'md' | 'lg' }) {
  const support = getSupportBadge(alumni.supportStatus);
  const SupportIcon = support.icon;
  return (
    <div className="relative shrink-0">
      <Avatar className={cn(
        'border-2 border-primary/25 shadow-sm',
        size === 'lg' ? 'w-14 h-14' : 'w-11 h-11',
      )}>
        <AvatarImage src={alumni.avatar} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
          {alumni.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <span
        title={support.label}
        className={cn(
          'absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2 border-background p-[3px]',
          support.className,
        )}
      >
        <SupportIcon className="w-2.5 h-2.5" />
      </span>
    </div>
  );
}

function AlumniGridCard({ alumni, index, onOpen }: { alumni: DisplayAlumni; index: number; onOpen: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.35) }}
      whileHover={{ y: -3 }}
    >
      <Card
        className="cursor-pointer group h-full border-2 border-border/50 hover:border-primary/35 hover:shadow-lg transition-all duration-300 overflow-hidden"
        onClick={onOpen}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlumniAvatar alumni={alumni} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {alumni.name}
                <VerifiedBadge roll={alumni.roll} size={13} className="ml-1" />
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono truncate">{alumni.roll}</p>
              <div className="mt-1"><VerificationChip verified={alumni.isVerified} /></div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <Badge variant="outline" className="text-[10px] font-semibold max-w-full truncate">{alumni.department}</Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-semibold',
                alumni.category === 'recent'
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
              )}
            >
              {alumni.category === 'recent' ? 'Recent' : 'Established'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
            <Meta label="Year" value={alumni.graduationYear} />
            <Meta label="Session" value={alumni.session || '—'} />
            <Meta label="Shift" value={alumni.shift || '—'} />
          </div>

          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary truncate">{alumni.currentJob}</p>
                {alumni.company && <p className="text-[11px] text-muted-foreground truncate">{alumni.company}</p>}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AlumniListRow({ alumni, index, onOpen }: { alumni: DisplayAlumni; index: number; onOpen: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.015, 0.3) }}
      onClick={onOpen}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer group hover:bg-muted/40 transition-colors"
    >
      <AlumniAvatar alumni={alumni} />

      {/* Name + roll */}
      <div className="w-[200px] min-w-0 shrink-0">
        <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {alumni.name}
          <VerifiedBadge roll={alumni.roll} size={13} className="ml-1" />
        </p>
        <p className="text-[11px] text-muted-foreground font-mono truncate">{alumni.roll}</p>
      </div>

      {/* Department + type */}
      <div className="hidden md:flex items-center gap-1.5 w-[240px] min-w-0 shrink-0">
        <Badge variant="outline" className="text-[10px] font-semibold truncate max-w-[160px]">{alumni.department}</Badge>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-semibold shrink-0',
            alumni.category === 'recent'
              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          )}
        >
          {alumni.category === 'recent' ? 'Recent' : 'Established'}
        </Badge>
      </div>

      {/* Year / session / shift */}
      <p className="hidden lg:block w-[170px] shrink-0 text-xs text-muted-foreground truncate">
        {alumni.graduationYear}{alumni.session ? ` · ${alumni.session}` : ''}{alumni.shift ? ` · ${alumni.shift}` : ''}
      </p>

      {/* Job */}
      <div className="flex-1 min-w-0 hidden sm:block">
        <p className="text-xs font-semibold text-foreground truncate">
          {alumni.currentJob}
          {alumni.company && <span className="text-muted-foreground font-normal"> @ {alumni.company}</span>}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <VerificationChip verified={alumni.isVerified} />
        <Button size="sm" variant="ghost" className="h-8 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex">
          <Eye className="w-4 h-4 mr-1.5" /> View
        </Button>
        <ChevronRight className="w-4 h-4 text-muted-foreground sm:hidden" />
      </div>
    </motion.div>
  );
}

function FilterSelect({
  icon: Icon, value, onChange, allLabel, options, format,
}: {
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: string[];
  format?: (v: string) => string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10">
        <Icon className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{format ? format(opt) : opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 py-1.5 px-1">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
