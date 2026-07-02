import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, Loader2, GraduationCap, Building2, MapPin, Briefcase,
  BadgeCheck, Filter, X, Frown, Mail, Phone, Linkedin, Globe, Award,
  Code2, Sparkles,
} from 'lucide-react';
import {
  alumniService, AlumniDirectoryEntry, AlumniPublicProfile, ALUMNI_COVER_IMAGE,
} from '@/services/alumniService';
import { departmentService, Department } from '@/services/departmentService';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

/**
 * Alumni Directory — a searchable, filterable network of fellow graduates.
 * Backed by the privacy-conscious `/alumni/directory/` endpoint (approved
 * alumni only, no contact PII). Friendly Ocean palette.
 */
export default function AlumniDirectoryPage() {
  const [entries, setEntries] = useState<AlumniDirectoryEntry[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [q, setQ] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('');

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AlumniPublicProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const openDetail = (id: string) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    alumniService
      .getPublicProfile(id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  useEffect(() => {
    departmentService.getAll().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  const fetchDirectory = () => {
    setLoading(true);
    alumniService
      .getDirectory({ q, department, graduationYear: year, alumniType: type })
      .then((res) => {
        setEntries(res.results || []);
        setCount(res.count || 0);
      })
      .catch(() => {
        setEntries([]);
        setCount(0);
      })
      .finally(() => setLoading(false));
  };

  // Debounced fetch on filter changes.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchDirectory, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, department, year, type]);

  const hasFilters = !!(q || department || year || type);
  const clearFilters = () => { setQ(''); setDepartment(''); setYear(''); setType(''); };

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 30 }, (_, i) => now - i);
  }, []);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-6 text-white shadow-lg shadow-blue-500/20"
      >
        <div className="pointer-events-none absolute -right-8 -top-10 opacity-10">
          <Users className="h-44 w-44" />
        </div>
        <div className="relative">
          <h1 className="text-2xl font-bold">Alumni Directory</h1>
          <p className="mt-1 text-sm text-blue-50">
            Discover and connect with {count > 0 ? `${count} ` : ''}fellow graduates across departments and years.
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or department…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="">All years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="">All types</option>
              <option value="recent">Recent Graduate</option>
              <option value="established">Established Professional</option>
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading directory…</p>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            {hasFilters ? <Frown className="h-7 w-7 text-muted-foreground" /> : <Users className="h-7 w-7 text-muted-foreground" />}
          </div>
          <div>
            <p className="font-semibold text-foreground">{hasFilters ? 'No alumni match your filters' : 'No alumni to show yet'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters ? 'Try adjusting or clearing your filters.' : 'Approved alumni will appear here as the community grows.'}
            </p>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-500/15 dark:text-blue-400">
              <Filter className="h-4 w-4" /> Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {entries.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              onClick={() => openDetail(a.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') openDetail(a.id); }}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-md"
            >
              {/* Cover — fixed institute banner */}
              <div className="relative h-20 bg-gradient-to-br from-blue-600 to-blue-500">
                <img src={ALUMNI_COVER_IMAGE} alt="" className="h-full w-full object-cover" />
                {/* Avatar */}
                <div className="absolute -bottom-7 left-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-blue-500/10 text-sm font-bold text-blue-600 dark:text-blue-400">
                    {a.avatar ? <img src={a.avatar} alt={a.name} className="h-full w-full object-cover" /> : getInitials(a.name)}
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 pt-9">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate font-semibold text-foreground">{a.name}</h3>
                  {a.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" />}
                </div>

                {(a.currentPosition.title || a.currentPosition.organization) && (
                  <p className="mt-0.5 line-clamp-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 shrink-0" />
                    {a.currentPosition.title}
                    {a.currentPosition.title && a.currentPosition.organization ? ' · ' : ''}
                    {a.currentPosition.organization}
                  </p>
                )}

                <div className="mt-2 space-y-1">
                  {a.department && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{a.department}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    {a.graduationYear && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0" /> {a.graduationYear}
                      </p>
                    )}
                    {a.location && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{a.location}</span>
                      </p>
                    )}
                  </div>
                </div>

                {a.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.skills.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[0.7rem] font-medium text-blue-700 dark:text-blue-300">
                        {s}
                      </span>
                    ))}
                    {a.skills.length > 3 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
                        +{a.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
          {/* Always present so the dialog stays accessible in every state */}
          <DialogHeader className="sr-only">
            <DialogTitle>{detail?.name || 'Alumni profile'}</DialogTitle>
            <DialogDescription>Alumni profile details and contact information.</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center gap-2 py-20 text-center">
              <Frown className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Couldn't load this profile.</p>
            </div>
          ) : (
            <div className="max-h-[90vh] overflow-y-auto">

              {/* Cover + avatar — fixed institute banner */}
              <div className="relative h-28 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500">
                <img src={ALUMNI_COVER_IMAGE} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="px-6 pb-6">
                <div className="-mt-10 flex items-end gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-blue-500/10 text-lg font-bold text-blue-600 dark:text-blue-400">
                    {detail.avatar ? <img src={detail.avatar} alt={detail.name} className="h-full w-full object-cover" /> : getInitials(detail.name)}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xl font-bold text-foreground">{detail.name}</h2>
                      {detail.isVerified && <BadgeCheck className="h-4 w-4 text-emerald-500" />}
                    </div>
                    {(detail.currentPosition.title || detail.currentPosition.organization) && (
                      <p className="text-sm text-muted-foreground">
                        {detail.currentPosition.title}
                        {detail.currentPosition.title && detail.currentPosition.organization ? ' at ' : ''}
                        {detail.currentPosition.organization}
                      </p>
                    )}
                  </div>
                </div>

                {/* Meta chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {detail.department && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" /> {detail.department}
                    </span>
                  )}
                  {detail.graduationYear && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5" /> Class of {detail.graduationYear}
                    </span>
                  )}
                  {detail.location && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {detail.location}
                    </span>
                  )}
                </div>

                {/* Bio */}
                {detail.bio && (
                  <p className="mt-4 rounded-xl bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">{detail.bio}</p>
                )}

                {/* Contact / connect */}
                <div className="mt-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Connect
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detail.email && (
                      <a href={`mailto:${detail.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted">
                        <Mail className="h-4 w-4" /> Email
                      </a>
                    )}
                    {detail.phone && (
                      <a href={`tel:${detail.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted">
                        <Phone className="h-4 w-4" /> {detail.phone}
                      </a>
                    )}
                    {detail.linkedin && (
                      <a href={detail.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted">
                        <Linkedin className="h-4 w-4" /> LinkedIn
                      </a>
                    )}
                    {detail.portfolio && (
                      <a href={detail.portfolio} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted">
                        <Globe className="h-4 w-4" /> Portfolio
                      </a>
                    )}
                    {!detail.email && !detail.phone && !detail.linkedin && !detail.portfolio && (
                      <p className="text-sm text-muted-foreground">No contact details shared.</p>
                    )}
                  </div>
                </div>

                {/* Skills */}
                {detail.allSkills.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Code2 className="h-3.5 w-3.5 text-blue-500" /> Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.allSkills.map((s) => (
                        <span key={s.name} className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Career */}
                {detail.careers.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5 text-blue-500" /> Career & studies
                    </h3>
                    <ol className="relative space-y-3 pl-5">
                      <span className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                      {detail.careers.map((c) => (
                        <li key={c.id || `${c.title}-${c.startDate}`} className="relative">
                          <span className={`absolute -left-5 top-1 h-3.5 w-3.5 rounded-full border-2 border-card ${c.isCurrent ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                          <p className="text-sm font-semibold text-foreground">{c.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.organization}
                            {c.startDate ? ` · ${c.startDate}${c.isCurrent ? ' – Present' : c.endDate ? ` – ${c.endDate}` : ''}` : ''}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Highlights */}
                {detail.highlights.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Award className="h-3.5 w-3.5 text-amber-500" /> Highlights
                    </h3>
                    <ul className="space-y-2">
                      {detail.highlights.map((h, idx) => (
                        <li key={idx} className="rounded-xl bg-muted/40 p-3">
                          <p className="text-sm font-medium text-foreground">{h.title}</p>
                          {h.description && <p className="mt-0.5 text-xs text-muted-foreground">{h.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
