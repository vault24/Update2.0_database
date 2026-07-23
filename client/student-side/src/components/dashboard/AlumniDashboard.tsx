import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap, Bell, Briefcase, Calendar,
  ArrowRight, BadgeCheck, Clock, UserCog, Building2, Sparkles,
  Award, TrendingUp, Code2, FolderOpen, Link2, ExternalLink,
  CheckCircle2, Circle, ChevronRight, Users, Send, Shield,
  BarChart3, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  alumniService, AlumniProfile, AlumniDirectoryEntry, getProfileCompletion,
  resolveFileUrl,
} from '@/services/alumniService';
import { noticeService, Notice } from '@/services/noticeService';

/**
 * Alumni home dashboard — a real dashboard, not a second profile page:
 * compact identity strip on top, then stat tiles, a full quick-action grid
 * mirroring the sidebar, and content widgets (notices, career snapshot,
 * fellow alumni, profile completion). Everything is fed by data the alumni
 * system already exposes (profile + notices + directory) — no backend changes.
 *
 * Palette: Fresh Meadow (emerald primary, amber accent), hovers neutral.
 */

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const timeAgo = (dateString: string) => {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
};

// Colorful quick actions — every destination in the alumni sidebar, so the
// dashboard works as the portal's launchpad (dashboard-grade navigation).
const quickActions = [
  { icon: UserCog, label: 'Alumni Profile', path: '/dashboard/alumni-profile', color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { icon: Users, label: 'Directory', path: '/dashboard/alumni-directory', color: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { icon: Bell, label: 'Notices', path: '/dashboard/notices', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { icon: FolderOpen, label: 'Documents', path: '/dashboard/documents', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { icon: GraduationCap, label: 'Board Results', path: '/dashboard/board-results', color: 'from-pink-500 to-rose-600', bg: 'bg-pink-50 dark:bg-pink-950/30' },
  { icon: BarChart3, label: 'Marks', path: '/dashboard/marks', color: 'from-cyan-500 to-teal-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  { icon: Send, label: 'Applications', path: '/dashboard/applications', color: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  { icon: Shield, label: 'Complaints', path: '/dashboard/complaints', color: 'from-red-500 to-orange-600', bg: 'bg-red-50 dark:bg-red-950/30' },
];

export function AlumniDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<AlumniProfile | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [fellows, setFellows] = useState<AlumniDirectoryEntry[]>([]);
  const [fellowCount, setFellowCount] = useState(0);

  useEffect(() => {
    let active = true;
    alumniService
      .getProfile()
      .then((p) => active && setProfile(p))
      .catch(() => active && setProfile(null));

    noticeService
      .getRecentNotices()
      .then((n) => active && setNotices(n.slice(0, 5)))
      .catch(() => active && setNotices([]));

    alumniService
      .getDirectory({})
      .then((d) => {
        if (!active) return;
        setFellowCount(d.count || 0);
        setFellows((d.results || []).slice(0, 4));
      })
      .catch(() => active && setFellows([]));

    return () => {
      active = false;
    };
  }, []);

  const name = profile?.name || user?.name || 'Alumnus';
  const firstNames = name.trim().split(/\s+/).slice(0, 2).join(' ');
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const department = profile?.department || '';
  const gradYear = profile?.graduationYear || '';
  const job = profile?.currentJob || '';
  const company = profile?.company || '';
  const verified = !!profile?.isVerified;
  const pending = profile?.reviewStatus === 'pending';
  const avatar = profile?.avatar || '';

  const completion = useMemo(() => getProfileCompletion(profile), [profile]);

  // Derived engagement stats — all from real profile data.
  const currentYear = new Date().getFullYear();
  const gradYearNum = parseInt(String(gradYear), 10);
  const yearsSince = Number.isFinite(gradYearNum) && gradYearNum > 0 ? currentYear - gradYearNum : null;

  const stats = [
    { icon: Calendar, label: 'Years as Alumnus', value: yearsSince === null ? '—' : yearsSince <= 0 ? 'New' : `${yearsSince}`, color: 'from-emerald-500 to-teal-600' },
    { icon: Briefcase, label: 'Career Entries', value: String(profile?.careers?.length || 0), color: 'from-blue-500 to-cyan-600' },
    { icon: Code2, label: 'Skills Listed', value: String(profile?.skills?.length || 0), color: 'from-amber-500 to-orange-500' },
    { icon: Award, label: 'Certifications', value: String(profile?.courses?.length || 0), color: 'from-pink-500 to-rose-600' },
  ];

  const topSkills = (profile?.skills || [])
    .slice()
    .sort((a, b) => (b.proficiency || 0) - (a.proficiency || 0))
    .slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-clip pb-8">
      {/* ── Compact identity strip ────────────────────────────────── */}
      <motion.div
        {...fadeUp}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-4 md:p-5 text-white shadow-lg"
      >
        <div className="pointer-events-none absolute -right-6 -top-8 opacity-10">
          <GraduationCap className="h-36 w-36" />
        </div>
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/20 text-lg font-bold ring-2 ring-white/30">
              {avatar ? <img src={resolveFileUrl(avatar)} alt={name} className="h-full w-full object-cover" /> : initials}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-medium text-emerald-100">
                {timeOfDayGreeting()}
              </p>
              <h1 className="truncate text-lg md:text-xl lg:text-2xl font-display font-bold leading-tight">
                {firstNames}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] md:text-xs text-emerald-50">
                {department && (
                  <span className="hidden sm:inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" />{department}
                  </span>
                )}
                {gradYear && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-medium">
                    Class of {gradYear}
                  </span>
                )}
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
                  verified ? 'bg-white/20' : 'bg-amber-400/90 text-amber-950',
                )}>
                  {verified
                    ? <><BadgeCheck className="h-3 w-3" /> Verified</>
                    : <><Clock className="h-3 w-3" /> {pending ? 'Pending' : 'Unverified'}</>}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard/alumni-profile')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs md:text-sm font-semibold text-emerald-700 shadow-sm transition-transform hover:scale-[1.02]"
          >
            <UserCog className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Profile</span>
          </button>
        </div>

        {(job || company) && (
          <div className="relative mt-3 border-t border-white/15 pt-2 text-xs md:text-sm text-emerald-50">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Briefcase className="h-3.5 w-3.5" />{job}{company ? ` · ${company}` : ''}
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Stat tiles ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            {...fadeUp}
            transition={{ delay: i * 0.05 }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card"
          >
            <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-md', s.color)}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-2xl font-bold leading-none text-foreground">{s.value}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Quick actions grid ────────────────────────────────────── */}
      <motion.div
        {...fadeUp}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card"
      >
        <h3 className="mb-4 text-base md:text-lg font-semibold text-foreground">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={cn(
                'group flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-xl p-3',
                'transition-all duration-200 hover:shadow-md active:scale-95',
                action.bg,
              )}
            >
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-md', action.color)}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-center text-[11px] md:text-xs font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Main content grid ─────────────────────────────────────── */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Left column (2/3): notices + career snapshot + fellow alumni */}
        <div className="space-y-4 md:space-y-6 lg:col-span-2">
          {/* Institute updates */}
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Bell className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="font-semibold leading-tight text-foreground">Institute Updates</h2>
                  <p className="text-xs text-muted-foreground">Latest notices for you</p>
                </div>
              </div>
              <button onClick={() => navigate('/dashboard/notices')} className="flex items-center gap-1 py-1 text-sm font-medium text-primary hover:underline">
                View All <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {notices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No new updates right now.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {notices.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => navigate('/dashboard/notices')}
                      className="flex w-full items-start gap-3 py-2.5 text-left transition-colors hover:bg-muted/40 rounded-lg px-2 -mx-2"
                    >
                      <span className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        n.priority === 'high' ? 'bg-red-500' : n.priority === 'normal' ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                      )} />
                      <span className="min-w-0 flex-1">
                        <span className={cn('line-clamp-1 text-sm text-foreground', !n.is_read ? 'font-semibold' : 'font-medium')}>
                          {n.title}
                        </span>
                        <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.content}</span>
                      </span>
                      <span className="mt-0.5 shrink-0 text-[11px] text-muted-foreground/80">{timeAgo(n.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* Career snapshot */}
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="font-semibold leading-tight text-foreground">Career Journey</h2>
                  <p className="text-xs text-muted-foreground">Your latest roles</p>
                </div>
              </div>
              <button onClick={() => navigate('/dashboard/alumni-profile')} className="flex items-center gap-1 py-1 text-sm font-medium text-primary hover:underline">
                Manage <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {(profile?.careers?.length || 0) === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <Briefcase className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No career entries yet.</p>
                <button
                  onClick={() => navigate('/dashboard/alumni-profile')}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400"
                >
                  Add your first role <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <ol className="relative space-y-4 pl-5">
                <span className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                {profile!.careers.slice(0, 3).map((c) => (
                  <li key={c.id} className="relative">
                    <span className={cn(
                      'absolute -left-5 top-1 h-3.5 w-3.5 rounded-full border-2 border-card',
                      c.current ? 'bg-emerald-500' : 'bg-teal-500',
                    )} />
                    <p className="text-sm font-semibold text-foreground">{c.position || c.degree || c.businessName || 'Role'}</p>
                    <p className="text-xs text-muted-foreground">
                      {(c.company || c.institution || c.businessType || '') as string}
                      {c.startDate ? ` · ${c.startDate}${c.current ? ' – Present' : c.endDate ? ` – ${c.endDate}` : ''}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            {/* Top skills inline */}
            {topSkills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {topSkills.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {s.name}
                    <span className="text-emerald-500/70 dark:text-emerald-400/70">{s.proficiency}%</span>
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* Fellow alumni — community preview from the directory */}
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="font-semibold leading-tight text-foreground">Fellow Alumni</h2>
                  <p className="text-xs text-muted-foreground">
                    {fellowCount > 0 ? `${fellowCount} alumni in the network` : 'Your alumni network'}
                  </p>
                </div>
              </div>
              <button onClick={() => navigate('/dashboard/alumni-directory')} className="flex items-center gap-1 py-1 text-sm font-medium text-primary hover:underline">
                Directory <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {fellows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <Users className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Browse the directory to connect with alumni.</p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {fellows.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => navigate('/dashboard/alumni-directory')}
                    className="flex items-center gap-3 rounded-xl border border-transparent bg-secondary/30 p-2.5 text-left transition-colors hover:border-border hover:bg-secondary/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {f.avatar
                        ? <img src={resolveFileUrl(f.avatar)} alt={f.name} className="h-full w-full object-cover" />
                        : (f.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {f.currentPosition?.title
                          ? `${f.currentPosition.title}${f.currentPosition.organization ? ` · ${f.currentPosition.organization}` : ''}`
                          : `${f.department}${f.graduationYear ? ` · ${f.graduationYear}` : ''}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right column (1/3): completion + links + community CTA */}
        <div className="space-y-4 md:space-y-6">
          {/* Profile completion */}
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="font-semibold text-foreground">Profile Completion</h2>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="14" className="stroke-muted" />
                  <motion.circle
                    cx="60" cy="60" r="52" fill="none" strokeWidth="14" strokeLinecap="round"
                    className={completion.percentage >= 100 ? 'stroke-emerald-500' : 'stroke-amber-500'}
                    strokeDasharray={2 * Math.PI * 52}
                    initial={false}
                    animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - completion.percentage / 100) }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
                  {completion.percentage}%
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {completion.percentage >= 100
                  ? 'Your profile looks great — nice work!'
                  : `${completion.completed} of ${completion.total} sections done.`}
              </p>
            </div>

            {completion.percentage < 100 && (
              <>
                <div className="mt-3 space-y-1.5">
                  {completion.nextSteps.slice(0, 3).map((item) => (
                    <div key={item.key} className="flex items-center gap-2 text-sm">
                      {item.done
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
                      <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/dashboard/alumni-profile')}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/15 dark:text-emerald-400"
                >
                  Complete your profile <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </motion.div>

          {/* Professional links */}
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Professional Links</h2>
            </div>
            <div className="flex flex-col gap-2">
              {profile?.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  <span className="inline-flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> LinkedIn</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              )}
              {profile?.portfolio && (
                <a href={profile.portfolio} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Portfolio</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              )}
              {!profile?.linkedin && !profile?.portfolio && (
                <button
                  onClick={() => navigate('/dashboard/alumni-profile')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Link2 className="h-4 w-4" /> Add your professional links
                </button>
              )}
            </div>
          </motion.div>

          {/* Community CTA */}
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 md:p-5"
          >
            <div className="pointer-events-none absolute -right-4 -top-4 opacity-10">
              <Users className="h-24 w-24 text-amber-500" />
            </div>
            <div className="relative">
              <h3 className="font-semibold text-foreground">Stay Connected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep your profile current so fellow alumni and the institute can reach you with opportunities.
              </p>
              <button
                onClick={() => navigate('/dashboard/alumni-profile')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-sm font-semibold text-amber-950 shadow-sm transition-transform hover:scale-[1.02]"
              >
                <Sparkles className="h-4 w-4" /> Update Profile
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
