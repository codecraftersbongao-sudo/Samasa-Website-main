import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LandingPageContent } from "../types";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Save,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

// ✅ Firestore
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

interface AdminDashboardProps {
  user: User;
}

type AdminSection = "Hero" | "Vision" | "Login" | "Sections" | "Footer";

/**
 * ✅ Defaults are used for:
 * - first time boot (doc doesn't exist)
 * - reset button
 * - fallback if fields missing
 */
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

  // ✅ NEW
  loginBackgroundUrl: "",

  projectsEyebrow: "PROJECTS",
  projectsTitle: "Projects",
  budgetEyebrow: "BUDGET",
  budgetTitle: "Budget",

  footerLeft: "SAMASA",
  footerRight: "All Rights Reserved",
};

// Firestore doc location (single source of truth)
const LANDING_DOC_REF = () => doc(db, "siteSettings", "landingPage");

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const navigate = useNavigate();

  const [active, setActive] = useState<AdminSection>("Hero");
  const [draft, setDraft] = useState<LandingPageContent>(DEFAULT_LANDING_CONTENT);
  const [savedPulse, setSavedPulse] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Load from Firestore (and keep synced in realtime)
  useEffect(() => {
    const ref = LANDING_DOC_REF();
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        // Ensure doc exists (first run)
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(
            ref,
            {
              ...DEFAULT_LANDING_CONTENT,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              updatedBy: user?.id || null,
            },
            { merge: true }
          );
        }

        // Realtime updates
        unsub = onSnapshot(
          ref,
          (s) => {
            const data = (s.data() || {}) as Partial<LandingPageContent>;
            setDraft({ ...DEFAULT_LANDING_CONTENT, ...data } as LandingPageContent);
            setLoading(false);
          },
          (err) => {
            console.error("Firestore landing onSnapshot error:", err);
            setDraft(DEFAULT_LANDING_CONTENT);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Firestore landing load error:", err);
        setDraft(DEFAULT_LANDING_CONTENT);
        setLoading(false);
      }
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [user?.id]);

  const save = async () => {
    try {
      const ref = LANDING_DOC_REF();
      await setDoc(
        ref,
        {
          ...draft,
          updatedAt: serverTimestamp(),
          updatedBy: user?.id || null,
        },
        { merge: true }
      );

      setSavedPulse(true);
      window.setTimeout(() => setSavedPulse(false), 800);
    } catch (err) {
      console.error("Firestore landing save error:", err);
      alert("Save failed. Check console + Firebase rules.");
    }
  };

  const reset = async () => {
    if (!confirm("Reset Landing Page content back to defaults?")) return;

    try {
      const ref = LANDING_DOC_REF();
      await setDoc(
        ref,
        {
          ...DEFAULT_LANDING_CONTENT,
          updatedAt: serverTimestamp(),
          updatedBy: user?.id || null,
          resetAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Firestore landing reset error:", err);
      alert("Reset failed. Check console + Firebase rules.");
    }
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImagePick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof LandingPageContent
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setDraft((prev) => ({ ...prev, [field]: dataUrl }));
  };

  const menu: { key: AdminSection; label: string }[] = useMemo(
    () => [
      { key: "Hero", label: "Hero Section" },
      { key: "Vision", label: "Vision Section" },
      // ✅ NEW
      { key: "Login", label: "Login Page" },
      { key: "Sections", label: "Projects & Budget Titles" },
      { key: "Footer", label: "Footer" },
    ],
    []
  );

  return (
    <div className="flex min-h-[calc(100vh-6rem)] bg-slate-50">
      {/* ✅ ADMIN SIDEBAR */}
      <aside className="w-96 bg-white border-r border-slate-200 p-10 flex flex-col">
        <button
          onClick={() => navigate("/")}
          className="group flex items-center gap-4 px-6 py-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-samasa-black text-white flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
              Back
            </div>
            <div className="text-lg font-black tracking-tighter text-samasa-black">
              Return to Dashboard
            </div>
          </div>
        </button>

        <div className="mt-10 p-8 rounded-[2.5rem] bg-samasa-black text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-white/60">
                Admin Changes
              </div>
              <div className="text-2xl font-black tracking-tighter">
                Landing Page
              </div>
            </div>
          </div>
          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
            Signed in: {user.name}
          </div>
        </div>

        <div className="mt-10">
          <div className="px-4 mb-5">
            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
              Editor Sections
            </div>
          </div>

          <nav className="space-y-2">
            {menu.map((m) => (
              <button
                key={m.key}
                onClick={() => setActive(m.key)}
                className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all group ${
                  active === m.key
                    ? "bg-samasa-blue text-white shadow-xl shadow-samasa-blue/20"
                    : "bg-white text-slate-500 hover:bg-slate-50 hover:text-samasa-black border border-slate-100"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {m.label}
                </span>
                <ChevronRight
                  className={`w-4 h-4 transition-all group-hover:translate-x-1 ${
                    active === m.key ? "opacity-100" : "opacity-50"
                  }`}
                />
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto pt-10 space-y-3">
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-[0.25em] hover:bg-slate-50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>

          <button
            onClick={save}
            className={`w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all ${
              savedPulse
                ? "bg-emerald-600 text-white"
                : "bg-samasa-black text-white hover:bg-samasa-blue"
            }`}
          >
            <Save className="w-4 h-4" />
            {savedPulse ? "Saved" : "Save Changes"}
          </button>
        </div>
      </aside>

      {/* MAIN EDITOR */}
      <main className="flex-grow p-10 lg:p-16 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* PAGE HEADER */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-4">
                Public Content Editor
              </div>
              <div className="text-6xl font-black tracking-tighter text-samasa-black">
                {active}
              </div>
              <div className="mt-3 text-slate-500 font-medium">
                Only landing page text and images are editable here.
              </div>
              {loading && (
                <div className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Loading from Firestore…
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <div className="px-5 py-3 rounded-2xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Live Preview
              </div>
              <div className="px-5 py-3 rounded-2xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Stored in Firestore
              </div>
            </div>
          </div>

          {/* CONTENT GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* EDIT FORM */}
            <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm p-12">
              {active === "Hero" && (
                <div className="space-y-6">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Hero (Lead with Grit)
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Background Image URL
                    </label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                      value={draft.heroBackgroundUrl}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          heroBackgroundUrl: e.target.value,
                        }))
                      }
                    />
                    <label className="mt-4 w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 inline-flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all">
                      <ImageIcon className="w-4 h-4" />
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImagePick(e, "heroBackgroundUrl")}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Heading Top
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.heroHeadingTop}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            heroHeadingTop: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Highlight Word
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.heroHeadingHighlight}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            heroHeadingHighlight: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Subtitle
                    </label>
                    <textarea
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold min-h-[120px]"
                      value={draft.heroSubtitle}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          heroSubtitle: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {active === "Vision" && (
                <div className="space-y-6">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Vision Section
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Vision Image URL
                    </label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                      value={draft.visionImageUrl}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          visionImageUrl: e.target.value,
                        }))
                      }
                    />
                    <label className="mt-4 w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 inline-flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all">
                      <ImageIcon className="w-4 h-4" />
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImagePick(e, "visionImageUrl")}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Vision Title
                    </label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                      value={draft.visionTitle}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, visionTitle: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Vision Body
                    </label>
                    <textarea
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold min-h-[120px]"
                      value={draft.visionBody}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, visionBody: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Card 1 Title
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.visionCard1Title}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            visionCard1Title: e.target.value,
                          }))
                        }
                      />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 mt-4">
                        Card 1 Body
                      </label>
                      <textarea
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold min-h-[90px]"
                        value={draft.visionCard1Body}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            visionCard1Body: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Card 2 Title
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.visionCard2Title}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            visionCard2Title: e.target.value,
                          }))
                        }
                      />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 mt-4">
                        Card 2 Body
                      </label>
                      <textarea
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold min-h-[90px]"
                        value={draft.visionCard2Body}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            visionCard2Body: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ NEW: Login background editor */}
              {active === "Login" && (
                <div className="space-y-6">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Login Page (Left Branding Background)
                  </div>

                  <div>
                   

                    <label className="mt-4 w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 inline-flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all">
                      <ImageIcon className="w-4 h-4" />
                      Upload Login Background
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImagePick(e, "loginBackgroundUrl")}
                      />
                    </label>

                    <div className="mt-3 text-xs text-slate-400 font-semibold">
                      Note: The login page will keep a dark theme (grayscale + dark overlay) even after changing the image.
                    </div>
                  </div>
                </div>
              )}

              {active === "Sections" && (
                <div className="space-y-6">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Projects & Budget Section Titles (Public Landing)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Projects Eyebrow
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.projectsEyebrow}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            projectsEyebrow: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Projects Title
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.projectsTitle}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            projectsTitle: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Budget Eyebrow
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.budgetEyebrow}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, budgetEyebrow: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Budget Title
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.budgetTitle}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, budgetTitle: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {active === "Footer" && (
                <div className="space-y-6">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Footer Text
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Footer Left
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.footerLeft}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, footerLeft: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Footer Right
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.footerRight}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, footerRight: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LIVE PREVIEW */}
            <div className="space-y-10">
              {/* Show Login preview when editing login */}
              {active === "Login" && (
                <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-10 border-b border-slate-100">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                      Preview
                    </div>
                    <div className="text-3xl font-black tracking-tighter text-samasa-black">
                      Login Left Panel
                    </div>
                  </div>

                  <div className="relative h-[360px] bg-samasa-black overflow-hidden">
                    {draft.loginBackgroundUrl ? (
                      <img
                        src={draft.loginBackgroundUrl}
                        className="absolute inset-0 w-full h-full object-cover opacity-25 grayscale"
                        alt="Login Background Preview"
                      />
                    ) : null}

                    {/* dark overlay keeps the theme */}
                    <div className="absolute inset-0 bg-gradient-to-b from-samasa-black/50 via-samasa-black/80 to-samasa-black" />

                    <div className="relative z-10 h-full flex items-center px-10">
                      <div className="max-w-md">
                        <div className="text-white font-black text-4xl tracking-tighter leading-[0.95]">
                          Serve{" "}
                          <span className="text-samasa-yellow italic">Strategically.</span>
                        </div>
                        <div className="mt-4 text-slate-300 font-medium">
                          Background stays dark even when image is changed.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Keep existing previews */}
              <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-10 border-b border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Preview
                  </div>
                  <div className="text-3xl font-black tracking-tighter text-samasa-black">
                    Hero
                  </div>
                </div>
                <div className="relative h-[360px] bg-samasa-black">
                  <img
                    src={draft.heroBackgroundUrl}
                    className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
                    alt="Hero Preview"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-samasa-black/40 via-samasa-black/80 to-samasa-black" />
                  <div className="relative z-10 h-full flex flex-col justify-center px-10">
                    <div className="text-4xl font-black text-white leading-[0.95] tracking-tighter">
                      {draft.heroHeadingTop}{" "}
                      <span className="text-samasa-yellow italic">
                        {draft.heroHeadingHighlight}
                      </span>
                    </div>
                    <div className="mt-4 text-slate-300 font-medium max-w-xl">
                      {draft.heroSubtitle}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-10 border-b border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Preview
                  </div>
                  <div className="text-3xl font-black tracking-tighter text-samasa-black">
                    Vision Image
                  </div>
                </div>
                <div className="p-10">
                  <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border border-slate-100 bg-slate-50">
                    <img
                      src={draft.visionImageUrl}
                      alt="Vision Preview"
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-slate-400 text-sm">
            Tip: After saving, open the login page and confirm the left panel background changed.
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
