import { Hero } from "@/components/home/Hero";
import { QuickStats } from "@/components/home/QuickStats";
import { WhyChoose } from "@/components/home/WhyChoose";
import { DepartmentsPreview } from "@/components/home/DepartmentsPreview";
import { PrincipalMessage } from "@/components/home/PrincipalMessage";
import { NoticesEvents } from "@/components/home/NoticesEvents";
import { TeachersPreview } from "@/components/home/TeachersPreview";
import { AchievementsPreview } from "@/components/home/AchievementsPreview";
import { GalleryPreview } from "@/components/home/GalleryPreview";
import { CtaStrip } from "@/components/home/CtaStrip";

export default function Home() {
  return (
    <>
      <Hero />
      <QuickStats />
      <WhyChoose />
      <DepartmentsPreview />
      <PrincipalMessage />
      <NoticesEvents />
      <TeachersPreview />
      <AchievementsPreview />
      <GalleryPreview />
      <CtaStrip />
    </>
  );
}
