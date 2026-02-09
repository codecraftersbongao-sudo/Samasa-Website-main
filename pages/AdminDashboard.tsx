// src/pages/AdminDashboard.tsx
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
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";

// ✅ Firebase
import { db, auth } from "../firebase/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

// ✅ Cloudinary
import { uploadToCloudinary, cloudinaryEnvOk } from "../lib/cloudinaryUpload";

interface AdminDashboardProps {
  user: User;
}

type AdminSection = "Hero" | "Vision" | "Login" | "Sections" | "Footer";

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

  loginBackgroundUrl: "",

  projectsEyebrow: "PROJECTS",
  projectsTitle: "Projects",
  budgetEyebrow: "BUDGET",
  budgetTitle: "Budget",

  footerLeft: "SAMASA",
  footerRight: "All Rights Reserved",
};

const LANDING_DOC_REF = () => doc(db, "siteSettings", "landingPage");

type ToastType = "success" | "error" | "info";
type ToastState = { open: boolean; type: ToastType; title: string; message?: string };

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const navigate = useNavigate();

  const [active, setActive] = useState<AdminSection>("Hero");
  const [draft, setDraft] = useState<LandingPageContent>(DEFAULT_LANDING_CONTENT);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [uploadingField, setUploadingField] = useState<keyof LandingPageContent | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const showToast = (next: Omit<ToastState, "open">, ms = 2200) => {
    setToast({ open: true, ...next });
    window.setTimeout(() => setToast((t) => ({ ...t, open: false })), ms);
  };

  const authUid = () => auth.currentUser?.uid ?? null;

  // ✅ Load from Firestore (and keep synced in realtime)
  useEffect(() => {
    const ref = LANDING_DOC_REF();
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(
            ref,
            {
              ...DEFAULT_LANDING_CONTENT,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              updatedBy: authUid(),
            },
            { merge: true }
          );
        }

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
            showToast({
              type: "error",
              title: "Realtime sync failed",
              message: "Check console + Firestore rules.",
            });
          }
        );
      } catch (err) {
        console.error("Firestore landing load error:", err);
        setDraft(DEFAULT_LANDING_CONTENT);
        setLoading(false);
        showToast({
          type: "error",
          title: "Failed to load landing content",
          message: "Check console + Firestore rules.",
        });
      }
    })();

    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const save = async () => {
    if (saving || resetting || uploadingField) return;
    setSaving(true);

    try {
      const ref = LANDING_DOC_REF();
      await setDoc(
        ref,
        {
          ...draft,
          updatedAt: serverTimestamp(),
          updatedBy: authUid(),
        },
        { merge: true }
      );

      showToast({
        type: "success",
        title: "Saved successfully",
        message: "Landing page content has been updated.",
      });
    } catch (err) {
      console.error("Firestore landing save error:", err);
      showToast({
        type: "error",
        title: "Save failed",
        message: "Check console + Firebase rules.",
      });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (saving || resetting || uploadingField) return;
    setResetting(true);

    try {
      const ref = LANDING_DOC_REF();
      await setDoc(
        ref,
        {
          ...DEFAULT_LANDING_CONTENT,
          updatedAt: serverTimestamp(),
          updatedBy: authUid(),
          resetAt: serverTimestamp(),
        },
        { merge: true }
      );

      showToast({
        type: "success",
        title: "Reset complete",
        message: "Landing page content restored to defaults.",
      });
    } catch (err) {
      console.error("Firestore landing reset error:", err);
      showToast({
        type: "error",
        title: "Reset failed",
        message: "Check console + Firebase rules.",
      });
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  const handleImagePick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof LandingPageContent
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!cloudinaryEnvOk()) {
        showToast({
          type: "error",
          title: "Cloudinary not configured",
          message: "Check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.",
        });
        return;
      }

      // basic file validation
      if (!file.type.startsWith("image/")) {
        showToast({
          type: "error",
          title: "Invalid file",
          message: "Please choose an image file.",
        });
        return;
      }

      // optional: cap for UX (Cloudinary can handle more, but keep it reasonable)
      if (file.size > 8 * 1024 * 1024) {
        showToast({
          type: "error",
          title: "Image too large",
          message: "Please choose an image under 8MB.",
        });
        return;
      }

      setUploadingField(field);

      showToast({
        type: "info",
        title: "Uploading…",
        message: "Sending image to Cloudinary.",
      });

      const { url } = await uploadToCloudinary(file, { folder: "samasa/landing" });

      // store URL only (Firestore safe)
      setDraft((prev) => ({ ...prev, [field]: url }));

      showToast({
        type: "success",
        title: "Upload complete",
        message: "Image URL added. Click Save Changes to publish.",
      });
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      showToast({
        type: "error",
        title: "Upload failed",
        message: err?.message || "Check console for details.",
      });
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  };

  const menu: { key: AdminSection; label: string; hint: string }[] = useMemo(
    () => [
      { key: "Hero", label: "Hero Section", hint: "Landing headline + hero image" },
      { key: "Vision", label: "Vision Section", hint: "Vision text + image + cards" },
      { key: "Login", label: "Login Page", hint: "Left panel background image" },
      { key: "Sections", label: "Projects & Budget", hint: "Public section titles" },
      { key: "Footer", label: "Footer", hint: "Footer text" },
    ],
    []
  );

  const SectionPill = ({ label }: { label: string }) => (
    <div className="px-4 py-2 rounded-2xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
      {label}
    </div>
  );

  const DisabledOverlay = ({ show }: { show: boolean }) =>
    show ? (
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-[4rem]">
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Working…
          </div>
        </div>
      </div>
    ) : null;

  const isBusy = saving || resetting || Boolean(uploadingField);

  return (
    <div className="flex min-h-[calc(100vh-6rem)] bg-slate-50">
      {/* ✅ Toast */}
      {toast.open && (
        <div className="fixed z-[60] top-6 right-6 max-w-[420px]">
          <div
            className={`rounded-3xl border shadow-lg px-5 py-4 bg-white ${
              toast.type === "success"
                ? "border-emerald-200"
                : toast.type === "error"
                ? "border-rose-200"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center ${
                  toast.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : toast.type === "error"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-50 text-slate-700"
                }`}
              >
                {toast.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : toast.type === "error" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1">
                <div className="text-sm font-black text-samasa-black">{toast.title}</div>
                {toast.message ? (
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {toast.message}
                  </div>
                ) : null}
              </div>

              <button
                onClick={() => setToast((t) => ({ ...t, open: false }))}
                className="w-9 h-9 rounded-2xl border border-slate-100 hover:bg-slate-50 flex items-center justify-center"
                aria-label="Close toast"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => !resetting && setShowResetConfirm(false)}
          />
          <div className="relative w-full max-w-lg rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xl font-black tracking-tight text-samasa-black">
                    Reset landing content?
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-500">
                    This will overwrite all landing page fields back to defaults. You can still edit again afterwards.
                  </div>
                </div>
                <button
                  onClick={() => !resetting && setShowResetConfirm(false)}
                  className="w-10 h-10 rounded-2xl border border-slate-100 hover:bg-slate-50 flex items-center justify-center"
                  aria-label="Close reset modal"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                disabled={resetting}
                onClick={() => setShowResetConfirm(false)}
                className="px-6 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-[0.25em] hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                disabled={resetting}
                onClick={reset}
                className="px-6 py-4 rounded-2xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-[0.25em] hover:bg-rose-700 disabled:opacity-60 inline-flex items-center justify-center gap-3"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Reset Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ADMIN SIDEBAR */}
      <aside className="hidden lg:flex w-[26rem] bg-white border-r border-slate-200 p-10 flex-col">
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
              <div className="text-2xl font-black tracking-tighter">Landing Page</div>
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
                <div className="text-left">
                  <div className="text-[10px] font-black uppercase tracking-widest">{m.label}</div>
                  <div className={`mt-1 text-[11px] font-semibold ${active === m.key ? "text-white/70" : "text-slate-400"}`}>
                    {m.hint}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-all group-hover:translate-x-1 ${active === m.key ? "opacity-100" : "opacity-50"}`} />
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto pt-10 space-y-3">
          <button
            disabled={isBusy}
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-[0.25em] hover:bg-slate-50 transition-all disabled:opacity-60"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>

          <button
            disabled={isBusy}
            onClick={save}
            className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all bg-samasa-black text-white hover:bg-samasa-blue disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </aside>

      {/* MAIN EDITOR */}
      <main className="flex-grow p-6 sm:p-10 lg:p-16 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
          {/* Mobile top bar */}
          <div className="lg:hidden flex flex-col gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border border-slate-200"
            >
              <div className="w-10 h-10 rounded-xl bg-samasa-black text-white flex items-center justify-center">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                  Back
                </div>
                <div className="text-base font-black tracking-tight text-samasa-black">
                  Return to Dashboard
                </div>
              </div>
            </button>

            <div className="bg-white border border-slate-200 rounded-3xl p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-3">
                Section
              </div>
              <div className="grid grid-cols-2 gap-2">
                {menu.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setActive(m.key)}
                    className={`px-4 py-4 rounded-2xl border text-left ${
                      active === m.key
                        ? "bg-samasa-blue text-white border-samasa-blue"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest">{m.key}</div>
                    <div className={`mt-1 text-[11px] font-semibold ${active === m.key ? "text-white/70" : "text-slate-400"}`}>
                      {m.label}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  disabled={isBusy}
                  onClick={() => setShowResetConfirm(true)}
                  className="flex-1 px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-[0.25em] disabled:opacity-60"
                >
                  Reset
                </button>
                <button
                  disabled={isBusy}
                  onClick={save}
                  className="flex-1 px-5 py-4 rounded-2xl bg-samasa-black text-white font-black text-[10px] uppercase tracking-[0.25em] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>

          {/* PAGE HEADER */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-4">
                Public Content Editor
              </div>
              <div className="text-4xl sm:text-6xl font-black tracking-tighter text-samasa-black">
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

            <div className="hidden lg:flex gap-3">
              <SectionPill label="Live Preview" />
              <SectionPill label="Stored in Firestore" />
            </div>
          </div>

          {/* CONTENT GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 sm:gap-10">
            {/* EDIT FORM */}
            <div className="relative bg-white rounded-[3rem] sm:rounded-[4rem] border border-slate-100 shadow-sm p-6 sm:p-10 lg:p-12">
              <DisabledOverlay show={saving || resetting} />

              {active === "Hero" && (
                <div className="space-y-6">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Hero (Lead with Grit)
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Background Image URL
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="w-4 h-4 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
                        <input
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                          value={draft.heroBackgroundUrl}
                          onChange={(e) => setDraft((p) => ({ ...p, heroBackgroundUrl: e.target.value }))}
                          placeholder="https://…"
                        />
                      </div>
                    </div>

                    <label className="mt-3 w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 inline-flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all">
                      {uploadingField === "heroBackgroundUrl" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      {uploadingField === "heroBackgroundUrl" ? "Uploading…" : "Upload Image (Cloudinary)"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImagePick(e, "heroBackgroundUrl")}
                        disabled={Boolean(uploadingField)}
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
                        onChange={(e) => setDraft((p) => ({ ...p, heroHeadingTop: e.target.value }))}
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
                          setDraft((p) => ({ ...p, heroHeadingHighlight: e.target.value }))
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
                      onChange={(e) => setDraft((p) => ({ ...p, heroSubtitle: e.target.value }))}
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
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
                      <input
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.visionImageUrl}
                        onChange={(e) => setDraft((p) => ({ ...p, visionImageUrl: e.target.value }))}
                        placeholder="https://…"
                      />
                    </div>

                    <label className="mt-3 w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 inline-flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all">
                      {uploadingField === "visionImageUrl" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      {uploadingField === "visionImageUrl" ? "Uploading…" : "Upload Image (Cloudinary)"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImagePick(e, "visionImageUrl")}
                        disabled={Boolean(uploadingField)}
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
                      onChange={(e) => setDraft((p) => ({ ...p, visionTitle: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Vision Body
                    </label>
                    <textarea
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold min-h-[120px]"
                      value={draft.visionBody}
                      onChange={(e) => setDraft((p) => ({ ...p, visionBody: e.target.value }))}
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
                        onChange={(e) => setDraft((p) => ({ ...p, visionCard1Title: e.target.value }))}
                      />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 mt-4">
                        Card 1 Body
                      </label>
                      <textarea
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold min-h-[90px]"
                        value={draft.visionCard1Body}
                        onChange={(e) => setDraft((p) => ({ ...p, visionCard1Body: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Card 2 Title
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.visionCard2Title}
                        onChange={(e) => setDraft((p) => ({ ...p, visionCard2Title: e.target.value }))}
                      />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 mt-4">
                        Card 2 Body
                      </label>
                      <textarea
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold min-h-[90px]"
                        value={draft.visionCard2Body}
                        onChange={(e) => setDraft((p) => ({ ...p, visionCard2Body: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {active === "Login" && (
                <div className="space-y-6">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Login Page (Left Branding Background)
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Login Background Image URL
                    </label>
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
                      <input
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.loginBackgroundUrl}
                        onChange={(e) => setDraft((p) => ({ ...p, loginBackgroundUrl: e.target.value }))}
                        placeholder="https://…"
                      />
                    </div>

                    <label className="mt-3 w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 inline-flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all">
                      {uploadingField === "loginBackgroundUrl" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      {uploadingField === "loginBackgroundUrl" ? "Uploading…" : "Upload Login Background (Cloudinary)"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImagePick(e, "loginBackgroundUrl")}
                        disabled={Boolean(uploadingField)}
                      />
                    </label>

                    <div className="mt-3 text-xs text-slate-400 font-semibold">
                      Note: Login keeps the dark theme (grayscale + overlay) even after changing the image.
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
                        onChange={(e) => setDraft((p) => ({ ...p, projectsEyebrow: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Projects Title
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.projectsTitle}
                        onChange={(e) => setDraft((p) => ({ ...p, projectsTitle: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Budget Eyebrow
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.budgetEyebrow}
                        onChange={(e) => setDraft((p) => ({ ...p, budgetEyebrow: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Budget Title
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.budgetTitle}
                        onChange={(e) => setDraft((p) => ({ ...p, budgetTitle: e.target.value }))}
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
                        onChange={(e) => setDraft((p) => ({ ...p, footerLeft: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Footer Right
                      </label>
                      <input
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                        value={draft.footerRight}
                        onChange={(e) => setDraft((p) => ({ ...p, footerRight: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LIVE PREVIEW */}
            <div className="space-y-8 sm:space-y-10">
              {active === "Login" && (
                <div className="bg-white rounded-[3rem] sm:rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 sm:p-10 border-b border-slate-100">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                      Preview
                    </div>
                    <div className="text-2xl sm:text-3xl font-black tracking-tighter text-samasa-black">
                      Login Left Panel
                    </div>
                  </div>

                  <div className="relative h-[340px] sm:h-[360px] bg-samasa-black overflow-hidden">
                    {draft.loginBackgroundUrl ? (
                      <img
                        src={draft.loginBackgroundUrl}
                        className="absolute inset-0 w-full h-full object-cover opacity-25 grayscale"
                        alt="Login Background Preview"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-b from-samasa-black/50 via-samasa-black/80 to-samasa-black" />

                    <div className="relative z-10 h-full flex items-center px-8 sm:px-10">
                      <div className="max-w-md">
                        <div className="text-white font-black text-3xl sm:text-4xl tracking-tighter leading-[0.95]">
                          Serve <span className="text-samasa-yellow italic">Strategically.</span>
                        </div>
                        <div className="mt-4 text-slate-300 font-medium">
                          Background stays dark even when image is changed.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[3rem] sm:rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 sm:p-10 border-b border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Preview
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tighter text-samasa-black">
                    Hero
                  </div>
                </div>
                <div className="relative h-[340px] sm:h-[360px] bg-samasa-black overflow-hidden">
                  {draft.heroBackgroundUrl ? (
                    <img
                      src={draft.heroBackgroundUrl}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
                      alt="Hero Preview"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-samasa-black/40 via-samasa-black/80 to-samasa-black" />
                  <div className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-10">
                    <div className="text-3xl sm:text-4xl font-black text-white leading-[0.95] tracking-tighter">
                      {draft.heroHeadingTop}{" "}
                      <span className="text-samasa-yellow italic">{draft.heroHeadingHighlight}</span>
                    </div>
                    <div className="mt-4 text-slate-300 font-medium max-w-xl">
                      {draft.heroSubtitle}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] sm:rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 sm:p-10 border-b border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Preview
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tighter text-samasa-black">
                    Vision Image
                  </div>
                </div>
                <div className="p-8 sm:p-10">
                  <div className="aspect-[4/5] rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden border border-slate-100 bg-slate-50 relative">
                    {draft.visionImageUrl ? (
                      <img
                        src={draft.visionImageUrl}
                        alt="Vision Preview"
                        className="w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
                    )}
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
