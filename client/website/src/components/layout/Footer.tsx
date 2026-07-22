import { Link } from "react-router-dom";
import { Facebook, Youtube, Linkedin, MapPin, Phone, Mail } from "lucide-react";
import { FOOTER_LINKS, SITE } from "@/config/site";
import { useI18n } from "@/i18n/LanguageProvider";
import { useSiteSettings } from "@/hooks/useApi";
import { Seal } from "@/components/brand/Seal";

export function Footer() {
  const { t, locale } = useI18n();
  const { data: s } = useSiteSettings();
  const name = s?.institute?.name || SITE.name;

  return (
    <footer className="mt-8 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12"><Seal src={s?.institute?.logo} /></div>
            <div>
              <p className="heading-serif font-semibold">{locale === "bn" ? SITE.nameBn : name}</p>
              <p className="text-xs text-white/70">{SITE.domain}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-primary-foreground/70">{t("footer.builtBy")}</p>
          <div className="mt-4 flex gap-2">
            {s?.facebook_url && <SocialIcon href={s.facebook_url} Icon={Facebook} />}
            {s?.youtube_url && <SocialIcon href={s.youtube_url} Icon={Youtube} />}
            {s?.linkedin_url && <SocialIcon href={s.linkedin_url} Icon={Linkedin} />}
          </div>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/70">{t("footer.quickLinks")}</p>
          <ul className="space-y-2 text-sm">
            {FOOTER_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-primary-foreground/75 hover:text-primary-foreground">{t(item.key)}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/70">{t("footer.portals")}</p>
          <ul className="space-y-2 text-sm">
            <li><a href={s?.student_portal_url || SITE.studentPortal} className="text-primary-foreground/75 hover:text-primary-foreground" target="_blank" rel="noreferrer">{t("cta.studentLogin")}</a></li>
            <li><a href={s?.result_portal_url || SITE.resultPortal} className="text-primary-foreground/75 hover:text-primary-foreground" target="_blank" rel="noreferrer">{t("nav.results")}</a></li>
            <li><a href={s?.admin_portal_url || SITE.adminPortal} className="text-primary-foreground/75 hover:text-primary-foreground" target="_blank" rel="noreferrer">{t("cta.adminLogin")}</a></li>
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/70">{t("footer.contact")}</p>
          <ul className="space-y-3 text-sm text-primary-foreground/75">
            {(s?.institute?.address || s?.contact_address_en) && (
              <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-white/70" /> {s?.institute?.address || s?.contact_address_en}</li>
            )}
            {(s?.institute?.phone || s?.contact_phone) && (
              <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-white/70" /> {s?.institute?.phone || s?.contact_phone}</li>
            )}
            {(s?.institute?.email || s?.contact_email) && (
              <li className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-white/70" /> {s?.institute?.email || s?.contact_email}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-2 px-5 py-4 text-xs text-primary-foreground/60 sm:flex-row">
          <p>© {new Date().getFullYear()} {name}. {t("footer.rights")}</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-primary-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-primary-foreground">Terms</Link>
            <Link to="/faq" className="hover:text-primary-foreground">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ href, Icon }: { href: string; Icon: typeof Facebook }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/25">
      <Icon className="h-4 w-4" />
    </a>
  );
}
