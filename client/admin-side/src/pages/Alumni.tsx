import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Eye, GraduationCap, Briefcase, Calendar, Users, TrendingUp, Clock,
  Heart, HeartHandshake, ShieldCheck, ShieldAlert, Loader2, AlertCircle, RefreshCw,
  UserPlus, X, SlidersHorizontal, Building2, Layers, UserCheck, BadgeCheck, Mail,
  Check,
} from 'lucide-react';
import { AlumniReminderDialog } from '@/components/alumni/AlumniReminderDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { alumniService, Alumni as AlumniType } from '@/services/alumniService';
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

// Fixed filter ranges (per request): sessions/years from 2000 to today, shifts Morning/Day.
const SESSION_FILTER_OPTIONS = getSessionsRange(2000);
const YEAR_FILTER_OPTIONS = getYearsRange(2000);
const SHIFT_FILTER_OPTIONS = ['Morning', 'Day'];

type AlumniCategory = 'all' | 'recent' | 'established' | 'verified' | 'pending' | 'receiving_support' | 'needs_extra_support';

interface DisplayAlumni {
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

const quickFilters: { value: AlumniCategory; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All Alumni', icon: Users },
  { value: 'recent', label: 'Recent', icon: Calendar },
  { value: 'established', label: 'Established', icon: TrendingUp },
  { value: 'verified', label: 'Verified', icon: BadgeCheck },
  { value: 'pending', label: 'Pending Review', icon: Clock },
  { value: 'receiving_support', label: 'Receiving Support', icon: Heart },
];

const sourceLabels: Record<string, string> = {
  pipeline: 'Promoted',
  admin_manual: 'Manually Added',
  self_registration: 'Self Registered',
};

export default function Alumni() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState(ALL);
  const [session, setSession] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [shift, setShift] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [category, setCategory] = useState<AlumniCategory>('all');
  const [sortBy, setSortBy] = useState('year_desc');
  const [reminderOpen, setReminderOpen] = useState(false);

