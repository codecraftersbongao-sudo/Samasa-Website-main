// src/pages/LandingPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Target } from "lucide-react";

import Budget from "./Budget";
import LegislativeHub from "./LegislativeHub";
import { User, UserRole, DepartmentType, LandingPageContent } from "../types";

// ✅ Firestore
import { db } from "../firebase/firebaseConfig"; // <-- change path if needed
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

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

const LandingPage: React.FC = () => {
  const [play, setPlay] = useState(false);
  const [content, setContent] = useState<LandingPageContent>(DEFAULT_LANDING_CONTENT);
  const [loading, setLoading] = useState(true);

  // Hero animation
  useEffect(() => {
    const t = window.setTimeout(() => setPlay(true), 100);
    return () => window.clearTimeout(t);
  }, []);

  // ✅ Firestore: load + realtime subscribe
  useEffect(() => {
    const ref = LANDING_DOC_REF();
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        // Ensure doc exists once
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(
            ref,
            {
              ...DEFAULT_LANDING_CONTENT,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              updatedBy: "system",
            },
            { merge: true }
          );
        }

        // Realtime listen
        unsub = onSnapshot(
          ref,
          (s) => {
            const data = (s.data() || {}) as Partial<LandingPageContent>;
            setContent({ ...DEFAULT_LANDING_CONTENT, ...data } as LandingPageContent);
            setLoading(false);
          },
          (err) => {
            console.error("LandingPage onSnapshot error:", err);
            setContent(DEFAULT_LANDING_CONTENT);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("LandingPage Firestore load error:", err);
        setContent(DEFAULT_LANDING_CONTENT);
        setLoading(false);
      }
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Dummy user object to satisfy TypeScript requirements for the Budget component.
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
  const hasVisionImg = Boolean(content.visionImageUrl?.trim());

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

          <nav className="hidden md:flex space-x-8 font-black uppercase text-[10px] tracking-[0.2em] text-slate-500">
            <a href="#vision" className="hover:text-samasa-blue transition-colors">
              Vision
            </a>
            <a href="#projects" className="hover:text-samasa-blue transition-colors">
              Projects
            </a>
            <a href="#budget" className="hover:text-samasa-blue transition-colors">
              Budget
            </a>
            <Link to="/officers" className="hover:text-samasa-blue transition-colors">
              Officers
            </Link>
          </nav>

          <Link
            to="/login"
            className="px-6 py-2.5 bg-samasa-black text-white text-[10px] font-black rounded-full hover:bg-samasa-blue transition-all active:scale-95 tracking-widest"
          >
            MEMBER LOGIN
          </Link>
        </div>
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

          <h1
            className={`${baseReveal} ${show} delay-200 text-6xl md:text-9xl font-black text-white leading-[0.9] mb-8 tracking-tighter`}
          >
            {content.heroHeadingTop} <br />
            <span className="text-samasa-yellow italic">{content.heroHeadingHighlight}</span>
          </h1>

          <p
            className={`${baseReveal} ${show} delay-300 text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium`}
          >
            {content.heroSubtitle}
          </p>
        </div>
      </section>

      {/* --- Vision Section --- */}
      <section id="vision" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="w-12 h-1.5 bg-samasa-blue mb-8" />
              <h3 className="text-5xl font-black text-samasa-black mb-8 tracking-tighter">
                {content.visionTitle}
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">{content.visionBody}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <ShieldCheck className="text-samasa-blue mb-4" />
                  <h4 className="font-black text-xs uppercase mb-2">{content.visionCard1Title}</h4>
                  <p className="text-slate-500 text-xs">{content.visionCard1Body}</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <Target className="text-samasa-blue mb-4" />
                  <h4 className="font-black text-xs uppercase mb-2">{content.visionCard2Title}</h4>
                  <p className="text-slate-500 text-xs">{content.visionCard2Body}</p>
                </div>
              </div>
            </div>

            <div className="aspect-[4/5] bg-slate-100 rounded-[3rem] overflow-hidden border-[12px] border-slate-50 shadow-2xl">
              {!hasVisionImg ? (
                <div className="w-full h-full bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200" />
              ) : (
                <img
                  src={content.visionImageUrl}
                  className="w-full h-full object-cover grayscale"
                  alt="Vision Visual"
                  loading="lazy"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- LIVE DASHBOARD: PROJECTS --- */}
      <section id="projects" className="py-32 bg-slate-50 border-t border-slate-100">
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
      <section id="budget" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-20">
            <h2 className="text-xs font-black tracking-[0.4em] text-samasa-blue uppercase mb-4">
              {content.budgetEyebrow}
            </h2>
            <h3 className="text-6xl font-black text-samasa-black tracking-tighter">
              {content.budgetTitle}
            </h3>
          </div>

          {/* ✅ This hides BOTH "Budget" and the "Overall" badge inside Budget.tsx */}
          <Budget user={PUBLIC_VIEWER} isEditable={false} hideTitle />
        </div>
      </section>

      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <span className="text-sm font-black text-samasa-black uppercase">{content.footerLeft}</span>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
            {content.footerRight}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
