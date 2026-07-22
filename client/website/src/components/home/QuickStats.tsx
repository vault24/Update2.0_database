import { GraduationCap, Users2, Building2, Award, UserRound, UserRoundCheck } from "lucide-react";
import { useAnalytics } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui/Container";
import { Counter } from "@/components/ui/Counter";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";

export function QuickStats() {
  const { data, isLoading } = useAnalytics();
  const { t } = useI18n();

  const tiles = data
    ? [
        { icon: GraduationCap, value: data.students.total, label: t("stats.students") },
        { icon: Users2, value: data.teachers.total, label: t("stats.teachers") },
        { icon: Building2, value: data.departments.total, label: t("stats.departments") },
        { icon: Award, value: data.students.graduated, label: t("stats.graduates") },
        { icon: UserRound, value: data.students.male, label: "Male" },
        { icon: UserRoundCheck, value: data.students.female, label: "Female" },
      ]
    : [];

  return (
    <section className="pt-12 sm:pt-16">
      <Container>
        <div className="glass rounded-3xl p-6 shadow-glass sm:p-8">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
              {tiles.map((tile, i) => (
                <Reveal key={tile.label} delay={i * 0.05}>
                  <div className="flex flex-col items-center text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                      <tile.icon className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-3xl font-bold text-foreground">
                      <Counter to={tile.value} />
                    </p>
                    <p className="text-sm text-muted-foreground">{tile.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
