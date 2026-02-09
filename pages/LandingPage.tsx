// src/pages/LandingPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Target,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Trophy,
  History,
} from "lucide-react";

import Budget from "./Budget";
import LegislativeHub from "./LegislativeHub";
import { User, UserRole, DepartmentType, LandingPageContent } from "../types";

// ✅ Firestore
import { db } from "../firebase/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

/** ---------------------------
 * Landing page content (siteSettings/landingPage)
 * -------------------------- */
const DEFAULT_LANDING_CONTENT: LandingPageContent = {
  heroBackgroundUrl: "",
  heroHeadingTop: "SAMASA",
  heroHeadingHighlight: "STRONG",
  heroSubtitle: "Public landing subtitle…",

  visionImageUrl: "",
  visionTitle: "Vision Title",
  visionBody: "Vision body…",
  visionCard1Title: "Integrity",
  visionCard1Body: "Card 1 body…",
  visionCard2Title: "Excellence",
  visionCard2Body: "Card 2 body…",

  projectsEyebrow: "PROJECTS",
  projectsTitle: "Projects",
  budgetEyebrow: "BUDGET",
  budgetTitle: "Budget",

  footerLeft: "SAMASA",
  footerRight: "All Rights Reserved",
  loginBackgroundUrl: "",
};

const LANDING_DOC_REF = () => doc(db, "siteSettings", "landingPage");

/** ---------------------------
 * About content (site_content/about)
 * Landing page only READS this.
 * About.tsx remains the EDITOR (writes).
 * -------------------------- */
type Milestone = { year: string; title: string; desc: string };
type Achievement = {
  id: string;
  title: string;
  summary: string;
  lead?: string;
  date?: string;
  tags?: string[];
  evidenceUrl?: string;
  featured?: boolean;
};
type AboutContent = {
  history: {
    heading: string;
    paragraphs: string[];
    principleLabel: string;
    principleQuote: string;
    principleAttribution: string;
  };
  timeline: {
    label: string;
    heading: string;
    rangeText: string;
    milestones: Milestone[];
  };
  achievements: {
    heading: string;
    subheading: string;
    items: Achievement[];
  };
};

const DEFAULT_ABOUT: AboutContent = {
  history: {
    heading: "Institutional Legacy",
    paragraphs: [
      "Established in 2015, the Samahan ng mga Mag-aaral sa Sining at Agham (SAMASA) was forged as a unified council to bridge the gap between academic disciplines.",
      "What began as a coalition has transformed into a modern governing body—strengthening student representation, supporting initiatives, and advancing transparency through better systems and documentation.",
    ],
    principleLabel: "Guiding Principle",
    principleQuote:
      "Leadership is not a title, it’s an accounting of service rendered to the students who entrusted us with their voices.",
    principleAttribution: "— SAMASA Founding Charter",
  },
  timeline: {
    label: "Timeline",
    heading: "Key Milestones",
    rangeText: "2015 to Present",
    milestones: [
      {
        year: "2015",
        title: "Founding Charter",
        desc: "Consolidation of departmental clubs into a unified CASS council.",
      },
      {
        year: "2021",
        title: "Digital Transformation",
        desc: "Shifted administrative filings into a streamlined, secure workflow.",
      },
      {
        year: "2024",
        title: "Transparency 2.0",
        desc: "Launched a public-facing budget and project tracking approach.",
      },
    ],
  },
  achievements: {
    heading: "SAMASA Achievements",
    subheading:
      "A curated record of key wins, services, and milestones delivered by SAMASA for the students of CASS.",
    items: [],
  },
};

const ABOUT_DOC_REF = () => doc(db, "site_content", "about");

function safeAboutMerge(parsed: any): AboutContent {
  const c = parsed?.content ?? parsed; // supports either {content: ...} or direct
  return {
    ...DEFAULT_ABOUT,
    ...c,
    history: { ...DEFAULT_ABOUT.history, ...(c?.history || {}) },
    timeline: { ...DEFAULT_ABOUT.timeline, ...(c?.timeline || {}) },
    achievements: {
      ...DEFAULT_ABOUT.achievements,
      ...(c?.achievements || {}),
      items: Array.isArray(c?.achievements?.items)
        ? c.achievements.items
        : DEFAULT_ABOUT.achievements.items,
    },
  };
}

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter(Boolean).join(" ");

