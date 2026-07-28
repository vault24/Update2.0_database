import { motion } from 'framer-motion';
import {
  Award, Briefcase, Building2, Calendar, ExternalLink, GraduationCap, Link2,
  MapPin, MoreHorizontal, Sparkles, Star, TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * The read-only rendering of a student's own Career & Portfolio sections on
 * their PUBLIC profile: Career Journey, Skills & Expertise, Courses &
 * Certifications and Career Highlights.
 *
 * The data is exactly what the student entered from their profile page (the
 * backend serves it under `portfolio`). A section with no entries is not
 * rendered at all, so an empty profile stays clean rather than showing a wall
 * of "no data" cards.
 */

export interface PublicPortfolioCareer {
  id?: string;
  type?: string;
  position?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  degree?: string;
  field?: string;
  institution?: string;
  businessName?: string;
  businessType?: string;
  otherType?: string;
  achievements?: string[];
  /** Insertion stamp — drives the same "newest first" order as the profile page. */
  addedAt?: string;
}

export interface PublicPortfolioSkill {
  id?: string;
  name: string;
  category?: string;
}

export interface PublicPortfolioCourse {
  id?: string;
  name: string;
  provider?: string;
  status?: string;
  completionDate?: string;
  certificateUrl?: string;
  description?: string;
}

export interface PublicPortfolioHighlight {
  id?: string;
  title: string;
  description?: string;
  date?: string;
  type?: string;
}

export interface PublicPortfolio {
  bio?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  careers?: PublicPortfolioCareer[];
  skills?: PublicPortfolioSkill[];
  courses?: PublicPortfolioCourse[];
  highlights?: PublicPortfolioHighlight[];
}

/** Whether there is anything at all worth rendering. */
export function hasPortfolioContent(p?: PublicPortfolio | null): boolean {
  if (!p) return false;
  return Boolean(
    p.bio ||
    p.linkedinUrl ||
    p.portfolioUrl ||
    p.careers?.length ||
    p.skills?.length ||
    p.courses?.length ||
    p.highlights?.length
  );
}

/** "Mar 2024" from a "2024-03" / ISO-ish month value; passthrough otherwise. */
function formatMonth(value?: string): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{1,2})/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function dateRange(start?: string, end?: string, current?: boolean): string {
  const from = formatMonth(start);
  const to = current ? 'Present' : formatMonth(end);
  if (from && to) return `${from} — ${to}`;
  return from || to || '';
}

/** Headline for one career entry, whichever kind it is. */
function careerTitle(c: PublicPortfolioCareer): string {
  return (
    c.position ||
    c.degree ||
    c.businessName ||
    c.otherType ||
    (c.type ? c.type.replace(/_/g, ' ') : '') ||
    'Experience'
  );
}

/** Organization line — the institution/business stands in for the company. */
function careerOrganization(c: PublicPortfolioCareer): string {
  return c.company || c.institution || c.businessName || '';
}

