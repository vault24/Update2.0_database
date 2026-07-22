import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, CalendarDays, FileDown, GraduationCap, Layers } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useDepartments, useDownloads } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";

export default function AcademicsPage() {
  const { data: departments } = useDepartments();
  const { data: academicFiles } = useDownloads();
  const { t } = useI18n();

  const files = (academicFiles ?? []).filter((d) => ["calendar", "syllabus", "routine"].includes(d.category)).slice(0, 6);

  return (
    <>
      <PageHeader
        title={t("nav.academicInfo")}
        subtitle="Four-year diploma-in-engineering programmes under the Bangladesh Technical Education Board (BTEB)."
        crumbs={[{ label: t("nav.academics") }]}
      />
      <Container className="section space-y-14">
        {/* Programme structure */}
        <section className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: Layers, title: "8 Semesters", desc: "A four-year diploma programme divided into eight semesters with continuous assessment." },
            { icon: BookOpenCheck, title: "BTEB Curriculum", desc: "The national diploma-in-engineering curriculum with modern, industry-aligned subjects." },
            { icon: GraduationCap, title: "Industrial Attachment", desc: "The final phase includes hands-on industrial training with partner organisations." },
          ].map((x, i) => (
            <Reveal key={x.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-card">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary"><x.icon className="h-6 w-6" /></span>
                <h2 className="mt-4 text-lg font-semibold text-foreground">{x.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{x.desc}</p>
              </div>
            </Reveal>
          ))}
        </section>

        {/* Programmes (departments) */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="heading-serif text-2xl text-foreground sm:text-3xl">Programmes</h2>
            <Link to="/departments"><Button variant="outline" size="sm">{t("cta.viewAll")} <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(departments ?? []).map((d) => (
              <Link
                key={d.id}
                to={`/departments/${d.code}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-lift"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">{d.code}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold capitalize text-foreground group-hover:text-primary">{d.name}</p>
                  <p className="text-xs text-muted-foreground">Diploma in Engineering</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Academic files */}
        {files.length > 0 && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="heading-serif flex items-center gap-2.5 text-2xl text-foreground sm:text-3xl">
                <CalendarDays className="h-6 w-6 text-primary" /> Academic Calendar & Files
              </h2>
              <Link to="/downloads"><Button variant="outline" size="sm">{t("cta.viewAll")}</Button></Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {files.map((f) => (
                <a
                  key={f.id}
                  href={f.file ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><FileDown className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground group-hover:text-primary">{f.title_en}</span>
                  <span className="text-xs uppercase text-muted-foreground">{f.category}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
