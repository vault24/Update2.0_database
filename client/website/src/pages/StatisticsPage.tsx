import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, GraduationCap, Award, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Counter } from "@/components/ui/Counter";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { useAnalytics } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

/* Palette validated with the dataviz six-checks (light surface):
   green #0E8A63 (primary series) + gold #C08A0A (second series).
   Gold sits below 3:1 vs surface → every chart carries direct labels and the
   department section ships a full table view. */
const GREEN = "#0E8A63";
const GOLD = "#C08A0A";

export default function StatisticsPage() {
  const { data, isLoading } = useAnalytics();
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        title={t("nav.statistics")}
        subtitle="Live institutional statistics — updated automatically from the academic database."
        crumbs={[{ label: t("nav.statistics") }]}
      />
      <Container className="section space-y-14">
        {isLoading || !data ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <>
            {/* Overview tiles */}
            <section aria-label="Overview">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile icon={GraduationCap} label={`${t("stats.students")} (current)`} value={data.students.current} />
                <StatTile icon={Award} label={t("stats.graduates")} value={data.students.graduated} />
                <StatTile icon={Users2} label={t("stats.teachers")} value={data.teachers.total} />
                <StatTile icon={Building2} label={t("stats.departments")} value={data.departments.total} />
              </div>
            </section>

            {/* Gender split — two validated series, direct labels */}
            <section aria-label="Gender distribution">
              <ChartCard title="Current students by gender">
                <div className="space-y-4">
                  <div className="flex h-10 w-full overflow-hidden rounded-full border border-border">
                    {(() => {
                      const total = Math.max(data.students.male + data.students.female, 1);
                      const m = (data.students.male / total) * 100;
                      const f = (data.students.female / total) * 100;
                      return (
                        <>
                          {m > 0 && (
                            <div style={{ width: `${m}%`, background: GREEN }} className="grid place-items-center text-xs font-semibold text-white">
                              {m >= 14 && `Male ${data.students.male}`}
                            </div>
                          )}
                          {f > 0 && (
                            <div style={{ width: `${f}%`, background: GOLD, marginLeft: 2 }} className="grid place-items-center text-xs font-semibold text-white">
                              {f >= 14 && `Female ${data.students.female}`}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm" style={{ background: GREEN }} /> Male · {data.students.male}</span>
                    <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm" style={{ background: GOLD }} /> Female · {data.students.female}</span>
                    {data.students.other > 0 && <span>Other · {data.students.other}</span>}
                  </div>
                </div>
              </ChartCard>
            </section>

            {/* Semester distribution */}
            <section id="analytics" aria-label="Semester distribution" className="scroll-mt-24">
              <ChartCard title="Current students by semester">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(data.students.by_semester).map(([s, n]) => ({ name: `Sem ${s}`, students: n }))} margin={{ top: 24, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="hsl(165 22% 90%)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#6b7a76", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#6b7a76", fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "hsl(165 20% 94% / 0.6)" }} contentStyle={{ borderRadius: 12, border: "1px solid #dde7e4" }} />
                    <Bar dataKey="students" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={44}>
                      <LabelList dataKey="students" position="top" fill="#243b35" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>

            {/* Department breakdown — chart + table view */}
            <section id="departments" aria-label="Department statistics" className="scroll-mt-24 space-y-6">
              <ChartCard title="Students by department">
                <ResponsiveContainer width="100%" height={Math.max(200, data.departments.breakdown.length * 56)}>
                  <BarChart
                    layout="vertical"
                    data={data.departments.breakdown.map((d) => ({ name: d.code, students: d.students }))}
                    margin={{ top: 8, right: 40 }}
                  >
                    <CartesianGrid horizontal={false} stroke="hsl(165 22% 90%)" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#6b7a76", fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={64} tickLine={false} axisLine={false} tick={{ fill: "#243b35", fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "hsl(165 20% 94% / 0.6)" }} contentStyle={{ borderRadius: 12, border: "1px solid #dde7e4" }} />
                    <Bar dataKey="students" fill={GREEN} radius={[0, 4, 4, 0]} maxBarSize={22}>
                      <LabelList dataKey="students" position="right" fill="#243b35" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-5 py-3.5 font-medium">Department</th>
                      <th className="px-5 py-3.5 font-medium">Code</th>
                      <th className="px-5 py-3.5 text-right font-medium">{t("stats.students")}</th>
                      <th className="px-5 py-3.5 text-right font-medium">{t("stats.teachers")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.departments.breakdown.map((d) => (
                      <tr key={d.code} className="border-b border-border/60 last:border-0">
                        <td className="px-5 py-3.5 font-medium capitalize text-foreground">{d.name}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{d.code}</td>
                        <td className="px-5 py-3.5 text-right text-foreground">{d.students}</td>
                        <td className="px-5 py-3.5 text-right text-foreground">{d.teachers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </Container>
    </>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Users2; label: string; value: number }) {
  return (
    <Reveal>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-3xl font-bold text-foreground"><Counter to={value} /></p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </Reveal>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
      <h2 className="mb-6 text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}
