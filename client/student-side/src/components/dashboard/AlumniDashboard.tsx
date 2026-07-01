import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap, Bell, MessageCircle, Briefcase, MapPin, Calendar,
  ArrowRight, BadgeCheck, Clock, UserCog, Building2, Sparkles,
  Award, TrendingUp, Code2, FolderOpen, Link2, ExternalLink,
  CheckCircle2, Circle, ChevronRight, Users, Rocket,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  alumniService, AlumniProfile, getProfileCompletion, ALUMNI_COVER_IMAGE,
} from '@/services/alumniService';
import { noticeService, Notice } from '@/services/noticeService';

/**
 * Alumni home dashboard — a premium, widget-rich landing experience that makes
 * an alumnus feel connected to the institute the moment they log in.
 *
 * Everything here is built from data the alumni system already exposes
 * (profile + notices), so it stays fully in sync with the profile page and the
 * admin portal without any backend changes.
 *
 * Palette: Friendly Ocean (blue is primary, amber is the brand accent). Hovers
 * stay neutral per the design system.
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

export function AlumniDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<AlumniProfile | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverError, setCoverError] = useState(false);

  useEffect(() => {
    let active = true;
    alumniService
      .getProfile()
      .then((p) => active && setProfile(p))
      .catch(() => active && setProfile(null))
      .finally(() => active && setLoading(false));

    noticeService
      .getRecentNotices()
      .then((n) => active && setNotices(n.slice(0, 4)))
      .catch(() => active && setNotices([]));

    return () => {
      active = false;
    };
  }, []);

  const name = profile?.name || user?.name || 'Alumnus';
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const department = profile?.department || '';
  const gradYear = profile?.graduationYear || '';
  const job = profile?.currentJob || '';
  const company = profile?.company || '';
  const location = profile?.location && profile.location !== 'N/A' ? profile.location : '';
  const verified = !!profile?.isVerified;
  const pending = profile?.reviewStatus === 'pending';
  const avatar = profile?.avatar || '';
  const cover = coverError ? '' : ALUMNI_COVER_IMAGE;

  const completion = useMemo(() => getProfileCompletion(profile), [profile]);

  // Derived engagement stats — all from real profile data.
  const currentYear = new Date().getFullYear();
  const gradYearNum = parseInt(gradYear, 10);
  const yearsSince = Number.isFinite(gradYearNum) && gradYearNum > 0 ? currentYear - gradYearNum : null;

  const stats = [
    {
      icon: Calendar,
      label: 'Years as alumnus',
      value: yearsSince === null ? '—' : yearsSince <= 0 ? 'New' : `${yearsSince}`,
      tone: 'blue' as const,
    },
    {
      icon: Briefcase,
      label: 'Career entries',
      value: String(profile?.careers?.length || 0),
      tone: 'amber' as const,
    },
    {
      icon: Code2,
      label: 'Skills listed',
      value: String(profile?.skills?.length || 0),
      tone: 'blue' as const,
    },
    {
      icon: Award,
      label: 'Certifications',
      value: String(profile?.courses?.length || 0),
      tone: 'amber' as const,
    },
  ];

  const actions = [
    { icon: UserCog, label: 'My Alumni Profile', desc: 'View & update your details', to: '/dashboard/alumni-profile', tone: 'blue' as const },
    { icon: Bell, label: 'Notices & Updates', desc: 'News from the institute', to: '/dashboard/notices', tone: 'amber' as const },
    { icon: FolderOpen, label: 'My Documents', desc: 'Certificates & records', to: '/dashboard/documents', tone: 'blue' as const },
    { icon: MessageCircle, label: 'Messages', desc: 'Stay in touch', to: '/dashboard/messages', tone: 'amber' as const },
  ];

  const topSkills = (profile?.skills || []).slice().sort((a, b) => (b.proficiency || 0) - (a.proficiency || 0)).slice(0, 5);

  return (
    <div className="space-y-5 md:space-y-6 max-w-full overflow-x-hidden pb-8">
      {/* ── Hero welcome ─────────────────────────────────────────── */}
      <motion.div
        {...fadeUp}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-6 text-white shadow-lg shadow-blue-500/20"
      >
        {cover && (
          <>
            <img
              src={cover}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              onError={() => setCoverError(true)}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-950/85 via-blue-900/75 to-blue-800/70" />
          </>
        )}
        <div className="pointer-events-none absolute -right-8 -top-10 opacity-10">
          <GraduationCap className="h-48 w-48" />
        </div>
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 text-xl font-bold ring-2 ring-white/25">
              {avatar ? <img src={avatar} alt={name} className="h-full w-full object-cover" /> : initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-100">{timeOfDayGreeting()}</p>
              <h1 className="truncate text-2xl font-bold">{name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-blue-50">
                {department && (
                  <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{department}</span>
                )}
                {gradYear && (
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Class of {gradYear}</span>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  verified ? 'bg-white/20' : 'bg-amber-400/90 text-amber-950'
                }`}>
                  {verified ? <><BadgeCheck className="h-3.5 w-3.5" /> Verified</> : <><Clock className="h-3.5 w-3.5" /> {pending ? 'Pending review' : 'Unverified'}</>}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/alumni-profile')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-transform hover:scale-[1.02]"
          >
            <UserCog className="h-4 w-4" /> Manage Profile
          </button>
        </div>

        {/* Current role strip */}
        {(job || company || location) && (
          <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/15 pt-3 text-sm text-blue-50">
            {job && <span className="inline-flex items-center gap-1.5 font-medium"><Briefcase className="h-4 w-4" />{job}{company ? ` · ${company}` : ''}</span>}
            {location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{location}</span>}
          </div>
        )}
      </motion.div>

      {/* ── Stat tiles ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            {...fadeUp}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              s.tone === 'amber' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none text-foreground">{s.value}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Completion + Notices row ─────────────────────────────── */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Profile completion */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Ring */}
            <div className="relative mx-auto h-28 w-28 shrink-0 sm:mx-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="12" className="stroke-muted" />
                <motion.circle
                  cx="60" cy="60" r="52" fill="none" strokeWidth="12" strokeLinecap="round"
                  className={completion.percentage >= 100 ? 'stroke-emerald-500' : 'stroke-blue-500'}
                  strokeDasharray={2 * Math.PI * 52}
                  initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - completion.percentage / 100) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{completion.percentage}%</span>
                <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">complete</span>
              </div>
            </div>

            {/* Checklist / next steps */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h2 className="font-semibold text-foreground">Profile completion</h2>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {completion.percentage >= 100
                  ? 'Your profile looks great — nice work!'
                  : `${completion.completed} of ${completion.total} sections done. A richer profile helps the institute keep in touch.`}
              </p>

              <div className="mt-3 space-y-1.5">
                {(completion.percentage >= 100 ? completion.items.slice(0, 3) : completion.nextSteps).map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-sm">
                    {item.done
                      ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
                    <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{item.label}</span>
                  </div>
                ))}
              </div>

              {completion.percentage < 100 && (
                <button
                  onClick={() => navigate('/dashboard/alumni-profile')}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-500/15 dark:text-blue-400"
                >
                  Complete your profile <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Recent notices */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Bell className="h-4 w-4" />
              </div>
              <h2 className="font-semibold text-foreground">Institute updates</h2>
            </div>
            <button onClick={() => navigate('/dashboard/notices')} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              View all
            </button>
          </div>

          {notices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No new updates right now.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {notices.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => navigate('/dashboard/notices')}
                    className="group flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-muted/60"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.priority === 'high' ? 'bg-red-500' : n.priority === 'normal' ? 'bg-blue-500' : 'bg-muted-foreground/40'
                    }`} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-medium text-foreground">{n.title}</span>
                      <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.content}</span>
                    </span>
                    {!n.is_read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>

      {/* ── Quick actions ────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Rocket className="h-4 w-4 text-blue-500" /> Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a, i) => (
            <motion.button
              key={a.to}
              {...fadeUp}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(a.to)}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                a.tone === 'amber' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              }`}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{a.label}</p>
                <p className="truncate text-xs text-muted-foreground">{a.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Career snapshot + Skills ─────────────────────────────── */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Career snapshot */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h2 className="font-semibold text-foreground">Career journey</h2>
            </div>
            <button onClick={() => navigate('/dashboard/alumni-profile')} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              Manage
            </button>
          </div>

          {(profile?.careers?.length || 0) === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Briefcase className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No career entries yet.</p>
              <button
                onClick={() => navigate('/dashboard/alumni-profile')}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-500/15 dark:text-blue-400"
              >
                Add your first role <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <ol className="relative space-y-4 pl-5">
              <span className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
              {profile!.careers.slice(0, 3).map((c) => (
                <li key={c.id} className="relative">
                  <span className={`absolute -left-5 top-1 h-3.5 w-3.5 rounded-full border-2 border-card ${c.current ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  <p className="text-sm font-semibold text-foreground">{c.position || c.degree || c.businessName || 'Role'}</p>
                  <p className="text-xs text-muted-foreground">
                    {(c.company || c.institution || c.businessType || '') as string}
                    {c.startDate ? ` · ${c.startDate}${c.current ? ' – Present' : c.endDate ? ` – ${c.endDate}` : ''}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </motion.div>

        {/* Skills + links */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Code2 className="h-4 w-4" />
              </div>
              <h2 className="font-semibold text-foreground">Skills & links</h2>
            </div>
            <button onClick={() => navigate('/dashboard/alumni-profile')} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              Edit
            </button>
          </div>

          {topSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <Code2 className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No skills added yet.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topSkills.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                  {s.name}
                  <span className="text-blue-500/70 dark:text-blue-400/70">{s.proficiency}%</span>
                </span>
              ))}
            </div>
          )}

          {/* Professional links */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {profile?.linkedin ? (
              <a href={profile.linkedin} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                <Link2 className="h-3.5 w-3.5" /> LinkedIn <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            ) : null}
            {profile?.portfolio ? (
              <a href={profile.portfolio} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                <Link2 className="h-3.5 w-3.5" /> Portfolio <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            ) : null}
            {!profile?.linkedin && !profile?.portfolio && (
              <button
                onClick={() => navigate('/dashboard/alumni-profile')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Link2 className="h-3.5 w-3.5" /> Add your professional links
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Community / engagement banner ────────────────────────── */}
      <motion.div
        {...fadeUp}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5"
      >
        <div className="pointer-events-none absolute -right-6 -top-6 opacity-10">
          <Users className="h-32 w-32 text-amber-500" />
        </div>
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Stay part of the community</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Keep your profile current so fellow alumni and the institute can connect with you and share opportunities.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/alumni-profile')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition-transform hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" /> Update Profile
          </button>
        </div>
      </motion.div>
    </div>
  );
}
