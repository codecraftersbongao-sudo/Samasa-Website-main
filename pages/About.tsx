// src/pages/About.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { User, UserRole } from "../types";
import {
  ArrowLeft,
  History,
  Trophy,
  BookOpen,
  Sparkles,
  Target,
  Users,
  Calendar,
  Pencil,
  Save,
  RotateCcw,
  X,
  Plus,
  Trash2,
  ShieldCheck,
  Settings2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  Award,
  Link as LinkIcon,
  Tag,
  CheckCircle2,
} from "lucide-react";

// ✅ Firestore
import { db } from "../firebase/firebaseConfig";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";

type Tab = "History" | "Achievements";

type Milestone = {
  year: string;
  title: string;
  desc: string;
};

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

// ✅ Firestore path: site_content/about
const ABOUT_DOC_REF = doc(db, "site_content", "about");

const DEFAULT_CONTENT: AboutContent = {
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
    items: [
      {
        id: "achv-001",
        title: "Student Assistance & Concern Routing",
        summary:
          "Strengthened the process of collecting concerns and routing them to the proper offices with clearer follow-ups and documentation.",
        lead: "SAMASA Executive Council",
        tags: ["student-support", "services"],
        featured: true,
      },
      {
        id: "achv-002",
        title: "Program Partnerships & Collaboration",
        summary:
          "Built stronger collaborations with student organizations to deliver programs and initiatives with shared resources and wider participation.",
        lead: "SAMASA Partnerships",
        tags: ["partnerships", "events"],
      },
      {
        id: "achv-003",
        title: "Transparency Initiatives",
        summary:
          "Improved documentation and public-facing updates to strengthen trust and clarity around projects and student-serving activities.",
        lead: "SAMASA Secretariat",
        tags: ["transparency", "documentation"],
      },
    ],
  },
};

function safeMergeContent(parsed: any): AboutContent {
  return {
    ...DEFAULT_CONTENT,
    ...parsed,
    history: { ...DEFAULT_CONTENT.history, ...(parsed?.history || {}) },
    timeline: { ...DEFAULT_CONTENT.timeline, ...(parsed?.timeline || {}) },
    achievements: {
      ...DEFAULT_CONTENT.achievements,
      ...(parsed?.achievements || {}),
      items: Array.isArray(parsed?.achievements?.items)
        ? parsed.achievements.items
        : DEFAULT_CONTENT.achievements.items,
    },
  };
}

const canEditUser = (u: User | null) =>
  !!u && (u.role === UserRole.SUPERADMIN || u.role === UserRole.OFFICER);

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter(Boolean).join(" ");

function deepEqualJSON(a: any, b: any) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

const FieldLabel = ({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) => (
  <div className="flex items-center justify-between gap-3 mb-2">
    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
      {children}
    </div>
    {hint ? (
      <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <Info className="w-3.5 h-3.5" />
        {hint}
      </div>
    ) : null}
  </div>
);

const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cx(
      "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none",
      "focus:ring-2 focus:ring-samasa-blue/30 focus:border-samasa-blue/30",
      "placeholder:text-slate-300",
      props.className
    )}
  />
);

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={cx(
      "w-full min-h-[120px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none",
      "focus:ring-2 focus:ring-samasa-blue/30 focus:border-samasa-blue/30",
      "placeholder:text-slate-300",
      props.className
    )}
  />
);

const PillButton = ({
  children,
  onClick,
  variant = "dark",
  className,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "dark" | "blue" | "ghost" | "soft" | "danger";
  className?: string;
  disabled?: boolean;
  title?: string;
}) => {
  const base =
    "inline-flex items-center justify-center rounded-full font-black uppercase tracking-widest text-[10px] transition-all active:scale-95";
  const map = {
    dark: "bg-samasa-black text-samasa-yellow hover:bg-samasa-blue hover:text-white shadow-lg",
    blue: "bg-samasa-blue text-white hover:opacity-90 shadow-lg",
    ghost:
      "bg-transparent text-slate-500 hover:text-samasa-black hover:bg-slate-100",
    soft: "bg-slate-100 text-slate-600 hover:bg-slate-200",
    danger:
      "bg-red-50 text-samasa-red hover:bg-samasa-red hover:text-white border border-red-100",
  } as const;
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        base,
        map[variant],
        disabled && "opacity-50 pointer-events-none",
        "px-5 py-3",
        className
      )}
    >
      {children}
    </button>
  );
};