const LandingPage: React.FC = () => {
  const [play, setPlay] = useState(false);

  // Landing content
  const [content, setContent] =
    useState<LandingPageContent>(DEFAULT_LANDING_CONTENT);
  const [loading, setLoading] = useState(true);
  const [publicError, setPublicError] = useState<string | null>(null);

  // About content (READ ONLY on landing)
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT);
  const [aboutErr, setAboutErr] = useState<string | null>(null);

  // ✅ Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);
  const toggleMobile = () => setMobileOpen((v) => !v);

  // ✅ Header offset scroll (fixes Budget/Projects/About not landing properly)
  const HEADER_OFFSET = 88; // tweak if needed (fixed header height)
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // Achievements pagination in landing section
  const PER_PAGE = 4;
  const [achPage, setAchPage] = useState(1);

  const achievements = about.achievements.items || [];
  const totalPages = Math.max(1, Math.ceil(achievements.length / PER_PAGE));
  const pageSafe = Math.min(Math.max(1, achPage), totalPages);
  const start = (pageSafe - 1) * PER_PAGE;
  const pagedAchievements = achievements.slice(start, start + PER_PAGE);

  useEffect(() => {
    setAchPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  // Close mobile menu on ESC
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Hero animation
  useEffect(() => {
    const t = window.setTimeout(() => setPlay(true), 100);
    return () => window.clearTimeout(t);
  }, []);

  // ✅ Landing Firestore (public-safe)
  useEffect(() => {
    setLoading(true);
    setPublicError(null);

    const unsub = onSnapshot(
      LANDING_DOC_REF(),
      (s) => {
        if (s.exists()) {
          const data = (s.data() || {}) as Partial<LandingPageContent>;
          setContent({
            ...DEFAULT_LANDING_CONTENT,
            ...data,
          } as LandingPageContent);
        } else {
          setContent(DEFAULT_LANDING_CONTENT);
        }
        setLoading(false);
      },
      (err: any) => {
        console.error("LandingPage onSnapshot error:", err);
        const msg =
          err?.code === "permission-denied"
            ? "Public data is currently locked by Firestore rules. Allow public READ for siteSettings/landingPage."
            : "Unable to load live content right now.";
        setPublicError(msg);
        setContent(DEFAULT_LANDING_CONTENT);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ✅ About Firestore (public-safe / display-only here)
  useEffect(() => {
    setAboutErr(null);

    const unsub = onSnapshot(
      ABOUT_DOC_REF(),
      (snap) => {
        if (!snap.exists()) {
          // no writes here; About.tsx editor handles writing
          setAbout(DEFAULT_ABOUT);
        } else {
          setAbout(safeAboutMerge(snap.data()));
        }
      },
      (err: any) => {
        console.error("Landing About onSnapshot error:", err);
        const msg =
          err?.code === "permission-denied"
            ? "About content is locked by Firestore rules. Allow public READ for site_content/about."
            : "Unable to load About content right now.";
        setAboutErr(msg);
        setAbout(DEFAULT_ABOUT);
      }
    );

    return () => unsub();
  }, []);

  // Dummy user object for Budget component.
  const PUBLIC_VIEWER: User = useMemo(
    () => ({
      id: "public-guest",
      name: "Public Viewer",
      email: "guest@samasa.edu",
      role: UserRole.STUDENT,
      department: DepartmentType.SAMASA,
    }),
    []
  );

  const baseReveal = "transition-all duration-700 ease-out";
  const show = play ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8";

  const hasHeroBg = Boolean(content.heroBackgroundUrl?.trim());

  return (
    <div className="min-h-screen bg-white flex flex-col scroll-smooth">
      {/* --- Sticky Navigation --- */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex justify-between items-center py-4 px-6 lg:px-8">
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12 cursor-default">
              <img
                src="/assets/samasa-logo.png"
                alt="SAMASA Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-black tracking-tighter text-samasa-black uppercase">
              SAMASA
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex space-x-8 font-black uppercase text-[10px] tracking-[0.2em] text-slate-500">
            <button
              type="button"
              onClick={() => scrollToSection("about")}
              className="hover:text-samasa-blue transition-colors"
            >
              ABOUT
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("projects")}
              className="hover:text-samasa-blue transition-colors"
            >
              PROJECTS
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("budget")}
              className="hover:text-samasa-blue transition-colors"
            >
              BUDGET
            </button>
            <Link
              to="/officers"
              className="hover:text-samasa-blue transition-colors"
            >
              Officers
            </Link>
          </nav>

          {/* Right side: desktop CTA + mobile hamburger */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden md:inline-flex px-6 py-2.5 bg-samasa-black text-white text-[10px] font-black rounded-full hover:bg-samasa-blue transition-all active:scale-95 tracking-widest"
            >
              MEMBER LOGIN
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={toggleMobile}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border border-slate-200 bg-white/70 hover:bg-white active:scale-95 transition"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <button
              type="button"
              aria-label="Close menu backdrop"
              onClick={closeMobile}
              className="fixed inset-0 z-40 bg-black/30 md:hidden"
            />
            {/* Panel */}
            <div className="md:hidden fixed top-[72px] left-0 right-0 z-50 px-6">
              <div
                id="mobile-nav"
                className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
              >
                <div className="p-4 flex flex-col gap-2 font-black uppercase text-[11px] tracking-[0.2em] text-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      closeMobile();
                      scrollToSection("about");
                    }}
                    className="px-4 py-3 rounded-2xl hover:bg-slate-50 transition text-left"
                  >
                    ABOUT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobile();
                      scrollToSection("projects");
                    }}
                    className="px-4 py-3 rounded-2xl hover:bg-slate-50 transition text-left"
                  >
                    PROJECTS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobile();
                      scrollToSection("budget");
                    }}
                    className="px-4 py-3 rounded-2xl hover:bg-slate-50 transition text-left"
                  >
                    BUDGET
                  </button>

                  <Link
                    to="/officers"
                    onClick={closeMobile}
                    className="px-4 py-3 rounded-2xl hover:bg-slate-50 transition"
                  >
                    Officers
                  </Link>

                  <div className="h-px bg-slate-100 my-2" />

                  <Link
                    to="/login"
                    onClick={closeMobile}
                    className="px-4 py-3 rounded-2xl bg-samasa-black text-white hover:bg-samasa-blue transition text-center"
                  >
                    MEMBER LOGIN
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* --- Hero Section --- */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-samasa-black pt-16">
        <div className="absolute inset-0 z-0">
          {!hasHeroBg ? (
            <div className="absolute inset-0 bg-gradient-to-b from-samasa-black via-slate-900 to-samasa-black opacity-90" />
          ) : (
            <img
              src={content.heroBackgroundUrl}
              alt="Hero Background"
              className={`w-full h-full object-cover opacity-30 grayscale transition-transform duration-[3000ms] ${
                play ? "scale-100" : "scale-110"
              }`}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-samasa-black/40 via-samasa-black/80 to-samasa-black" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {loading && (
            <div className="mb-6 inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/10 text-white/70 text-[10px] font-black uppercase tracking-[0.3em]">
              Loading live content…
            </div>
          )}

          {!loading && publicError && (
            <div className="mb-6 inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/10 text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">
              {publicError}
            </div>
          )}

          <h1
            className={`${baseReveal} ${show} delay-200 text-6xl md:text-9xl font-black text-white leading-[0.9] mb-8 tracking-tighter`}
          >
            {content.heroHeadingTop} <br />
            <span className="text-samasa-yellow italic">
              {content.heroHeadingHighlight}
            </span>
          </h1>

          <p
            className={`${baseReveal} ${show} delay-300 text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium`}
          >
            {content.heroSubtitle}
          </p>
        </div>
      </section>

      {/* --- ABOUT SECTION (fetched from site_content/about) --- */}
      <section id="about" className="py-32 bg-white scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-xs font-black tracking-[0.4em] text-samasa-blue uppercase mb-4">
                ABOUT
              </h2>
              <h3 className="text-6xl font-black text-samasa-black tracking-tighter">
                {about.history.heading}
              </h3>
              <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-3xl font-medium">
                {about.history.paragraphs?.[0] || ""}
              </p>
            </div>

            <Link
              to="/about"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-samasa-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-samasa-blue transition-all active:scale-95"
            >
              View Full About
            </Link>
          </div>

          {aboutErr && (
            <div className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              {aboutErr}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* History + Principle */}
            <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-10">
              <div className="flex items-center gap-3 mb-6">
                <History className="w-6 h-6 text-samasa-blue" />
                <div className="text-2xl font-black text-samasa-black">
                  History
                </div>
              </div>

              <div className="space-y-5 text-slate-600 text-lg leading-relaxed font-medium">
                {(about.history.paragraphs || []).slice(0, 2).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <div className="mt-8 bg-white border border-slate-200 rounded-[2.5rem] p-8">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                  {about.history.principleLabel}
                </div>
                <div className="mt-4 text-slate-600 font-medium italic leading-relaxed">
                  “{about.history.principleQuote}”
                </div>
                <div className="mt-6 text-samasa-black font-black text-[10px] uppercase tracking-[0.25em]">
                  {about.history.principleAttribution}
                </div>
              </div>
            </div>

            {/* Achievements (paginated) */}
            <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-10">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-samasa-blue" />
                  <div>
                    <div className="text-2xl font-black text-samasa-black">
                      {about.achievements.heading}
                    </div>
                    <div className="text-slate-500 font-medium mt-1">
                      {about.achievements.subheading}
                    </div>
                  </div>
                </div>
              </div>

              {achievements.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 font-semibold">
                  No achievements published yet.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    {pagedAchievements.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-lg font-black text-samasa-black truncate">
                              {a.title}
                            </div>
                            <div className="text-slate-500 font-medium mt-2 line-clamp-3">
                              {a.summary}
                            </div>

                            {(a.lead || a.date) && (
                              <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {a.lead ? `LEAD: ${a.lead}` : ""}
                                {a.lead && a.date ? " • " : ""}
                                {a.date ? a.date : ""}
                              </div>
                            )}
                          </div>

                          {a.featured ? (
                            <span className="shrink-0 px-4 py-2 rounded-full bg-samasa-yellow/30 text-samasa-black text-[9px] font-black uppercase tracking-widest">
                              Featured
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination controls */}
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setAchPage((p) => Math.max(1, p - 1))}
                      disabled={pageSafe <= 1}
                      className={cx(
                        "inline-flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                        pageSafe <= 1
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      )}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </button>

                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                      Page {pageSafe} of {totalPages}
                    </div>

                    <button
                      type="button"
                      onClick={() => setAchPage((p) => Math.min(totalPages, p + 1))}
                      disabled={pageSafe >= totalPages}
                      className={cx(
                        "inline-flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                        pageSafe >= totalPages
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      )}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- LIVE DASHBOARD: PROJECTS --- */}
      <section
        id="projects"
        className="py-32 bg-slate-50 border-t border-slate-100 scroll-mt-24"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black tracking-[0.4em] text-samasa-red uppercase mb-4">
              {content.projectsEyebrow}
            </h2>
            <h3 className="text-6xl font-black text-samasa-black tracking-tighter">
              {content.projectsTitle}
            </h3>
          </div>

          <LegislativeHub isEditable={false} />
        </div>
      </section>

      {/* --- LIVE DASHBOARD: BUDGET --- */}
      <section id="budget" className="py-32 bg-white scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-20">
            <h2 className="text-xs font-black tracking-[0.4em] text-samasa-blue uppercase mb-4">
              {content.budgetEyebrow}
            </h2>
            <h3 className="text-6xl font-black text-samasa-black tracking-tighter">
              {content.budgetTitle}
            </h3>
          </div>

          <Budget user={PUBLIC_VIEWER} isEditable={false} hideTitle />
        </div>
      </section>

      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <span className="text-sm font-black text-samasa-black uppercase">
            {content.footerLeft}
          </span>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
            {content.footerRight}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
