import { FlaskConical, Cpu, Briefcase, BookOpenCheck, ShieldCheck, Trophy } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const FEATURES = [
  { icon: FlaskConical, en: "Modern Laboratories", desc: "Well-equipped labs and workshops for hands-on technical training across every department." },
  { icon: Cpu, en: "Industry-Aligned Curriculum", desc: "BTEB diploma programmes designed with current industry needs and emerging technologies." },
  { icon: Briefcase, en: "Career & Placement", desc: "Industrial attachment, career guidance and strong links with employers nationwide." },
  { icon: BookOpenCheck, en: "Experienced Faculty", desc: "Dedicated instructors combining academic depth with real engineering practice." },
  { icon: ShieldCheck, en: "Government Institution", desc: "A trusted public polytechnic under the Bangladesh Technical Education Board." },
  { icon: Trophy, en: "Proven Excellence", desc: "A track record of skills-competition winners and successful diploma graduates." },
];

export function WhyChoose() {
  const { t } = useI18n();
  return (
    <section className="section">
      <Container>
        <SectionHeading eyebrow={t("section.why")} title={t("section.why")} description={t("section.whyDesc")} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.en} delay={i * 0.06}>
              <article className="group h-full rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{f.en}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
