/*
  UI string dictionary. English is complete; Bangla is filled in progressively
  (EN-first, BN-ready). Missing BN keys fall back to EN at lookup time, so the
  site never shows a blank label.
*/
export type Locale = "en" | "bn";

export const dict = {
  en: {
    "nav.home": "Home",
    "nav.about": "About",
    "nav.departments": "Departments",
    "nav.teachers": "Faculty",
    "nav.academics": "Academics",
    "nav.notices": "Notices",
    "nav.events": "Events",
    "nav.results": "Results",
    "nav.gallery": "Gallery",
    "nav.contact": "Contact",
    "nav.statistics": "Statistics",

    "cta.studentLogin": "Student Login",
    "cta.adminLogin": "Admin",
    "cta.checkResult": "Check Result",
    "cta.readMore": "Read more",
    "cta.viewAll": "View all",
    "cta.apply": "Apply for Admission",
    "cta.explore": "Explore Departments",

    "hero.badge": "Government of the People's Republic of Bangladesh",
    "hero.tagline": "Technical Education for a Skilled Nation",

    "stats.students": "Students",
    "stats.teachers": "Faculty Members",
    "stats.departments": "Departments",
    "stats.graduates": "Graduates",

    "section.why": "Why Choose SGPI",
    "section.whyDesc": "A legacy of technical excellence, modern labs, and industry-ready graduates.",
    "section.departments": "Academic Departments",
    "section.departmentsDesc": "Four-year diploma-in-engineering programmes across disciplines.",
    "section.faculty": "Our Faculty",
    "section.facultyDesc": "Dedicated educators shaping the next generation of engineers.",
    "section.notices": "Notice Board",
    "section.events": "Upcoming Events",
    "section.achievements": "Achievements",
    "section.gallery": "Campus Life",
    "section.principal": "Principal's Message",
    "section.downloads": "Downloads & Forms",
    "section.contact": "Get in Touch",

    "notice.empty": "No notices published yet.",
    "events.empty": "No upcoming events.",
    "footer.quickLinks": "Quick Links",
    "footer.portals": "Portals",
    "footer.contact": "Contact",
    "footer.rights": "All rights reserved.",
    "footer.builtBy": "An official website of SGPI.",

    "search.placeholder": "Search faculty, departments, notices…",
    "search.empty": "No matches found.",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "loading": "Loading…",
  },
  bn: {
    "nav.home": "হোম",
    "nav.about": "পরিচিতি",
    "nav.departments": "বিভাগসমূহ",
    "nav.teachers": "শিক্ষকমণ্ডলী",
    "nav.academics": "একাডেমিক",
    "nav.notices": "নোটিশ",
    "nav.events": "ইভেন্ট",
    "nav.results": "ফলাফল",
    "nav.gallery": "গ্যালারি",
    "nav.contact": "যোগাযোগ",
    "nav.statistics": "পরিসংখ্যান",

    "cta.studentLogin": "শিক্ষার্থী লগইন",
    "cta.adminLogin": "অ্যাডমিন",
    "cta.checkResult": "ফলাফল দেখুন",
    "cta.viewAll": "সব দেখুন",
    "cta.apply": "ভর্তির আবেদন",

    "hero.badge": "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার",
    "hero.tagline": "দক্ষ জাতির জন্য কারিগরি শিক্ষা",

    "stats.students": "শিক্ষার্থী",
    "stats.teachers": "শিক্ষক",
    "stats.departments": "বিভাগ",
    "stats.graduates": "স্নাতক",

    "section.notices": "নোটিশ বোর্ড",
    "section.events": "আসন্ন ইভেন্ট",
    "footer.rights": "সর্বস্বত্ব সংরক্ষিত।",
  },
} as const;

export type DictKey = keyof (typeof dict)["en"];
