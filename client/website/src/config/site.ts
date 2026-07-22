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

export interface NavChild {
  key: DictKey;
  to: string;
  /** External URL (opens in a new tab) instead of an in-app route. */
  external?: boolean;
}

export interface NavGroup {
  key: DictKey;
  /** Direct link (no dropdown) when set. */
  to?: string;
  children?: NavChild[];
}

/**
 * Primary navigation — few top-level items, related pages grouped into
 * dropdowns (desktop) / accordions (mobile drawer).
 */
export const NAV_GROUPS: NavGroup[] = [
  { key: "nav.home", to: "/" },
  {
    key: "nav.about",
    children: [
      { key: "nav.history", to: "/about" },
      { key: "nav.principal", to: "/principal" },
      { key: "nav.campus", to: "/campus" },
    ],
  },
  {
    key: "nav.academics",
    children: [
      { key: "nav.departments", to: "/departments" },
      { key: "nav.teachers", to: "/teachers" },
      { key: "nav.academicInfo", to: "/academics" },
      { key: "nav.projects", to: "/research" },
    ],
  },
  {
    key: "nav.campusLife",
    children: [
      { key: "nav.gallery", to: "/gallery" },
      { key: "nav.clubs", to: "/clubs" },
      { key: "nav.sports", to: "/sports" },
      { key: "nav.library", to: "/library" },
    ],
  },
  {
    key: "nav.resources",
    children: [
      { key: "nav.notices", to: "/notices" },
      { key: "nav.events", to: "/events" },
      { key: "nav.news", to: "/news" },
      { key: "nav.downloads", to: "/downloads" },
      { key: "nav.results", to: SITE.resultPortal, external: true },
    ],
  },
  {
    key: "nav.statistics",
    children: [
      { key: "nav.studentStats", to: "/statistics" },
      { key: "nav.deptStats", to: "/statistics#departments" },
      { key: "nav.analytics", to: "/statistics#analytics" },
    ],
  },
  { key: "nav.contact", to: "/contact" },
];

/** Compact link set for the footer's Quick Links column. */
export const FOOTER_LINKS: NavChild[] = [
  { key: "nav.about", to: "/about" },
  { key: "nav.departments", to: "/departments" },
  { key: "nav.teachers", to: "/teachers" },
  { key: "nav.notices", to: "/notices" },
  { key: "nav.events", to: "/events" },
  { key: "nav.gallery", to: "/gallery" },
];