// Type presentation, mirrored from the profile page's CareerTimeline so the
// public profile reads exactly like the private one.
const CAREER_TYPE_META: Record<string, { icon: typeof Briefcase; dot: string; label: string; badge: string }> = {
  job: {
    icon: Briefcase, dot: 'bg-emerald-500', label: 'Employment',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  higherStudies: {
    icon: GraduationCap, dot: 'bg-teal-500', label: 'Education',
    badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  },
  business: {
    icon: Building2, dot: 'bg-amber-500', label: 'Business',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
};

const CAREER_TYPE_FALLBACK = {
  icon: MoreHorizontal, dot: 'bg-gray-500', label: 'Other',
  badge: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const careerMeta = (type?: string) => CAREER_TYPE_META[type || ''] || CAREER_TYPE_FALLBACK;

/**
 * Same order the profile page shows: most recently ADDED first, falling back
 * to start date for entries saved before the insertion stamp existed.
 */
function orderCareers(careers: PublicPortfolioCareer[]): PublicPortfolioCareer[] {
  return [...careers].sort((a, b) => {
    const stamp = (b.addedAt || '').localeCompare(a.addedAt || '');
    if (stamp !== 0) return stamp;
    return (b.startDate || '').localeCompare(a.startDate || '');
  });
}

function Section({
  icon: Icon,
  title,
  count,
  children,
  delay = 0,
}: {
  icon: typeof Briefcase;
  title: string;
  count?: number;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-card"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
        <span>{title}</span>
        {count ? (
          <Badge variant="secondary" className="ml-auto text-xs">{count}</Badge>
        ) : null}
      </h3>
      {children}
    </motion.section>
  );
}

export function PublicPortfolioSections({ portfolio }: { portfolio?: PublicPortfolio | null }) {
  if (!hasPortfolioContent(portfolio)) return null;
  const p = portfolio as PublicPortfolio;

  const careers = p.careers ?? [];
  const skills = p.skills ?? [];
  const courses = p.courses ?? [];
  const highlights = p.highlights ?? [];

  // Skills grouped by their category so related ones sit together.
  const skillGroups = skills.reduce<Record<string, PublicPortfolioSkill[]>>((acc, s) => {
    const key = (s.category || 'Other').replace(/_/g, ' ');
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  return (
    <>
      {(p.bio || p.linkedinUrl || p.portfolioUrl) && (
        <Section icon={Sparkles} title="Profile" delay={0.25}>
          {p.bio && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{p.bio}</p>
          )}
          {(p.linkedinUrl || p.portfolioUrl) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {p.linkedinUrl && (
                <a
                  href={p.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-primary hover:underline"
                >
                  <Link2 className="w-3.5 h-3.5" /> LinkedIn
                </a>
              )}
              {p.portfolioUrl && (
                <a
                  href={p.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Portfolio
                </a>
              )}
            </div>
          )}
        </Section>
      )}

      {careers.length > 0 && (
        <Section icon={Briefcase} title="Career Journey" count={careers.length} delay={0.3}>
          {/* Same timeline treatment as the profile page's CareerTimeline. */}
          <div className="relative">
            <div className="absolute left-[15px] sm:left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
            <div className="space-y-5">
              {orderCareers(careers).map((c, i) => {
                const meta = careerMeta(c.type);
                const Icon = meta.icon;
                const org = careerOrganization(c);
                return (
                  <div key={c.id || i} className="relative pl-10 sm:pl-12 min-w-0">
                    <div className={`absolute left-0 top-1 w-8 h-8 sm:w-10 sm:h-10 rounded-full ${meta.dot} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>

                    <div className="p-3 sm:p-4 rounded-xl bg-muted/50 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                        <h4 className="font-semibold text-sm sm:text-base text-foreground break-words">
                          {careerTitle(c)}
                        </h4>
                        {c.current && (
                          <Badge className="bg-primary/10 text-primary text-[10px]">Current</Badge>
                        )}
                        <Badge className={`${meta.badge} text-[10px]`}>{meta.label}</Badge>
                      </div>

                      {org && (
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium break-words">{org}</p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
                        {c.location && (
                          <span className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            <span className="truncate">{c.location}</span>
                          </span>
                        )}
                        {dateRange(c.startDate, c.endDate, c.current) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            {dateRange(c.startDate, c.endDate, c.current)}
                          </span>
                        )}
                      </div>

                      {c.description && (
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground whitespace-pre-line break-words">
                          {c.description}
                        </p>
                      )}

                      {c.achievements && c.achievements.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {c.achievements.map((a, j) => (
                            <div key={j} className="flex items-start gap-2 text-xs sm:text-sm">
                              <Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                              <span className="text-muted-foreground break-words">{a}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Type-specific detail, matching the profile page.
                          Salary is deliberately never published. */}
                      {c.type === 'higherStudies' && (c.degree || c.field) && (
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground break-words">
                          <span className="font-medium">Program:</span>{' '}
                          {[c.degree, c.field].filter(Boolean).join(' — ')}
                        </p>
                      )}
                      {c.type === 'business' && c.businessType && (
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground break-words">
                          <span className="font-medium">Business type:</span> {c.businessType}
                        </p>
                      )}
                      {c.type === 'other' && c.otherType && (
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground break-words">
                          <span className="font-medium">Type:</span> {c.otherType}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {skills.length > 0 && (
        <Section icon={TrendingUp} title="Skills & Expertise" count={skills.length} delay={0.35}>
          <div className="space-y-3">
            {Object.entries(skillGroups).map(([group, items]) => (
              <div key={group}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  {group}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((s, i) => (
                    <Badge key={s.id || i} variant="secondary" className="text-xs">{s.name}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {courses.length > 0 && (
        <Section icon={GraduationCap} title="Courses & Certifications" count={courses.length} delay={0.4}>
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((c, i) => (
              <div key={c.id || i} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm break-words">{c.name}</p>
                  {c.status && (
                    <Badge
                      variant={c.status.toLowerCase() === 'completed' ? 'success' : 'secondary'}
                      className="text-[10px] capitalize shrink-0"
                    >
                      {c.status.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                {c.provider && (
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{c.provider}</p>
                )}
                {c.completionDate && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatMonth(c.completionDate)}
                  </p>
                )}
                {c.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-line">
                    {c.description}
                  </p>
                )}
                {c.certificateUrl && (
                  <a
                    href={c.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="w-3 h-3" /> View certificate
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {highlights.length > 0 && (
        <Section icon={Award} title="Career Highlights" count={highlights.length} delay={0.45}>
          <div className="space-y-3">
            {highlights.map((h, i) => (
              <div key={h.id || i} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="font-medium text-sm break-words">{h.title}</p>
                    {h.type && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {h.type.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  {h.date && (
                    <p className="text-[11px] text-muted-foreground">{formatMonth(h.date)}</p>
                  )}
                  {h.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 whitespace-pre-line">
                      {h.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

export default PublicPortfolioSections;
