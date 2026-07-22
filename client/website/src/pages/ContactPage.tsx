import { Facebook, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSiteSettings } from "@/hooks/useApi";
import { useI18n } from "@/i18n/LanguageProvider";
import { SITE } from "@/config/site";

export default function ContactPage() {
  const { data: s, isLoading } = useSiteSettings();
  const { t, pick } = useI18n();

  const address = s?.institute?.address || pick(s ?? null, "contact_address");
  const phone = s?.contact_phone || s?.institute?.phone;
  const email = s?.contact_email || s?.institute?.email;

  return (
    <>
      <PageHeader title={t("section.contact")} crumbs={[{ label: t("nav.contact") }]} />
      <Container className="section">
        {isLoading ? (
          <Skeleton className="h-72" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <ContactRow icon={MapPin} label="Address" value={address || "Sirajganj, Bangladesh"} />
              {phone && <ContactRow icon={Phone} label="Phone" value={phone} href={`tel:${phone}`} />}
              {email && <ContactRow icon={Mail} label="Email" value={email} href={`mailto:${email}`} />}

              {(s?.facebook_url || s?.youtube_url || s?.linkedin_url) && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <p className="mb-4 font-semibold text-foreground">Follow us</p>
                  <div className="flex gap-3">
                    {s?.facebook_url && <Social href={s.facebook_url} Icon={Facebook} />}
                    {s?.youtube_url && <Social href={s.youtube_url} Icon={Youtube} />}
                    {s?.linkedin_url && <Social href={s.linkedin_url} Icon={Linkedin} />}
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border shadow-card">
              {s?.map_embed_url ? (
                <iframe
                  src={s.map_embed_url}
                  title={`${SITE.shortName} map`}
                  className="h-full min-h-[22rem] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <img src="/cover-image1.jpg" alt="Campus" className="h-full min-h-[22rem] w-full object-cover" />
              )}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}

function ContactRow({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string; href?: string }) {
  const body = (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-card transition-colors hover:border-primary/30">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="truncate font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
  return href ? <a href={href}>{body}</a> : body;
}

function Social({ href, Icon }: { href: string; Icon: typeof Facebook }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
      <Icon className="h-5 w-5" />
    </a>
  );
}