  const [alumniData, setAlumniData] = useState<DisplayAlumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pending self-registration review actions
  const [reviewActionId, setReviewActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DisplayAlumni | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchAlumni();
  }, []);

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
      setAlumniData(transformed);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Self-registered alumni waiting for an admin decision.
  const pendingRequests = useMemo(
    () => alumniData.filter((a) => a.reviewStatus === 'pending'),
    [alumniData],
  );

  const handleApproveRequest = async (alumni: DisplayAlumni) => {
    setReviewActionId(alumni.id);
    try {
      await alumniService.reviewAlumni(alumni.id, 'approve');
      toast.success(`${alumni.name} is now an approved alumnus.`);
      await fetchAlumni();
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to approve the request.');
    } finally {
      setReviewActionId(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await alumniService.reviewAlumni(rejectTarget.id, 'reject', rejectNotes.trim());
      toast.success(`${rejectTarget.name}'s alumni request was rejected.`);
      setRejectTarget(null);
      setRejectNotes('');
      await fetchAlumni();
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to reject the request.');
    } finally {
      setRejecting(false);
    }
  };

  // Dynamic filter option lists derived from the loaded dataset.
  const departments = useMemo(
    () => Array.from(new Set(alumniData.map((a) => a.department).filter(Boolean))).sort(),
    [alumniData],
  );
  // Fixed ranges so admins can filter any session/year even before data exists.
  const sessions = SESSION_FILTER_OPTIONS;
  const years = YEAR_FILTER_OPTIONS;
  const shifts = SHIFT_FILTER_OPTIONS;

  const stats = useMemo(() => ({
    all: alumniData.length,
    recent: alumniData.filter((a) => a.category === 'recent').length,
    established: alumniData.filter((a) => a.category === 'established').length,
    verified: alumniData.filter((a) => a.isVerified).length,
    pending: alumniData.filter((a) => a.reviewStatus === 'pending').length,
    receiving_support: alumniData.filter((a) => a.supportStatus === 'receiving_support').length,
    needs_extra_support: alumniData.filter((a) => a.supportStatus === 'needs_extra_support').length,
  }), [alumniData]);

  const matchesCategory = (a: DisplayAlumni) => {
    switch (category) {
      case 'all': return true;
      case 'recent': return a.category === 'recent';
      case 'established': return a.category === 'established';
      case 'verified': return a.isVerified;
      case 'pending': return a.reviewStatus === 'pending';
      case 'receiving_support': return a.supportStatus === 'receiving_support';
      case 'needs_extra_support': return a.supportStatus === 'needs_extra_support';
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
  }, [alumniData, search, department, session, year, shift, source, category, sortBy]);

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (department !== ALL) chips.push({ key: 'dept', label: department, clear: () => setDepartment(ALL) });
    if (session !== ALL) chips.push({ key: 'session', label: `Session ${session}`, clear: () => setSession(ALL) });
    if (year !== ALL) chips.push({ key: 'year', label: `Class of ${year}`, clear: () => setYear(ALL) });
    if (shift !== ALL) chips.push({ key: 'shift', label: `${shift} Shift`, clear: () => setShift(ALL) });
    if (source !== ALL) chips.push({ key: 'source', label: sourceLabels[source] || source, clear: () => setSource(ALL) });
    if (category !== 'all') chips.push({ key: 'cat', label: quickFilters.find((c) => c.value === category)?.label || category, clear: () => setCategory('all') });
    return chips;
  }, [department, session, year, shift, source, category]);

  const clearAll = () => {
    setSearch(''); setDepartment(ALL); setSession(ALL); setYear(ALL);
    setShift(ALL); setSource(ALL); setCategory('all');
  };

  const getCategoryColor = (cat: 'recent' | 'established') =>
    cat === 'recent'
      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';

  const getSupportColor = (s: DisplayAlumni['supportStatus']) => {
    switch (s) {
      case 'receiving_support': return 'bg-orange-500 text-white';
      case 'needs_extra_support': return 'bg-red-500 text-white';
      default: return 'bg-green-500 text-white';
    }
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
    <div className="space-y-6">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 p-6 text-primary-foreground shadow-lg"
      >
        <div className="absolute -right-8 -top-8 opacity-10">
          <GraduationCap className="w-44 h-44" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Alumni Network</h1>
            <p className="text-primary-foreground/80">
              {stats.all} graduates · {stats.verified} verified{stats.pending > 0 ? ` · ${stats.pending} pending review` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={fetchAlumni} className="bg-white/15 hover:bg-white/25 text-primary-foreground border-0">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setReminderOpen(true)} className="bg-white/15 hover:bg-white/25 text-primary-foreground border-0">
              <Mail className="w-4 h-4 mr-2" /> Completion Reminders
            </Button>
            <Button size="sm" onClick={() => navigate('/alumni/add')} className="bg-white text-primary hover:bg-white/90">
              <UserPlus className="w-4 h-4 mr-2" /> Create New Alumni
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Pending self-registration requests — approve or reject before they
          gain alumni privileges */}
      {pendingRequests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-orange-500/40 bg-orange-500/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-300 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Pending Alumni Requests</h2>
                    <p className="text-xs text-muted-foreground">
                      Self-registered alumni awaiting review — they have no alumni access until approved.
                    </p>
                  </div>
                </div>
                <Badge className="bg-orange-500 text-white">{pendingRequests.length}</Badge>
              </div>

              <div className="divide-y divide-border rounded-lg border border-border bg-card">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <Avatar className="w-10 h-10 border border-border shrink-0">
                      <AvatarImage src={request.avatar} />
                      <AvatarFallback className="bg-orange-500/15 text-orange-700 dark:text-orange-300 text-sm font-bold">
                        {request.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{request.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {request.department}
                        {request.graduationYear !== 'N/A' ? ` • Class of ${request.graduationYear}` : ''}
                        {request.currentJob !== 'Not specified' ? ` • ${request.currentJob}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/alumni/${request.id}`)}>
                        <Eye className="w-4 h-4 mr-1.5" /> Review
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApproveRequest(request)}
                        disabled={reviewActionId === request.id}
                      >
                        {reviewActionId === request.id ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-1.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => { setRejectTarget(request); setRejectNotes(''); }}
                        disabled={reviewActionId === request.id}
                      >
                        <X className="w-4 h-4 mr-1.5" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick-filter stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickFilters.map((cat, index) => (
          <motion.div
            key={cat.value}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-300 ${
                category === cat.value
                  ? 'ring-2 ring-primary shadow-md bg-primary/5'
                  : 'hover:bg-muted/50 hover:shadow-sm'
              }`}
              onClick={() => setCategory(cat.value)}
            >
              <CardContent className="p-4 text-center">
                <div className={`inline-flex p-2 rounded-lg mb-2 ${
                  category === cat.value ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <p className="text-xl font-bold text-foreground">{stats[cat.value as keyof typeof stats] ?? 0}</p>
                <p className="text-[11px] text-muted-foreground truncate font-medium">{cat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-2 border-border/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11"
              />
            </div>

            {/* Category dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <FilterSelect icon={Building2} value={department} onChange={setDepartment} allLabel="All Departments" options={departments} />
              <FilterSelect icon={Layers} value={session} onChange={setSession} allLabel="All Sessions" options={sessions} format={(s) => `Session ${s}`} />
              <FilterSelect icon={Calendar} value={year} onChange={setYear} allLabel="All Years" options={years} format={(y) => `Class of ${y}`} />
              <FilterSelect icon={Clock} value={shift} onChange={setShift} allLabel="All Shifts" options={shifts} format={(s) => `${s} Shift`} />
              <FilterSelect icon={UserCheck} value={source} onChange={setSource} allLabel="All Sources" options={Object.keys(sourceLabels)} format={(s) => sourceLabels[s] || s} />
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
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

      {/* Results header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {stats.all} alumni
        </p>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="year_desc">Newest graduates</SelectItem>
            <SelectItem value="year_asc">Oldest graduates</SelectItem>
            <SelectItem value="name_asc">Name (A–Z)</SelectItem>
            <SelectItem value="name_desc">Name (Z–A)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alumni grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((alumni, index) => (
          <motion.div
            key={alumni.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.4) }}
            whileHover={{ y: -4 }}
          >
            <Card
              className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-border/50 hover:border-primary/30 overflow-hidden h-full"
              onClick={() => navigate(`/alumni/${alumni.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-2 border-primary/30 shadow group-hover:scale-105 transition-transform">
                      <AvatarImage src={alumni.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-lg font-bold">
                        {alumni.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      <Badge className={`${getSupportColor(alumni.supportStatus)} border-2 border-background p-1`}>
                        {alumni.supportStatus === 'receiving_support' ? <Heart className="w-2.5 h-2.5" />
                          : alumni.supportStatus === 'needs_extra_support' ? <HeartHandshake className="w-2.5 h-2.5" />
                          : <ShieldCheck className="w-2.5 h-2.5" />}
                      </Badge>
                    </div>
                  </div>
                  {alumni.isVerified ? (
                    <Badge variant="outline" className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 text-[10px]">
                      <BadgeCheck className="w-3 h-3 mr-0.5" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 text-[10px]">
                      <ShieldAlert className="w-3 h-3 mr-0.5" /> {alumni.reviewStatus === 'pending' ? 'Pending' : 'Unverified'}
                    </Badge>
                  )}
                </div>

                <h3 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">{alumni.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">{alumni.roll}</p>

                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <Badge variant="outline" className="text-[10px] font-semibold">{alumni.department}</Badge>
                  <Badge variant="outline" className={`text-[10px] font-semibold ${getCategoryColor(alumni.category)}`}>
                    {alumni.category === 'recent' ? 'Recent' : 'Established'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
                  <Meta label="Year" value={alumni.graduationYear} />
                  <Meta label="Session" value={alumni.session || '—'} />
                  <Meta label="Shift" value={alumni.shift || '—'} />
                </div>

                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-sm font-semibold text-primary truncate">{alumni.currentJob}</p>
                  </div>
                  {alumni.company && <p className="text-xs text-muted-foreground truncate ml-6">{alumni.company}</p>}
                </div>

                <div className="mt-3 flex justify-end">
                  <span className="text-xs text-muted-foreground group-hover:text-primary flex items-center gap-1">
                    View Details <Eye className="w-3 h-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-2 border-dashed border-border">
            <CardContent className="p-12 text-center">
              <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                <GraduationCap className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Alumni Found</h3>
              <p className="text-muted-foreground mb-4">No alumni match your current filters.</p>
              {activeFilters.length > 0 && (
                <Button variant="outline" onClick={clearAll}><X className="w-4 h-4 mr-2" /> Clear filters</Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <AlumniReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} />

      {/* Reject alumni request dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectNotes(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Reject alumni request
            </DialogTitle>
            <DialogDescription>
              {rejectTarget ? `${rejectTarget.name} will not receive alumni access.` : ''}
              {' '}You can add a note explaining the decision — it is shared with the applicant.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Reason / notes (optional)…"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectRequest} disabled={rejecting}>
              {rejecting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rejecting…</>
              ) : (
                'Reject request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------------- small helpers ----------------------------- */

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
