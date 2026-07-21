import type { DictKey } from "@/i18n/dict";

/** Static fallbacks used before /settings/ loads (or if a field is blank). */
export const SITE = {
  name: "Sirajganj Government Polytechnic Institute",
  shortName: "SGPI",
  nameBn: "সিরাজগঞ্জ সরকারি পলিটেকনিক ইনস্টিটিউট",
  domain: "ac.spisg.gov.bd",
  studentPortal: "https://spisg.gov.bd",
  adminPortal: "https://su.spisg.gov.bd",
  resultPortal: "https://result.spisg.gov.bd",
};

export interface NavItem {
  key: DictKey;
  to: string;
}

/** Primary navigation. Pages beyond Home arrive in later phases; links are
 *  present now so the information architecture is complete from day one. */
export const PRIMARY_NAV: NavItem[] = [
  { key: "nav.home", to: "/" },
  { key: "nav.about", to: "/about" },
  { key: "nav.departments", to: "/departments" },
  { key: "nav.teachers", to: "/teachers" },
  { key: "nav.academics", to: "/academics" },
  { key: "nav.notices", to: "/notices" },
  { key: "nav.events", to: "/events" },
  { key: "nav.statistics", to: "/statistics" },
  { key: "nav.gallery", to: "/gallery" },
  { key: "nav.contact", to: "/contact" },
];