const IconButton = ({
  onClick,
  children,
  title,
  variant = "soft",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
  variant?: "soft" | "danger" | "ghost";
}) => (
  <button
    title={title}
    onClick={onClick}
    className={cx(
      "p-2 rounded-xl transition-all active:scale-95",
      variant === "soft" &&
        "hover:bg-slate-100 text-slate-500 hover:text-samasa-black",
      variant === "danger" &&
        "hover:bg-red-50 text-slate-400 hover:text-samasa-red",
      variant === "ghost" &&
        "hover:bg-slate-100 text-slate-400 hover:text-samasa-black"
    )}
  >
    {children}
  </button>
);

const About: React.FC<{ currentUser: User | null }> = ({ currentUser }) => {
  const [tab, setTab] = useState<Tab>("History");
  const canEdit = canEditUser(currentUser);

  // Firestore-loaded content
  const [content, setContent] = useState<AboutContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ======= stats (simple, page-level) =======
  const pageStats = useMemo(() => {
    const achievementsCount = content.achievements.items.length;
    const featuredCount = content.achievements.items.filter((a) => a.featured).length;
    const leads = new Set(
      content.achievements.items.map((a) => (a.lead ?? "").trim()).filter(Boolean)
    ).size;

    const activeYears = Math.max(1, new Date().getFullYear() - 2015 + 1);
    return { achievementsCount, featuredCount, leads, activeYears };
  }, [content.achievements.items]);

  // =========================
  // Editor Modal State
  // =========================
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState<Tab>("History");
  const [preview, setPreview] = useState(true);
  const [draft, setDraft] = useState<AboutContent>(DEFAULT_CONTENT);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const dirty = useMemo(() => !deepEqualJSON(draft, content), [draft, content]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  // =========================
  // ✅ Firestore: subscribe
  // =========================
  useEffect(() => {
    setLoading(true);
    setLoadError(null);

    const unsub = onSnapshot(
      ABOUT_DOC_REF,
      async (snap) => {
        try {
          if (!snap.exists()) {
            // If missing, initialize once (safe to do for everyone, but better for admins)
            // We'll initialize only if the doc truly doesn't exist.
            // If you want only admins to initialize, wrap with canEdit.
            await setDoc(
              ABOUT_DOC_REF,
              {
                content: DEFAULT_CONTENT,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
            setContent(DEFAULT_CONTENT);
          } else {
            const data = snap.data();
            const merged = safeMergeContent(data?.content);
            setContent(merged);
          }
          setLoading(false);
        } catch (e: any) {
          setLoading(false);
          setLoadError(e?.message || "Failed to load About content.");
        }
      },
      (err) => {
        setLoading(false);
        setLoadError(err?.message || "Failed to subscribe to About content.");
      }
    );

    return () => unsub();
  }, []);

  // Keep draft in sync when editor is not open (so realtime updates don't fight the editor)
  useEffect(() => {
    if (!editOpen) setDraft(content);
  }, [content, editOpen]);

  const openEditor = (which: Tab) => {
    if (!canEdit) return;
    setEditTab(which);
    setDraft(content);
    setPreview(true);
    setEditOpen(true);
  };

  const requestCloseEditor = () => {
    if (!dirty) {
      setEditOpen(false);
      return;
    }
    const ok = window.confirm("You have unsaved changes. Close without saving?");
    if (ok) setEditOpen(false);
  };

  // ✅ Firestore save
  const applySave = async () => {
    try {
      // Optional: quick check to reduce accidental overwrite
      // (If you want stronger conflict control, we can add updatedAt compare)
      await setDoc(
        ABOUT_DOC_REF,
        {
          content: draft,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser
            ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
            : null,
        },
        { merge: true }
      );

      showToast("Saved changes");
      // content will update via onSnapshot
    } catch (e: any) {
      window.alert(e?.message || "Save failed.");
    }
  };

  const resetToDefault = () => {
    const ok = window.confirm("Reset to default content? This will overwrite your draft.");
    if (!ok) return;
    setDraft(DEFAULT_CONTENT);
    showToast("Draft reset");
  };

  // Body scroll lock + ESC
  useEffect(() => {
    if (!editOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestCloseEditor();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen, dirty]);

  // =========================
  // Draft mutators: History
  // =========================
  const updateParagraph = (idx: number, value: string) => {
    setDraft((d) => {
      const paras = [...d.history.paragraphs];
      paras[idx] = value;
      return { ...d, history: { ...d.history, paragraphs: paras } };
    });
  };

  const addParagraph = () => {
    setDraft((d) => ({
      ...d,
      history: { ...d.history, paragraphs: [...d.history.paragraphs, "New paragraph..."] },
    }));
  };

  const removeParagraph = (idx: number) => {
    setDraft((d) => ({
      ...d,
      history: {
        ...d.history,
        paragraphs: d.history.paragraphs.filter((_, i) => i !== idx),
      },
    }));
  };

  const moveParagraph = (idx: number, dir: -1 | 1) => {
    setDraft((d) => {
      const arr = [...d.history.paragraphs];
      const to = idx + dir;
      if (to < 0 || to >= arr.length) return d;
      const tmp = arr[idx];
      arr[idx] = arr[to];
      arr[to] = tmp;
      return { ...d, history: { ...d.history, paragraphs: arr } };
    });
  };

  const updateMilestone = (idx: number, patch: Partial<Milestone>) => {
    setDraft((d) => {
      const ms = [...d.timeline.milestones];
      ms[idx] = { ...ms[idx], ...patch };
      return { ...d, timeline: { ...d.timeline, milestones: ms } };
    });
  };

  const addMilestone = () => {
    setDraft((d) => ({
      ...d,
      timeline: {
        ...d.timeline,
        milestones: [
          ...d.timeline.milestones,
          { year: "20XX", title: "New Milestone", desc: "Describe what happened." },
        ],
      },
    }));
  };

  const removeMilestone = (idx: number) => {
    setDraft((d) => ({
      ...d,
      timeline: {
        ...d.timeline,
        milestones: d.timeline.milestones.filter((_, i) => i !== idx),
      },
    }));
  };

  const moveMilestone = (idx: number, dir: -1 | 1) => {
    setDraft((d) => {
      const ms = [...d.timeline.milestones];
      const to = idx + dir;
      if (to < 0 || to >= ms.length) return d;
      const tmp = ms[idx];
      ms[idx] = ms[to];
      ms[to] = tmp;
      return { ...d, timeline: { ...d.timeline, milestones: ms } };
    });
  };

  // =========================
  // Draft mutators: Achievements
  // =========================
  const addAchievement = () => {
    const id = `achv-${Math.random().toString(16).slice(2, 10)}`;
    setDraft((d) => ({
      ...d,
      achievements: {
        ...d.achievements,
        items: [
          ...d.achievements.items,
          {
            id,
            title: "New Achievement",
            summary: "Describe the achievement and what it delivered for students.",
            lead: "SAMASA",
            date: "",
            tags: [],
            evidenceUrl: "",
            featured: false,
          },
        ],
      },
    }));
  };

  const updateAchievement = (id: string, patch: Partial<Achievement>) => {
    setDraft((d) => ({
      ...d,
      achievements: {
        ...d.achievements,
        items: d.achievements.items.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      },
    }));
  };

  const removeAchievement = (id: string) => {
    setDraft((d) => ({
      ...d,
      achievements: {
        ...d.achievements,
        items: d.achievements.items.filter((a) => a.id !== id),
      },
    }));
  };

  const moveAchievement = (id: string, dir: -1 | 1) => {
    setDraft((d) => {
      const items = [...d.achievements.items];
      const idx = items.findIndex((x) => x.id === id);
      const to = idx + dir;
      if (idx === -1 || to < 0 || to >= items.length) return d;
      const tmp = items[idx];
      items[idx] = items[to];
      items[to] = tmp;
      return { ...d, achievements: { ...d.achievements, items } };
    });
  };

  const toggleFeatured = (id: string) => {
    setDraft((d) => ({
      ...d,
      achievements: {
        ...d.achievements,
        items: d.achievements.items.map((a) =>
          a.id === id ? { ...a, featured: !a.featured } : a
        ),
      },
    }));
  };

  // Live preview content
  const live = editOpen ? draft : content;

  return (
    <div className="max-w-6xl mx-auto pb-20 px-6">
      {/* Back */}
      <div className="pt-10 mb-10 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center text-slate-400 hover:text-samasa-blue transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Portal
        </Link>

        {canEdit && (
          <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <ShieldCheck className="w-4 h-4" />
            Editable (Superadmin/Officer)
          </div>
        )}
      </div>

      {/* Optional loading/error banner */}
      {(loading || loadError) && (
        <div className="mb-8">
          <div
            className={cx(
              "rounded-2xl border p-4 text-sm font-semibold",
              loadError
                ? "bg-red-50 border-red-100 text-red-700"
                : "bg-slate-50 border-slate-200 text-slate-600"
            )}
          >
            {loadError ? (
              <>Failed to load About content: {loadError}</>
            ) : (
              <>Loading About content…</>
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="relative mb-12">
        <div className="absolute -top-16 -right-10 w-[520px] h-[520px] bg-samasa-yellow/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-[520px] h-[520px] bg-samasa-blue/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="flex items-center space-x-2 text-samasa-blue font-black mb-4 uppercase tracking-[0.3em] text-[10px]">
          <History className="w-4 h-4" />
          <span>About SAMASA</span>
        </div>

        <h1 className="text-6xl md:text-7xl font-black text-samasa-black tracking-tighter mb-5 leading-none">
          Legacy & Achievements
        </h1>

        <p className="text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">
          A living record of student leadership—where our history shapes our direction, and our achievements
          prove our service.
        </p>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Achievements Logged
              </span>
              <Target className="w-5 h-5 text-samasa-blue" />
            </div>
            <div className="mt-3 text-4xl font-black text-samasa-black">
              {pageStats.achievementsCount}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Featured
              </span>
              <Award className="w-5 h-5 text-samasa-red" />
            </div>
            <div className="mt-3 text-4xl font-black text-samasa-black">
              {pageStats.featuredCount}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Leads Mentioned
              </span>
              <Users className="w-5 h-5 text-samasa-black" />
            </div>
            <div className="mt-3 text-4xl font-black text-samasa-black">{pageStats.leads}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Years of Service
              </span>
              <Calendar className="w-5 h-5 text-samasa-black" />
            </div>
            <div className="mt-3 text-2xl font-black text-samasa-black">
              Since 2015
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 md:space-x-4 mb-12 bg-white p-2 rounded-3xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
        {[
          { id: "History" as const, icon: History, label: "History" },
          { id: "Achievements" as const, icon: Trophy, label: "Achievements" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "flex items-center space-x-3 px-8 md:px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap",
              tab === t.id
                ? "bg-samasa-blue text-white shadow-lg"
                : "text-slate-400 hover:text-samasa-black hover:bg-slate-50"
            )}
          >
            <t.icon className="w-5 h-5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        {tab === "History" && (
          <div className="space-y-10">
            {/* Story */}
            <div className="bg-white p-10 md:p-16 rounded-[4rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-samasa-yellow/10 blur-[120px] -mr-32 -mt-32 rounded-full" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-samasa-blue/10 blur-[120px] -ml-32 -mb-32 rounded-full" />

              <div className="flex items-start justify-between gap-6 mb-10">
                <h2 className="text-4xl font-black text-samasa-black flex items-center">
                  <BookOpen className="w-10 h-10 mr-6 text-samasa-blue" />
                  {content.history.heading}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6 text-slate-600 text-lg leading-relaxed font-medium">
                  {content.history.paragraphs.map((txt, i) => (
                    <p key={i}>{txt}</p>
                  ))}
                </div>

                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 text-slate-500">
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="w-5 h-5 text-samasa-yellow" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {content.history.principleLabel}
                    </h4>
                  </div>
                  <p className="text-lg leading-relaxed font-medium italic">
                    “{content.history.principleQuote}”
                  </p>
                  <div className="mt-6 text-samasa-black font-black text-sm not-italic uppercase tracking-widest">
                    {content.history.principleAttribution}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-[4rem] border border-slate-200 shadow-sm p-10 md:p-14">
              <div className="flex items-center justify-between flex-wrap gap-6 mb-10">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    {content.timeline.label}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-samasa-black mt-2">
                    {content.timeline.heading}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {content.timeline.rangeText}
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-5 top-2 bottom-2 w-[2px] bg-slate-100" />
                {content.timeline.milestones.map((m, idx) => (
                  <div key={idx} className="relative pl-16 py-6">
                    <div className="absolute left-[14px] top-8 w-4 h-4 rounded-full bg-samasa-blue ring-8 ring-samasa-blue/10" />
                    <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 hover:bg-white hover:shadow-xl transition-all">
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-samasa-red">
                        {m.year}
                      </div>
                      <div className="text-2xl font-black text-samasa-black mt-2">{m.title}</div>
                      <p className="text-slate-500 font-medium leading-relaxed mt-3">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Achievements" && (
          <div className="space-y-10">
            {/* Header */}
            <div className="bg-white rounded-[4rem] border border-slate-200 shadow-sm p-10 md:p-14">
              <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-8">
                <div>
                  <div className="flex items-center space-x-2 text-samasa-blue font-black uppercase tracking-[0.3em] text-[10px] mb-3">
                    <Trophy className="w-4 h-4" />
                    <span>Achievements</span>
                  </div>
                  <h2 className="text-4xl font-black text-samasa-black leading-tight">
                    {content.achievements.heading}
                  </h2>
                  <p className="text-slate-500 font-medium text-lg leading-relaxed mt-4 max-w-2xl">
                    {content.achievements.subheading}
                  </p>
                </div>

                <div className="flex flex-col gap-3 items-stretch md:items-end">
                  <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 min-w-[260px]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Achievements Count
                    </div>
                    <div className="mt-3 text-4xl font-black text-samasa-black">
                      {content.achievements.items.length}
                    </div>
                    <div className="mt-4 text-xs font-bold text-slate-400">
                      Featured: {content.achievements.items.filter((a) => a.featured).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements list */}
            {content.achievements.items.length === 0 ? (
              <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm text-center">
                <div className="mx-auto w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-2xl font-black text-samasa-black mt-6">
                  No achievements added yet
                </h3>
                <p className="text-slate-500 font-medium mt-3">
                  Superadmin/Officers can add achievements from the editor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {content.achievements.items.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm group hover:border-samasa-blue hover:shadow-2xl transition-all relative overflow-hidden"
                  >
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-samasa-yellow/10 blur-[90px] rounded-full" />

                    <div className="flex items-start justify-between gap-6 mb-8">
                      <div className="p-4 bg-slate-50 text-samasa-blue rounded-3xl group-hover:bg-samasa-blue group-hover:text-white transition-all duration-500">
                        <Award className="w-8 h-8" />
                      </div>

                      {a.featured ? (
                        <div className="px-5 py-2 bg-samasa-yellow/30 text-samasa-black text-[9px] font-black rounded-full uppercase tracking-widest">
                          Featured
                        </div>
                      ) : (
                        <div className="px-5 py-2 bg-slate-100 text-slate-600 text-[9px] font-black rounded-full uppercase tracking-widest">
                          Achievement
                        </div>
                      )}
                    </div>

                    <h3 className="text-3xl font-black text-samasa-black mb-5 leading-tight group-hover:text-samasa-blue transition-colors">
                      {a.title}
                    </h3>

                    <p className="text-slate-500 font-medium mb-8 leading-relaxed text-lg">
                      {a.summary}
                    </p>

                    <div className="pt-6 border-t border-slate-100 space-y-3">
                      {(a.lead || a.date) && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-[10px] font-black text-samasa-black uppercase tracking-widest">
                            LEAD: {a.lead || "SAMASA"}
                          </span>
                          {a.date ? (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {a.date}
                            </span>
                          ) : null}
                        </div>
                      )}

                      {a.tags && a.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {a.tags.map((t, idx) => (
                            <span
                              key={`${a.id}-tag-${idx}`}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500"
                            >
                              <Tag className="w-3.5 h-3.5" />
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {a.evidenceUrl ? (
                        <a
                          href={a.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-samasa-blue hover:text-samasa-black transition-colors"
                        >
                          <LinkIcon className="w-4 h-4" />
                          View Evidence
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating edit button */}
      {canEdit && !editOpen && (
        <button
          onClick={() => openEditor(tab)}
          className="fixed bottom-6 right-6 z-[60] px-6 py-4 rounded-full bg-samasa-black text-samasa-yellow font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-samasa-blue hover:text-white transition-all active:scale-95 inline-flex items-center"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit Page
        </button>
      )}

      {/* Editor Modal */}
      {editOpen && canEdit && (
        <div className="fixed inset-0 z-[100] bg-samasa-black/80 backdrop-blur-md">
          <button
            className="absolute inset-0 w-full h-full cursor-default"
            onClick={requestCloseEditor}
            aria-label="Close editor"
          />

          <div className="relative w-full h-full p-3 md:p-6 flex items-center justify-center">
            <div className="relative w-full max-w-6xl h-[92vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/40">
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100">
                <div className="px-5 md:px-8 py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-samasa-blue text-white flex items-center justify-center shrink-0">
                      <Pencil className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                          Content Editor
                        </div>
                        {dirty ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-samasa-red bg-red-50 px-3 py-1 rounded-full">
                            Unsaved
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                            Saved
                          </span>
                        )}
                      </div>
                      <div className="text-2xl font-black text-samasa-black truncate">
                        {editTab === "History" ? "History & Timeline" : "General Achievements"}
                      </div>
                      <div className="text-xs font-semibold text-slate-400 truncate">
                        Editing as: {currentUser?.role} • {currentUser?.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <PillButton
                      variant="soft"
                      onClick={() => setPreview((p) => !p)}
                      className="hidden md:inline-flex"
                      title="Toggle preview"
                    >
                      {preview ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hide Preview
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Show Preview
                        </>
                      )}
                    </PillButton>

                    <PillButton variant="soft" onClick={resetToDefault} title="Reset draft">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </PillButton>

                    <PillButton
                      variant="blue"
                      onClick={applySave}
                      disabled={!dirty}
                      title={!dirty ? "No changes to save" : "Save changes"}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </PillButton>

                    <button
                      onClick={requestCloseEditor}
                      className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-samasa-black transition-all active:scale-95"
                      aria-label="Close editor"
                      title="Close"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Modal tabs */}
                <div className="px-5 md:px-8 pb-5">
                  <div className="flex gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-2 w-full overflow-x-auto no-scrollbar">
                    {(["History", "Achievements"] as Tab[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setEditTab(t)}
                        className={cx(
                          "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap inline-flex items-center gap-2",
                          editTab === t
                            ? "bg-white shadow-sm text-samasa-black"
                            : "text-slate-400 hover:text-samasa-black"
                        )}
                      >
                        {t === "History" ? (
                          <History className="w-4 h-4" />
                        ) : (
                          <Trophy className="w-4 h-4" />
                        )}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className={cx("h-[calc(92vh-144px)] md:h-[calc(92vh-152px)]", "flex")}>
                {/* Left editor */}
                <div className={cx("flex-1 overflow-y-auto", preview ? "w-1/2" : "w-full")}>
                  <div className="p-5 md:p-8 space-y-8">
                    {/* ====== HISTORY EDITOR ====== */}
                    {editTab === "History" && (
                      <>
                        <section className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 md:p-7">
                          <div className="text-lg font-black text-samasa-black inline-flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-samasa-blue" />
                            History
                          </div>

                          <FieldLabel hint="Displayed as the section title">
                            History Heading
                          </FieldLabel>
                          <TextInput
                            value={draft.history.heading}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                history: { ...d.history, heading: e.target.value },
                              }))
                            }
                          />

                          <div className="mt-6">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <FieldLabel hint="Shown as the main story text">
                                Paragraphs
                              </FieldLabel>
                              <PillButton onClick={addParagraph} variant="dark" className="px-4 py-2">
                                <Plus className="w-4 h-4 mr-2" />
                                Add
                              </PillButton>
                            </div>

                            <div className="space-y-4">
                              {draft.history.paragraphs.map((txt, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      Paragraph {idx + 1}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <IconButton title="Move up" onClick={() => moveParagraph(idx, -1)}>
                                        <ChevronUp className="w-4 h-4" />
                                      </IconButton>
                                      <IconButton title="Move down" onClick={() => moveParagraph(idx, 1)}>
                                        <ChevronDown className="w-4 h-4" />
                                      </IconButton>
                                      <IconButton title="Remove" onClick={() => removeParagraph(idx)} variant="danger">
                                        <Trash2 className="w-4 h-4" />
                                      </IconButton>
                                    </div>
                                  </div>
                                  <TextArea value={txt} onChange={(e) => updateParagraph(idx, e.target.value)} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>

                        <section className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 md:p-7">
                          <div className="text-lg font-black text-samasa-black inline-flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-samasa-yellow" />
                            Guiding Principle
                          </div>

                          <FieldLabel hint="Small label above the quote">Label</FieldLabel>
                          <TextInput
                            value={draft.history.principleLabel}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                history: { ...d.history, principleLabel: e.target.value },
                              }))
                            }
                          />

                          <div className="mt-5">
                            <FieldLabel hint="Main quote text">Quote</FieldLabel>
                            <TextArea
                              value={draft.history.principleQuote}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  history: { ...d.history, principleQuote: e.target.value },
                                }))
                              }
                            />
                          </div>

                          <div className="mt-5">
                            <FieldLabel hint="Shown below the quote">Attribution</FieldLabel>
                            <TextInput
                              value={draft.history.principleAttribution}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  history: { ...d.history, principleAttribution: e.target.value },
                                }))
                              }
                            />
                          </div>
                        </section>

                        <section className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 md:p-7">
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-lg font-black text-samasa-black inline-flex items-center gap-2">
                              <Settings2 className="w-5 h-5 text-samasa-blue" />
                              Timeline
                            </div>
                            <PillButton onClick={addMilestone} variant="dark" className="px-4 py-2">
                              <Plus className="w-4 h-4 mr-2" />
                              Add
                            </PillButton>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <FieldLabel hint="Small eyebrow text">Label</FieldLabel>
                              <TextInput
                                value={draft.timeline.label}
                                onChange={(e) =>
                                  setDraft((d) => ({
                                    ...d,
                                    timeline: { ...d.timeline, label: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="md:col-span-2">
                              <FieldLabel hint="Section title">Heading</FieldLabel>
                              <TextInput
                                value={draft.timeline.heading}
                                onChange={(e) =>
                                  setDraft((d) => ({
                                    ...d,
                                    timeline: { ...d.timeline, heading: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="md:col-span-3">
                              <FieldLabel hint="Shown at the right of timeline header">Range Text</FieldLabel>
                              <TextInput
                                value={draft.timeline.rangeText}
                                onChange={(e) =>
                                  setDraft((d) => ({
                                    ...d,
                                    timeline: { ...d.timeline, rangeText: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="mt-5 space-y-4">
                            {draft.timeline.milestones.map((m, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Milestone {idx + 1}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <IconButton title="Move up" onClick={() => moveMilestone(idx, -1)}>
                                      <ChevronUp className="w-4 h-4" />
                                    </IconButton>
                                    <IconButton title="Move down" onClick={() => moveMilestone(idx, 1)}>
                                      <ChevronDown className="w-4 h-4" />
                                    </IconButton>
                                    <IconButton title="Remove" onClick={() => removeMilestone(idx)} variant="danger">
                                      <Trash2 className="w-4 h-4" />
                                    </IconButton>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <FieldLabel>Year</FieldLabel>
                                    <TextInput
                                      value={m.year}
                                      onChange={(e) => updateMilestone(idx, { year: e.target.value })}
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <FieldLabel>Title</FieldLabel>
                                    <TextInput
                                      value={m.title}
                                      onChange={(e) => updateMilestone(idx, { title: e.target.value })}
                                    />
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <FieldLabel>Description</FieldLabel>
                                  <TextArea
                                    value={m.desc}
                                    onChange={(e) => updateMilestone(idx, { desc: e.target.value })}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      </>
                    )}

                    {/* ====== ACHIEVEMENTS EDITOR ====== */}
                    {editTab === "Achievements" && (
                      <>
                        <section className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 md:p-7">
                          <div className="text-lg font-black text-samasa-black inline-flex items-center gap-2 mb-4">
                            <Trophy className="w-5 h-5 text-samasa-blue" />
                            Achievements Header
                          </div>

                          <FieldLabel hint="Section title">Heading</FieldLabel>
                          <TextInput
                            value={draft.achievements.heading}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                achievements: { ...d.achievements, heading: e.target.value },
                              }))
                            }
                          />

                          <div className="mt-5">
                            <FieldLabel hint="Short description shown under the heading">Subheading</FieldLabel>
                            <TextArea
                              value={draft.achievements.subheading}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  achievements: { ...d.achievements, subheading: e.target.value },
                                }))
                              }
                            />
                          </div>
                        </section>

                        <section className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 md:p-7">
                          <div className="flex items-center justify-between mb-4 gap-4">
                            <div className="text-lg font-black text-samasa-black inline-flex items-center gap-2">
                              <Award className="w-5 h-5 text-samasa-blue" />
                              Achievement List
                            </div>
                            <PillButton onClick={addAchievement} variant="dark" className="px-4 py-2">
                              <Plus className="w-4 h-4 mr-2" />
                              Add
                            </PillButton>
                          </div>

                          <div className="space-y-4">
                            {draft.achievements.items.map((a, idx) => (
                              <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div className="min-w-0">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      Achievement {idx + 1}
                                    </div>
                                    <div className="text-sm font-black text-samasa-black truncate mt-1">
                                      {a.title}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <IconButton title="Move up" onClick={() => moveAchievement(a.id, -1)}>
                                      <ChevronUp className="w-4 h-4" />
                                    </IconButton>
                                    <IconButton title="Move down" onClick={() => moveAchievement(a.id, 1)}>
                                      <ChevronDown className="w-4 h-4" />
                                    </IconButton>
                                    <PillButton
                                      variant={a.featured ? "blue" : "soft"}
                                      onClick={() => toggleFeatured(a.id)}
                                      className="px-4 py-2"
                                      title="Toggle featured"
                                    >
                                      {a.featured ? (
                                        <>
                                          <CheckCircle2 className="w-4 h-4 mr-2" />
                                          Featured
                                        </>
                                      ) : (
                                        "Feature"
                                      )}
                                    </PillButton>
                                    <IconButton title="Remove" onClick={() => removeAchievement(a.id)} variant="danger">
                                      <Trash2 className="w-4 h-4" />
                                    </IconButton>
                                  </div>
                                </div>

                                <FieldLabel hint="Title shown in the card">Title</FieldLabel>
                                <TextInput
                                  value={a.title}
                                  onChange={(e) => updateAchievement(a.id, { title: e.target.value })}
                                />

                                <div className="mt-4">
                                  <FieldLabel hint="Main description of the achievement">Summary</FieldLabel>
                                  <TextArea
                                    value={a.summary}
                                    onChange={(e) => updateAchievement(a.id, { summary: e.target.value })}
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                  <div>
                                    <FieldLabel hint="Optional: who led this achievement">Lead (optional)</FieldLabel>
                                    <TextInput
                                      value={a.lead || ""}
                                      onChange={(e) => updateAchievement(a.id, { lead: e.target.value })}
                                      placeholder="e.g., SAMASA Executive Council"
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel hint="Optional: date or period">Date (optional)</FieldLabel>
                                    <TextInput
                                      value={a.date || ""}
                                      onChange={(e) => updateAchievement(a.id, { date: e.target.value })}
                                      placeholder="e.g., 2024-10 or March 2025"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                  <div>
                                    <FieldLabel hint="Comma-separated tags, shown as chips">Tags (optional)</FieldLabel>
                                    <TextInput
                                      value={(a.tags || []).join(", ")}
                                      onChange={(e) =>
                                        updateAchievement(a.id, {
                                          tags: e.target.value
                                            .split(",")
                                            .map((x) => x.trim())
                                            .filter(Boolean),
                                        })
                                      }
                                      placeholder="e.g., transparency, student-support"
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel hint="Link to proof (Drive, FB post, etc.)">Evidence URL (optional)</FieldLabel>
                                    <TextInput
                                      value={a.evidenceUrl || ""}
                                      onChange={(e) => updateAchievement(a.id, { evidenceUrl: e.target.value })}
                                      placeholder="https://..."
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}

                            {draft.achievements.items.length === 0 && (
                              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                                <div className="text-sm font-black text-samasa-black">
                                  No achievements yet
                                </div>
                                <div className="text-slate-500 font-semibold mt-2">
                                  Click <span className="font-black">Add</span> to create your first achievement.
                                </div>
                              </div>
                            )}
                          </div>
                        </section>
                      </>
                    )}

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-samasa-blue mt-0.5" />
                      <div className="text-sm font-semibold text-slate-600">
                        Saved to <span className="font-black">Firestore</span> and shared across accounts.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right preview */}
                {preview && (
                  <div className="hidden md:block w-1/2 border-l border-slate-100 overflow-y-auto bg-slate-50">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                          Live Preview
                        </div>
                        <PillButton
                          variant="ghost"
                          onClick={() => setPreview(false)}
                          className="px-4 py-2"
                          title="Hide preview"
                        >
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hide
                        </PillButton>
                      </div>

                      {editTab === "Achievements" ? (
                        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                          <div className="text-2xl font-black text-samasa-black flex items-center gap-3">
                            <Trophy className="w-6 h-6 text-samasa-blue" />
                            {live.achievements.heading}
                          </div>
                          <div className="mt-3 text-slate-600 font-medium leading-relaxed">
                            {live.achievements.subheading}
                          </div>

                          <div className="mt-6 space-y-3">
                            {live.achievements.items.map((a) => (
                              <div key={a.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-black text-samasa-black truncate">
                                      {a.title}
                                    </div>
                                    {(a.lead || a.date) && (
                                      <div className="text-xs font-bold text-slate-400 mt-1">
                                        {a.lead ? `LEAD: ${a.lead}` : ""}
                                        {a.lead && a.date ? " • " : ""}
                                        {a.date ? a.date : ""}
                                      </div>
                                    )}
                                  </div>
                                  {a.featured ? (
                                    <span className="px-3 py-1 rounded-full bg-samasa-yellow/30 text-samasa-black text-[9px] font-black uppercase tracking-widest">
                                      Featured
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest">
                                      Achievement
                                    </span>
                                  )}
                                </div>

                                <div className="text-slate-500 font-semibold mt-2">
                                  {a.summary}
                                </div>

                                {a.tags && a.tags.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {a.tags.map((t, idx) => (
                                      <span
                                        key={`${a.id}-t-${idx}`}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500"
                                      >
                                        <Tag className="w-3.5 h-3.5" />
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {a.evidenceUrl ? (
                                  <a
                                    href={a.evidenceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-samasa-blue hover:text-samasa-black transition-colors"
                                  >
                                    <LinkIcon className="w-4 h-4" />
                                    View Evidence
                                  </a>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                          <div className="text-2xl font-black text-samasa-black flex items-center gap-3">
                            <BookOpen className="w-6 h-6 text-samasa-blue" />
                            {live.history.heading}
                          </div>
                          <div className="mt-4 space-y-3 text-slate-600 font-medium leading-relaxed">
                            {live.history.paragraphs.map((p, i) => (
                              <p key={i}>{p}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Toast */}
              {toast && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-samasa-black text-white px-5 py-3 rounded-full shadow-2xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {toast}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default About;
