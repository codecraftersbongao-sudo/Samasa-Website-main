// src/pages/LegislativeHub.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  User,
  UserRole,
  ProposalCategory,
  Proposal,
  Project,
  ProjectStatus,
} from "../types";
import {
  Layout,
  Package,
  Send,
  CheckCircle,
  Plus,
  Trash2,
  Calendar,
  UserCircle,
  FileText,
  X,
  Pencil,
  Save,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Download,
  Target,
  Coins,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";

// ✅ Firestore
import { db } from "../firebase/firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type HubTab = "RESOURCES" | "PROGRAMS" | "POLICY" | "PROJECTS";
type CreateType = "PROPOSAL" | "PROJECT";

type ProposalWithMedia = Proposal & {
  id: string;
  pdfName?: string;
  pdfUrl?: string;
  pdfPublicId?: string;
  createdAt?: any;
  updatedAt?: any;
};

type ProjectWithMedia = Project & {
  id: string;
  pdfName?: string;
  pdfUrl?: string;
  pdfPublicId?: string;

  bannerPublicId?: string;
  createdAt?: any;
  updatedAt?: any;
};

export interface LegislativeHubProps {
  user: User;

  /**
   * Optional override permission:
   * - true  => allow full manage/create/edit
   * - false => read-only
   * - undefined => derived from role (SUPERADMIN/OFFICER)
   */
  isEditable?: boolean;

  /**
   * ✅ For LandingPage embed:
   * - hides LegislativeHub internal title/subtitle (so it won't duplicate landing hero headings)
   * - also switches tabs to smaller "landing page style"
   */
  hideHeader?: boolean;

  /** ✅ Which tab opens initially */
  initialTab?: HubTab;
}

// ==============================
// ✅ Cloudinary upload (unsigned, client-side)
// ==============================
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
const BASE_FOLDER =
  (import.meta.env.VITE_CLOUDINARY_FOLDER as string) || "samasa/legislative";

async function uploadToCloudinary(file: File, folder: string) {
  const cloudName = (CLOUD_NAME || "").trim();
  const preset = (UPLOAD_PRESET || "").trim();

  if (!cloudName || !preset) {
    throw new Error(
      "Missing Cloudinary env. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const resourceType =
    file.type === "application/pdf"
      ? "raw"
      : file.type.startsWith("image/")
        ? "image"
        : "auto";

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  form.append("folder", folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const res = await fetch(endpoint, { method: "POST", body: form });

  if (!res.ok) {
    let message = `Cloudinary upload failed (${res.status})`;
    try {
      const j = await res.json();
      message = j?.error?.message || JSON.stringify(j);
    } catch {
      try {
        message = await res.text();
      } catch {}
    }
    throw new Error(message);
  }

  const data = (await res.json()) as any;
  return { url: String(data.secure_url), publicId: String(data.public_id) };
}

// ==============================
// Helpers
// ==============================
const DEFAULT_PROJECT_BANNER =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=60";

const prettyToday = () =>
  new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const safePercent = (spent: number, budget: number) => {
  if (!budget || budget <= 0) return 0;
  const v = (spent / budget) * 100;
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
};

const getUserDisplayName = (user: User) => {
  const anyUser = user as any;
  return (
    anyUser?.name ||
    anyUser?.fullName ||
    anyUser?.displayName ||
    anyUser?.username ||
    "Proponent"
  );
};

const revokeIfBlob = (url?: string) => {
  if (url && url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
};

const getProposalStatusStyle = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700";
    case "IMPLEMENTED":
      return "bg-samasa-blue text-white";
    case "REVIEW":
      return "bg-samasa-yellow text-samasa-black";
    default:
      return "bg-slate-100 text-slate-500";
  }
};

const getProjectStatusColor = (status: ProjectStatus) => {
  switch (status) {
    case ProjectStatus.COMPLETED:
      return "bg-emerald-100 text-emerald-700";
    case ProjectStatus.ONGOING:
      return "bg-samasa-blue text-white";
    case ProjectStatus.PLANNED:
      return "bg-samasa-yellow text-samasa-black";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getProjectStatusIcon = (status: ProjectStatus) => {
  switch (status) {
    case ProjectStatus.COMPLETED:
      return <CheckCircle2 className="w-4 h-4 mr-2" />;
    case ProjectStatus.ONGOING:
      return <CircleDashed className="w-4 h-4 mr-2 animate-spin" />;
    case ProjectStatus.PLANNED:
      return <Layout className="w-4 h-4 mr-2" />;
    default:
      return null;
  }
};

const TAB_META: Array<{
  key: HubTab;
  label: string;
  icon: React.ReactNode;
  activeClasses: string;
}> = [
  {
    key: "RESOURCES",
    label: "Resources",
    icon: <Package className="w-4 h-4" />,
    activeClasses: "bg-samasa-blue border-samasa-blue text-white shadow-lg",
  },
  {
    key: "PROGRAMS",
    label: "Programs",
    icon: <Send className="w-4 h-4" />,
    activeClasses: "bg-samasa-blue border-samasa-blue text-white shadow-lg",
  },
  {
    key: "POLICY",
    label: "Policy",
    icon: <CheckCircle className="w-4 h-4" />,
    activeClasses: "bg-samasa-blue border-samasa-blue text-white shadow-lg",
  },
  {
    key: "PROJECTS",
    label: "Projects",
    icon: <Layout className="w-4 h-4" />,
    activeClasses: "bg-samasa-black border-samasa-black text-samasa-yellow shadow-lg",
  },
];

const LegislativeHub: React.FC<LegislativeHubProps> = ({
  user,
  isEditable,
  hideHeader = false,
  initialTab = "RESOURCES",
}) => {
  const isEmbed = hideHeader;

  // ✅ Permissions
  const isSuper = user?.role === UserRole.SUPERADMIN;
  const isOfficer = user?.role === UserRole.OFFICER;

  const canCreateProposal = isEditable ?? (isSuper || isOfficer);
  const canCreateProject = isEditable ?? isSuper;
  const canManage = isEditable ?? isSuper;

  // ✅ tab
  const [activeTab, setActiveTab] = useState<HubTab>(() => initialTab);
  useEffect(() => setActiveTab(initialTab), [initialTab]);

  // ✅ Firestore data
  const [proposals, setProposals] = useState<ProposalWithMedia[]>([]);
  const [projects, setProjects] = useState<ProjectWithMedia[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // ✅ Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<CreateType>("PROPOSAL");
  const [savingCreate, setSavingCreate] = useState(false);

  const [selectedProposal, setSelectedProposal] = useState<ProposalWithMedia | null>(
    null
  );
  const [selectedProject, setSelectedProject] = useState<ProjectWithMedia | null>(
    null
  );

  // ==========
  // CREATE: Proposal form
  // ==========
  const [pTitle, setPTitle] = useState("");
  const [pCategory, setPCategory] = useState<ProposalCategory>(
    ProposalCategory.RESOURCES
  );
  const [pNarrative, setPNarrative] = useState("");
  const [pProponent, setPProponent] = useState<string>(getUserDisplayName(user));
  const [pPdfName, setPPdfName] = useState<string>("");
  const [pPdfUrl, setPPdfUrl] = useState<string>("");
  const [pPdfFile, setPPdfFile] = useState<File | null>(null);

  // ==========
  // CREATE: Project form
  // ==========
  const [prTitle, setPrTitle] = useState("");
  const [prTimeline, setPrTimeline] = useState("");
  const [prInCharge, setPrInCharge] = useState("");
  const [prStatus, setPrStatus] = useState<ProjectStatus>(ProjectStatus.PLANNED);
  const [prDesc, setPrDesc] = useState("");
  const [prBudget, setPrBudget] = useState<number>(0);
  const [prSpent, setPrSpent] = useState<number>(0);
  const [prObjectives, setPrObjectives] = useState<string>("");

  const [prBannerUrl, setPrBannerUrl] = useState<string>("");
  const [prBannerFile, setPrBannerFile] = useState<File | null>(null);

  const [prPdfName, setPrPdfName] = useState<string>("");
  const [prPdfUrl, setPrPdfUrl] = useState<string>("");
  const [prPdfFile, setPrPdfFile] = useState<File | null>(null);

  // ==========
  // EDIT (Proposal modal)
  // ==========
  const [proposalEditMode, setProposalEditMode] = useState(false);
  const [savingProposalEdit, setSavingProposalEdit] = useState(false);

  const [ppTitle, setPpTitle] = useState("");
  const [ppCategory, setPpCategory] = useState<ProposalCategory>(
    ProposalCategory.RESOURCES
  );
  const [ppNarrative, setPpNarrative] = useState("");
  const [ppProponent, setPpProponent] = useState("");
  const [ppStatus, setPpStatus] = useState<string>("REVIEW");

  const [ppPdfName, setPpPdfName] = useState("");
  const [ppPdfUrl, setPpPdfUrl] = useState("");
  const [ppPdfPublicId, setPpPdfPublicId] = useState<string | undefined>(undefined);
  const [ppPdfFile, setPpPdfFile] = useState<File | null>(null);

  // ==========
  // EDIT (Project modal)
  // ==========
  const [projectEditMode, setProjectEditMode] = useState(false);
  const [savingProjectEdit, setSavingProjectEdit] = useState(false);

  const [epTitle, setEpTitle] = useState("");
  const [epTimeline, setEpTimeline] = useState("");
  const [epInCharge, setEpInCharge] = useState("");
  const [epStatus, setEpStatus] = useState<ProjectStatus>(ProjectStatus.PLANNED);
  const [epDesc, setEpDesc] = useState("");
  const [epBudget, setEpBudget] = useState<number>(0);
  const [epSpent, setEpSpent] = useState<number>(0);
  const [epObjectives, setEpObjectives] = useState<string>("");

  const [epBannerUrl, setEpBannerUrl] = useState<string>("");
  const [epBannerPublicId, setEpBannerPublicId] = useState<string | undefined>(
    undefined
  );
  const [epBannerFile, setEpBannerFile] = useState<File | null>(null);

  const [epPdfName, setEpPdfName] = useState<string>("");
  const [epPdfUrl, setEpPdfUrl] = useState<string>("");
  const [epPdfPublicId, setEpPdfPublicId] = useState<string | undefined>(undefined);
  const [epPdfFile, setEpPdfFile] = useState<File | null>(null);

  // ==========
  // Refs (create inputs)
  // ==========
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const proposalPdfInputRef = useRef<HTMLInputElement | null>(null);
  const projectPdfInputRef = useRef<HTMLInputElement | null>(null);

  // ==========
  // Refs (edit modal inputs)
  // ==========
  const proposalModalPdfRef = useRef<HTMLInputElement | null>(null);
  const projectModalPdfRef = useRef<HTMLInputElement | null>(null);
  const projectModalBannerRef = useRef<HTMLInputElement | null>(null);

  // ==========
  // Object URL refs (cleanup)
  // ==========
  const lastBannerObjectUrlRef = useRef<string | null>(null);
  const lastProposalPdfObjectUrlRef = useRef<string | null>(null);
  const lastProjectPdfObjectUrlRef = useRef<string | null>(null);

  const lastProposalModalPdfBlobRef = useRef<string | null>(null);
  const lastEditPdfBlobRef = useRef<string | null>(null);
  const lastEditBannerBlobRef = useRef<string | null>(null);

  // ==============================
  // Firestore listeners
  // ==============================
  useEffect(() => {
    const qProps = query(collection(db, "proposals"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qProps,
      (snap) => {
        const rows: ProposalWithMedia[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: String(data.title ?? ""),
            category: (data.category ?? ProposalCategory.RESOURCES) as any,
            description: String(data.description ?? ""),
            status: String(data.status ?? "REVIEW"),
            dateSubmitted: String(data.dateSubmitted ?? ""),
            proponent: String(data.proponent ?? ""),
            pdfName: data.pdfName ? String(data.pdfName) : "",
            pdfUrl: data.pdfUrl ? String(data.pdfUrl) : "",
            pdfPublicId: data.pdfPublicId ? String(data.pdfPublicId) : "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as any;
        });
        setProposals(rows);
        setLoadingProposals(false);
      },
      (err) => {
        console.error("proposals snapshot error:", err);
        setLoadingProposals(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const qProjs = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qProjs,
      (snap) => {
        const rows: ProjectWithMedia[] = snap.docs.map((d) => {
          const data = d.data() as any;

          const objectivesArr = Array.isArray(data.objectives)
            ? data.objectives.map((x: any) => String(x)).filter(Boolean)
            : [];

          return {
            id: d.id,
            title: String(data.title ?? ""),
            timeline: String(data.timeline ?? ""),
            inCharge: String(data.inCharge ?? ""),
            status: (data.status ?? ProjectStatus.PLANNED) as any,
            description: String(data.description ?? ""),
            objectives: objectivesArr,
            budgetAllocated: safeNum(data.budgetAllocated),
            spentAmount: safeNum(data.spentAmount),
            bannerImage: String(data.bannerImage ?? DEFAULT_PROJECT_BANNER),
            bannerPublicId: data.bannerPublicId ? String(data.bannerPublicId) : "",
            pdfName: data.pdfName ? String(data.pdfName) : "",
            pdfUrl: data.pdfUrl ? String(data.pdfUrl) : "",
            pdfPublicId: data.pdfPublicId ? String(data.pdfPublicId) : "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as any;
        });
        setProjects(rows);
        setLoadingProjects(false);
      },
      (err) => {
        console.error("projects snapshot error:", err);
        setLoadingProjects(false);
      }
    );
    return () => unsub();
  }, []);

  // ==============================
  // Lock background scroll while modal open + ESC close
  // ==============================
  useEffect(() => {
    const anyModalOpen = showCreateModal || !!selectedProject || !!selectedProposal;
    if (!anyModalOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showCreateModal) closeCreate();
      if (selectedProject) closeProjectModal();
      if (selectedProposal) closeProposalModal();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateModal, selectedProject, selectedProposal]);

  // Cleanup blobs on unmount
  useEffect(() => {
    return () => {
      revokeIfBlob(lastBannerObjectUrlRef.current || undefined);
      revokeIfBlob(lastProposalPdfObjectUrlRef.current || undefined);
      revokeIfBlob(lastProjectPdfObjectUrlRef.current || undefined);

      revokeIfBlob(lastProposalModalPdfBlobRef.current || undefined);
      revokeIfBlob(lastEditPdfBlobRef.current || undefined);
      revokeIfBlob(lastEditBannerBlobRef.current || undefined);
    };
  }, []);

  // ==============================
  // Derived lists
  // ==============================
  const filteredProposals = useMemo(() => {
    const map: Record<HubTab, ProposalCategory | null> = {
      RESOURCES: ProposalCategory.RESOURCES,
      PROGRAMS: ProposalCategory.PROGRAMS,
      POLICY: ProposalCategory.POLICY,
      PROJECTS: null,
    };
    const cat = map[activeTab];
    if (!cat) return [];
    return proposals.filter((p) => (p as any).category === cat);
  }, [activeTab, proposals]);

  // ==============================
  // Create modal open/close/reset
  // ==============================
  const openCreate = () => {
    const allowed = activeTab === "PROJECTS" ? canCreateProject : canCreateProposal;
    if (!allowed) return;

    const defaultType: CreateType = activeTab === "PROJECTS" ? "PROJECT" : "PROPOSAL";
    setCreateType(defaultType);

    // set category for proposal
    if (activeTab === "RESOURCES") setPCategory(ProposalCategory.RESOURCES);
    if (activeTab === "PROGRAMS") setPCategory(ProposalCategory.PROGRAMS);
    if (activeTab === "POLICY") setPCategory(ProposalCategory.POLICY);

    setPProponent(getUserDisplayName(user));
    setShowCreateModal(true);
  };

  const resetCreateForms = () => {
    // Proposal
    setPTitle("");
    setPNarrative("");
    setPProponent(getUserDisplayName(user));
    setPPdfName("");
    setPPdfUrl("");
    setPPdfFile(null);
    if (proposalPdfInputRef.current) proposalPdfInputRef.current.value = "";
    revokeIfBlob(lastProposalPdfObjectUrlRef.current || undefined);
    lastProposalPdfObjectUrlRef.current = null;

    // Project
    setPrTitle("");
    setPrTimeline("");
    setPrInCharge("");
    setPrStatus(ProjectStatus.PLANNED);
    setPrDesc("");
    setPrBudget(0);
    setPrSpent(0);
    setPrObjectives("");

    setPrBannerUrl("");
    setPrBannerFile(null);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
    revokeIfBlob(lastBannerObjectUrlRef.current || undefined);
    lastBannerObjectUrlRef.current = null;

    setPrPdfName("");
    setPrPdfUrl("");
    setPrPdfFile(null);
    if (projectPdfInputRef.current) projectPdfInputRef.current.value = "";
    revokeIfBlob(lastProjectPdfObjectUrlRef.current || undefined);
    lastProjectPdfObjectUrlRef.current = null;
  };

  const closeCreate = () => {
    setShowCreateModal(false);
    setSavingCreate(false);
    resetCreateForms();
  };

  // ==============================
  // Create file pickers
  // ==============================
  const onBannerPick = (file?: File | null) => {
    if (!file) return;
    const okTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!okTypes.includes(file.type)) {
      alert("Please upload a JPG, PNG, WEBP, or GIF image.");
      if (bannerInputRef.current) bannerInputRef.current.value = "";
      return;
    }

    revokeIfBlob(lastBannerObjectUrlRef.current || undefined);
    lastBannerObjectUrlRef.current = null;

    const url = URL.createObjectURL(file);
    lastBannerObjectUrlRef.current = url;

    setPrBannerFile(file);
    setPrBannerUrl(url);
  };

  const onProposalPdfPick = (file?: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      if (proposalPdfInputRef.current) proposalPdfInputRef.current.value = "";
      return;
    }

    revokeIfBlob(lastProposalPdfObjectUrlRef.current || undefined);
    lastProposalPdfObjectUrlRef.current = null;

    const url = URL.createObjectURL(file);
    lastProposalPdfObjectUrlRef.current = url;

    setPPdfFile(file);
    setPPdfName(file.name);
    setPPdfUrl(url);
  };

  const removeProposalPdf = () => {
    revokeIfBlob(lastProposalPdfObjectUrlRef.current || undefined);
    lastProposalPdfObjectUrlRef.current = null;

    setPPdfFile(null);
    setPPdfName("");
    setPPdfUrl("");
    if (proposalPdfInputRef.current) proposalPdfInputRef.current.value = "";
  };

  const onProjectPdfPick = (file?: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      if (projectPdfInputRef.current) projectPdfInputRef.current.value = "";
      return;
    }

    revokeIfBlob(lastProjectPdfObjectUrlRef.current || undefined);
    lastProjectPdfObjectUrlRef.current = null;

    const url = URL.createObjectURL(file);
    lastProjectPdfObjectUrlRef.current = url;

    setPrPdfFile(file);
    setPrPdfName(file.name);
    setPrPdfUrl(url);
  };

  const removeProjectPdf = () => {
    revokeIfBlob(lastProjectPdfObjectUrlRef.current || undefined);
    lastProjectPdfObjectUrlRef.current = null;

    setPrPdfFile(null);
    setPrPdfName("");
    setPrPdfUrl("");
    if (projectPdfInputRef.current) projectPdfInputRef.current.value = "";
  };

  // ==============================
  // Create submit
  // ==============================
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingCreate) return;

    if (createType === "PROPOSAL" && !canCreateProposal) return;
    if (createType === "PROJECT" && !canCreateProject) return;

    try {
      setSavingCreate(true);

      if (createType === "PROPOSAL") {
        const title = pTitle.trim();
        const description = pNarrative.trim();
        const proponentName = pProponent.trim() || getUserDisplayName(user);
        if (!title || !description) return;

        const base = {
          title,
          category: pCategory,
          description,
          status: "REVIEW",
          dateSubmitted: prettyToday(),
          proponent: proponentName,
          pdfName: null,
          pdfUrl: null,
          pdfPublicId: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const refDoc = await addDoc(collection(db, "proposals"), base as any);

        if (pPdfFile) {
          const up = await uploadToCloudinary(
            pPdfFile,
            `${BASE_FOLDER}/proposals/${refDoc.id}`
          );
          await updateDoc(doc(db, "proposals", refDoc.id), {
            pdfName: pPdfFile.name,
            pdfUrl: up.url,
            pdfPublicId: up.publicId,
            updatedAt: serverTimestamp(),
          } as any);
        }

        closeCreate();
        return;
      }

      // PROJECT
      const objectives = prObjectives
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const title = prTitle.trim();
      const timeline = prTimeline.trim();
      const inCharge = prInCharge.trim();
      const description = prDesc.trim();

      if (!title || !timeline || !inCharge || !description) return;

      const base = {
        title,
        timeline,
        inCharge,
        status: prStatus,
        description,
        objectives,
        budgetAllocated: Number(prBudget) || 0,
        spentAmount: Number(prSpent) || 0,
        bannerImage: DEFAULT_PROJECT_BANNER,
        bannerPublicId: null,
        pdfName: null,
        pdfUrl: null,
        pdfPublicId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const refDoc = await addDoc(collection(db, "projects"), base as any);

      if (prBannerFile) {
        const up = await uploadToCloudinary(
          prBannerFile,
          `${BASE_FOLDER}/projects/${refDoc.id}/banners`
        );
        await updateDoc(doc(db, "projects", refDoc.id), {
          bannerImage: up.url,
          bannerPublicId: up.publicId,
          updatedAt: serverTimestamp(),
        } as any);
      }

      if (prPdfFile) {
        const up = await uploadToCloudinary(
          prPdfFile,
          `${BASE_FOLDER}/projects/${refDoc.id}/pdfs`
        );
        await updateDoc(doc(db, "projects", refDoc.id), {
          pdfName: prPdfFile.name,
          pdfUrl: up.url,
          pdfPublicId: up.publicId,
          updatedAt: serverTimestamp(),
        } as any);
      }

      closeCreate();
    } catch (err: any) {
      console.error("CREATE ERROR:", err);
      alert(err?.message || "Failed to create record.");
    } finally {
      setSavingCreate(false);
    }
  };

  // ==============================
  // Delete actions
  // ==============================
  const deleteProposal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;
    if (!confirm("Delete this proposal?")) return;

    try {
      await deleteDoc(doc(db, "proposals", id));
      if (selectedProposal?.id === id) closeProposalModal();
    } catch (err: any) {
      console.error("DELETE PROPOSAL ERROR:", err);
      alert(err?.message || "Failed to delete proposal.");
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;
    if (!confirm("Delete this project?")) return;

    try {
      await deleteDoc(doc(db, "projects", id));
      if (selectedProject?.id === id) closeProjectModal();
    } catch (err: any) {
      console.error("DELETE PROJECT ERROR:", err);
      alert(err?.message || "Failed to delete project.");
    }
  };

  // ==============================
  // Proposal modal open/close + edit helpers
  // ==============================
  const openProposalModal = (p: ProposalWithMedia) => {
    setSelectedProposal(p);
    setProposalEditMode(false);

    setPpTitle((p as any).title || "");
    setPpCategory(((p as any).category || ProposalCategory.RESOURCES) as any);
    setPpNarrative((p as any).description || "");
    setPpProponent((p as any).proponent || "");
    setPpStatus(String((p as any).status || "REVIEW"));

    setPpPdfName((p as any).pdfName || "");
    setPpPdfUrl((p as any).pdfUrl || "");
    setPpPdfPublicId((p as any).pdfPublicId || undefined);
    setPpPdfFile(null);

    if (proposalModalPdfRef.current) proposalModalPdfRef.current.value = "";
    revokeIfBlob(lastProposalModalPdfBlobRef.current || undefined);
    lastProposalModalPdfBlobRef.current = null;
  };

  const closeProposalModal = () => {
    setProposalEditMode(false);

    if (lastProposalModalPdfBlobRef.current) {
      revokeIfBlob(lastProposalModalPdfBlobRef.current);
      lastProposalModalPdfBlobRef.current = null;
    }
    if (proposalModalPdfRef.current) proposalModalPdfRef.current.value = "";

    setPpPdfFile(null);
    setSelectedProposal(null);
  };

  const onProposalModalPdfPick = (file?: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      if (proposalModalPdfRef.current) proposalModalPdfRef.current.value = "";
      return;
    }

    revokeIfBlob(lastProposalModalPdfBlobRef.current || undefined);
    lastProposalModalPdfBlobRef.current = null;

    const url = URL.createObjectURL(file);
    lastProposalModalPdfBlobRef.current = url;

    setPpPdfFile(file);
    setPpPdfName(file.name);
    setPpPdfUrl(url);
  };

  const removeProposalModalPdf = () => {
    revokeIfBlob(lastProposalModalPdfBlobRef.current || undefined);
    lastProposalModalPdfBlobRef.current = null;

    setPpPdfFile(null);
    setPpPdfName("");
    setPpPdfUrl("");
    setPpPdfPublicId(undefined);
    if (proposalModalPdfRef.current) proposalModalPdfRef.current.value = "";
  };

  const cancelProposalEdits = () => {
    if (!selectedProposal) return;

    revokeIfBlob(lastProposalModalPdfBlobRef.current || undefined);
    lastProposalModalPdfBlobRef.current = null;
    if (proposalModalPdfRef.current) proposalModalPdfRef.current.value = "";

    const p = selectedProposal as any;
    setPpTitle(p.title || "");
    setPpCategory((p.category || ProposalCategory.RESOURCES) as any);
    setPpNarrative(p.description || "");
    setPpProponent(p.proponent || "");
    setPpStatus(String(p.status || "REVIEW"));

    setPpPdfName(p.pdfName || "");
    setPpPdfUrl(p.pdfUrl || "");
    setPpPdfPublicId(p.pdfPublicId || undefined);
    setPpPdfFile(null);

    setProposalEditMode(false);
  };

  const saveProposalEdits = async () => {
    if (!selectedProposal || !canManage || savingProposalEdit) return;

    const id = (selectedProposal as any).id;
    const title = ppTitle.trim();
    const description = ppNarrative.trim();
    const proponent = ppProponent.trim() || getUserDisplayName(user);
    const status = String(ppStatus || "REVIEW");

    if (!title || !description) return;

    try {
      setSavingProposalEdit(true);

      await updateDoc(doc(db, "proposals", id), {
        title,
        category: ppCategory,
        description,
        proponent,
        status,
        updatedAt: serverTimestamp(),
      } as any);

      if (ppPdfFile) {
        const up = await uploadToCloudinary(
          ppPdfFile,
          `${BASE_FOLDER}/proposals/${id}`
        );

        await updateDoc(doc(db, "proposals", id), {
          pdfName: ppPdfFile.name,
          pdfUrl: up.url,
          pdfPublicId: up.publicId,
          updatedAt: serverTimestamp(),
        } as any);

        setPpPdfPublicId(up.publicId);
      } else {
        if (!ppPdfUrl) {
          await updateDoc(doc(db, "proposals", id), {
            pdfName: null,
            pdfUrl: null,
            pdfPublicId: null,
            updatedAt: serverTimestamp(),
          } as any);
          setPpPdfPublicId(undefined);
        }
      }

      revokeIfBlob(lastProposalModalPdfBlobRef.current || undefined);
      lastProposalModalPdfBlobRef.current = null;
      if (proposalModalPdfRef.current) proposalModalPdfRef.current.value = "";
      setPpPdfFile(null);

      setProposalEditMode(false);
    } catch (err: any) {
      console.error("SAVE PROPOSAL ERROR:", err);
      alert(err?.message || "Failed to save proposal.");
    } finally {
      setSavingProposalEdit(false);
    }
  };

  // ==============================
  // Project modal open/close + edit helpers
  // ==============================
  const openProjectModal = (project: ProjectWithMedia) => {
    setSelectedProject(project);
    setProjectEditMode(false);

    const p = project as any;
    setEpTitle(p.title || "");
    setEpTimeline(p.timeline || "");
    setEpInCharge(p.inCharge || "");
    setEpStatus(p.status || ProjectStatus.PLANNED);
    setEpDesc(p.description || "");
    setEpBudget(Number(p.budgetAllocated) || 0);
    setEpSpent(Number(p.spentAmount) || 0);
    setEpObjectives((p.objectives || []).join(", "));

    setEpBannerUrl(p.bannerImage || DEFAULT_PROJECT_BANNER);
    setEpBannerPublicId(p.bannerPublicId || undefined);
    setEpBannerFile(null);
    if (projectModalBannerRef.current) projectModalBannerRef.current.value = "";
    revokeIfBlob(lastEditBannerBlobRef.current || undefined);
    lastEditBannerBlobRef.current = null;

    setEpPdfName(p.pdfName || "");
    setEpPdfUrl(p.pdfUrl || "");
    setEpPdfPublicId(p.pdfPublicId || undefined);
    setEpPdfFile(null);

    if (projectModalPdfRef.current) projectModalPdfRef.current.value = "";
    revokeIfBlob(lastEditPdfBlobRef.current || undefined);
    lastEditPdfBlobRef.current = null;
  };

  const closeProjectModal = () => {
    setProjectEditMode(false);

    if (lastEditPdfBlobRef.current) {
      revokeIfBlob(lastEditPdfBlobRef.current);
      lastEditPdfBlobRef.current = null;
    }
    if (lastEditBannerBlobRef.current) {
      revokeIfBlob(lastEditBannerBlobRef.current);
      lastEditBannerBlobRef.current = null;
    }

    if (projectModalPdfRef.current) projectModalPdfRef.current.value = "";
    if (projectModalBannerRef.current) projectModalBannerRef.current.value = "";

    setEpPdfFile(null);
    setEpBannerFile(null);
    setSelectedProject(null);
  };

  const onProjectModalPdfPick = (file?: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      if (projectModalPdfRef.current) projectModalPdfRef.current.value = "";
      return;
    }

    revokeIfBlob(lastEditPdfBlobRef.current || undefined);
    lastEditPdfBlobRef.current = null;

    const url = URL.createObjectURL(file);
    lastEditPdfBlobRef.current = url;

    setEpPdfFile(file);
    setEpPdfName(file.name);
    setEpPdfUrl(url);
  };

  const removeProjectModalPdf = () => {
    revokeIfBlob(lastEditPdfBlobRef.current || undefined);
    lastEditPdfBlobRef.current = null;

    setEpPdfFile(null);
    setEpPdfName("");
    setEpPdfUrl("");
    setEpPdfPublicId(undefined);
    if (projectModalPdfRef.current) projectModalPdfRef.current.value = "";
  };

  const onProjectModalBannerPick = (file?: File | null) => {
    if (!file) return;

    const okTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!okTypes.includes(file.type)) {
      alert("Please upload a JPG, PNG, WEBP, or GIF image.");
      if (projectModalBannerRef.current) projectModalBannerRef.current.value = "";
      return;
    }

    revokeIfBlob(lastEditBannerBlobRef.current || undefined);
    lastEditBannerBlobRef.current = null;

    const url = URL.createObjectURL(file);
    lastEditBannerBlobRef.current = url;

    setEpBannerFile(file);
    setEpBannerUrl(url);
  };

  const removeProjectModalBanner = () => {
    revokeIfBlob(lastEditBannerBlobRef.current || undefined);
    lastEditBannerBlobRef.current = null;

    setEpBannerFile(null);
    setEpBannerUrl(DEFAULT_PROJECT_BANNER);
    setEpBannerPublicId(undefined);
    if (projectModalBannerRef.current) projectModalBannerRef.current.value = "";
  };

  const cancelProjectEdits = () => {
    if (!selectedProject) return;

    revokeIfBlob(lastEditPdfBlobRef.current || undefined);
    lastEditPdfBlobRef.current = null;
    revokeIfBlob(lastEditBannerBlobRef.current || undefined);
    lastEditBannerBlobRef.current = null;

    if (projectModalPdfRef.current) projectModalPdfRef.current.value = "";
    if (projectModalBannerRef.current) projectModalBannerRef.current.value = "";

    const p = selectedProject as any;

    setEpTitle(p.title || "");
    setEpTimeline(p.timeline || "");
    setEpInCharge(p.inCharge || "");
    setEpStatus(p.status || ProjectStatus.PLANNED);
    setEpDesc(p.description || "");
    setEpBudget(Number(p.budgetAllocated) || 0);
    setEpSpent(Number(p.spentAmount) || 0);
    setEpObjectives((p.objectives || []).join(", "));

    setEpBannerUrl(p.bannerImage || DEFAULT_PROJECT_BANNER);
    setEpBannerPublicId(p.bannerPublicId || undefined);
    setEpBannerFile(null);

    setEpPdfName(p.pdfName || "");
    setEpPdfUrl(p.pdfUrl || "");
    setEpPdfPublicId(p.pdfPublicId || undefined);
    setEpPdfFile(null);

    setProjectEditMode(false);
  };

  const saveProjectEdits = async () => {
    if (!selectedProject || !canManage || savingProjectEdit) return;

    const id = (selectedProject as any).id;

    const updatedObjectives = epObjectives
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const title = epTitle.trim();
    const timeline = epTimeline.trim();
    const inCharge = epInCharge.trim();
    const description = epDesc.trim();

    if (!title || !timeline || !inCharge || !description) return;

    try {
      setSavingProjectEdit(true);

      await updateDoc(doc(db, "projects", id), {
        title,
        timeline,
        inCharge,
        status: epStatus,
        description,
        objectives: updatedObjectives,
        budgetAllocated: Number(epBudget) || 0,
        spentAmount: Number(epSpent) || 0,
        updatedAt: serverTimestamp(),
      } as any);

      if (epBannerFile) {
        const up = await uploadToCloudinary(
          epBannerFile,
          `${BASE_FOLDER}/projects/${id}/banners`
        );

        await updateDoc(doc(db, "projects", id), {
          bannerImage: up.url,
          bannerPublicId: up.publicId,
          updatedAt: serverTimestamp(),
        } as any);

        setEpBannerPublicId(up.publicId);
      } else {
        if (epBannerUrl === DEFAULT_PROJECT_BANNER) {
          await updateDoc(doc(db, "projects", id), {
            bannerImage: DEFAULT_PROJECT_BANNER,
            bannerPublicId: null,
            updatedAt: serverTimestamp(),
          } as any);
          setEpBannerPublicId(undefined);
        }
      }

      if (epPdfFile) {
        const up = await uploadToCloudinary(
          epPdfFile,
          `${BASE_FOLDER}/projects/${id}/pdfs`
        );

        await updateDoc(doc(db, "projects", id), {
          pdfName: epPdfFile.name,
          pdfUrl: up.url,
          pdfPublicId: up.publicId,
          updatedAt: serverTimestamp(),
        } as any);

        setEpPdfPublicId(up.publicId);
      } else {
        if (!epPdfUrl) {
          await updateDoc(doc(db, "projects", id), {
            pdfName: null,
            pdfUrl: null,
            pdfPublicId: null,
            updatedAt: serverTimestamp(),
          } as any);
          setEpPdfPublicId(undefined);
        }
      }

      revokeIfBlob(lastEditPdfBlobRef.current || undefined);
      lastEditPdfBlobRef.current = null;
      revokeIfBlob(lastEditBannerBlobRef.current || undefined);
      lastEditBannerBlobRef.current = null;

      if (projectModalPdfRef.current) projectModalPdfRef.current.value = "";
      if (projectModalBannerRef.current) projectModalBannerRef.current.value = "";

      setEpPdfFile(null);
      setEpBannerFile(null);

      setProjectEditMode(false);
    } catch (err: any) {
      console.error("SAVE PROJECT ERROR:", err);
      alert(err?.message || "Failed to save project.");
    } finally {
      setSavingProjectEdit(false);
    }
  };

  // ==============================
  // UI helpers (tabs size for embed)
  // ==============================
  const tabWrapClass = isEmbed
    ? "grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6"
    : "grid grid-cols-2 md:grid-cols-4 gap-4 mb-10";

  const tabBtnClass = (active: boolean, activeClasses: string) => {
    const base = isEmbed
      ? "px-4 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2"
      : "px-7 py-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3";

    const inactive = isEmbed
      ? "bg-white border-slate-200 text-slate-500 hover:border-samasa-blue/40 hover:bg-slate-50"
      : "bg-white border-slate-100 text-slate-400 hover:border-samasa-blue/30";

    const activeExtra = isEmbed ? "shadow-md" : "";
    return [base, active ? `${activeClasses} ${activeExtra}` : inactive].join(" ");
  };

  const tabLabelClass = isEmbed
    ? "text-[10px] font-black uppercase tracking-widest"
    : "text-[11px] font-black uppercase tracking-widest";

  // ==============================
  // Render
  // ==============================
  return (
    <div className={isEmbed ? "max-w-7xl mx-auto pb-8" : "max-w-7xl mx-auto pb-20"}>
      {/* Header (hidden on LandingPage) */}
      {!hideHeader && (
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-8">
          <div>
            <div className="flex items-center space-x-2 text-samasa-blue font-black mb-3 uppercase tracking-[0.3em] text-[10px]">
              <Send className="w-4 h-4" />
              <span>Legislative Hub</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-samasa-black tracking-tight mb-3">
              Governance Archive
            </h1>
            <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">
              Resources, Programs, and Policy proposals — plus a Projects archive.
            </p>
          </div>

          {(activeTab === "PROJECTS" ? canCreateProject : canCreateProposal) && (
            <button
              onClick={openCreate}
              className="flex items-center justify-center space-x-3 px-10 py-4 bg-samasa-black text-samasa-yellow font-black rounded-full shadow-xl hover:bg-samasa-blue hover:text-white transition-all text-sm uppercase tracking-widest active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>NEW</span>
            </button>
          )}
        </div>
      )}

      {/* Embed-mode: if user is allowed to create but header hidden, still show a small button */}
      {hideHeader && (activeTab === "PROJECTS" ? canCreateProject : canCreateProposal) && (
        <div className="flex justify-end mb-3">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-samasa-black text-samasa-yellow text-[10px] font-black uppercase tracking-widest hover:bg-samasa-blue hover:text-white transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      )}

      {/* Tabs (smaller on LandingPage embed) */}
      <div className={tabWrapClass}>
        {TAB_META.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={tabBtnClass(active, t.activeClasses)}
            >
              {t.icon}
              <span className={tabLabelClass}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "PROJECTS" ? (
        <div className="grid grid-cols-1 gap-12">
          {loadingProjects ? (
            <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-200">
              <div className="text-slate-300 font-black uppercase tracking-widest text-[10px]">
                Loading projects…
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-200">
              <Layout className="w-16 h-16 text-slate-100 mx-auto mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-widest">
                No projects yet.
              </p>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={(project as any).id}
                className="bg-white rounded-[3.5rem] overflow-hidden border border-slate-200 shadow-sm flex flex-col lg:flex-row hover:shadow-2xl transition-all group relative"
              >
                {canManage && (
                  <button
                    onClick={(e) => deleteProject((project as any).id, e)}
                    className="absolute top-6 right-6 z-10 p-3 bg-white/95 backdrop-blur rounded-full text-slate-300 hover:text-samasa-red shadow-lg transition-all"
                    aria-label="Delete project"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                <div className="lg:w-1/2 h-80 lg:h-auto relative overflow-hidden">
                  <img
                    src={(project as any).bannerImage}
                    alt={(project as any).title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div
                    className={[
                      "absolute top-8 left-8 inline-flex items-center px-6 py-2.5 rounded-full",
                      "text-[10px] font-black uppercase tracking-widest shadow-xl",
                      getProjectStatusColor((project as any).status),
                    ].join(" ")}
                  >
                    {getProjectStatusIcon((project as any).status)}
                    {(project as any).status}
                  </div>
                </div>

                <div className="lg:w-1/2 p-12 lg:p-16 flex flex-col justify-between relative bg-white">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.04] pointer-events-none">
                    <Target className="w-28 h-28 text-samasa-black" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] pr-14">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-samasa-red" />
                        {(project as any).timeline}
                      </span>
                      <span className="flex items-center">
                        <UserCircle className="w-4 h-4 mr-2 text-samasa-blue" />
                        {(project as any).inCharge}
                      </span>

                      {(project as any).pdfUrl && (
                        <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                          <FileText className="w-4 h-4" />
                          PDF
                        </span>
                      )}
                    </div>

                    <h2 className="text-4xl font-black text-samasa-black mb-6 leading-tight group-hover:text-samasa-blue transition-colors">
                      {(project as any).title}
                    </h2>
                    <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">
                      {(project as any).description}
                    </p>
                  </div>

                  <div className="space-y-10">
                    <div className="flex flex-wrap gap-3">
                      {(project as any).objectives?.map((obj: string, i: number) => (
                        <span
                          key={i}
                          className="px-5 py-2 bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest"
                        >
                          {obj}
                        </span>
                      ))}
                    </div>

                    <div className="pt-10 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                      <div className="flex-grow max-w-xs space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Fund Utilization</span>
                          <span className="text-samasa-blue">
                            {Math.round(
                              safePercent(
                                (project as any).spentAmount,
                                (project as any).budgetAllocated
                              )
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-samasa-blue rounded-full transition-all duration-1000"
                            style={{
                              width: `${safePercent(
                                (project as any).spentAmount,
                                (project as any).budgetAllocated
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openProjectModal(project)}
                        className="px-10 py-4 bg-samasa-black text-samasa-yellow font-black rounded-full hover:bg-samasa-blue hover:text-white transition-all text-xs uppercase tracking-widest shadow-xl active:scale-95 whitespace-nowrap"
                      >
                        Examine Project
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {loadingProposals ? (
            <div className="col-span-2 py-24 text-center bg-white rounded-[3rem] border border-slate-200">
              <div className="text-slate-300 font-black uppercase tracking-widest text-[10px]">
                Loading proposals…
              </div>
            </div>
          ) : filteredProposals.length > 0 ? (
            filteredProposals.map((p) => (
              <div
                key={(p as any).id}
                onClick={() => openProposalModal(p)}
                className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative group hover:shadow-2xl transition-all flex flex-col justify-between cursor-pointer"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-samasa-yellow opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between gap-4 mb-6 pr-2">
                  <span
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getProposalStatusStyle(
                      (p as any).status
                    )}`}
                  >
                    {(p as any).status}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-300 uppercase whitespace-nowrap">
                      {(p as any).dateSubmitted}
                    </span>

                    {canManage && (
                      <button
                        type="button"
                        onClick={(e) => deleteProposal((p as any).id, e)}
                        className="p-2 rounded-full bg-slate-50 border border-slate-100 text-slate-300 hover:text-samasa-red hover:bg-white shadow-sm transition-all"
                        aria-label="Delete proposal"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-samasa-black mb-4 leading-tight group-hover:text-samasa-blue transition-colors">
                    {(p as any).title}
                  </h3>
                  <p className="text-slate-500 font-medium mb-8 leading-relaxed line-clamp-3">
                    {(p as any).description}
                  </p>

                  {(p as any).pdfUrl && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      <FileText className="w-4 h-4" />
                      PDF Attached
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <UserCircle className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-samasa-black">
                      {(p as any).proponent}
                    </span>
                  </div>

                  <div className="px-6 py-2.5 bg-slate-100 text-slate-500 font-black text-[10px] rounded-full group-hover:bg-samasa-black group-hover:text-white transition-all uppercase tracking-widest">
                    View Details
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-200">
              <Package className="w-16 h-16 text-slate-100 mx-auto mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-widest">
                No proposals found for this category.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==============================
          CREATE MODAL
      ============================== */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreate();
          }}
        >
          <div className="w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                  Create
                </div>
                <div className="text-2xl font-black text-samasa-black">
                  {createType === "PROJECT" ? "New Project" : "New Proposal"}
                </div>
              </div>

              <button
                onClick={closeCreate}
                className="p-3 rounded-full bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-700 hover:bg-white transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="px-10 py-8 space-y-8">
              {/* Type switch */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setCreateType("PROPOSAL")}
                  disabled={!canCreateProposal}
                  className={[
                    "flex-1 px-6 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    createType === "PROPOSAL"
                      ? "bg-samasa-blue text-white border-samasa-blue shadow-lg"
                      : "bg-white text-slate-500 border-slate-200 hover:border-samasa-blue/40",
                    !canCreateProposal ? "opacity-40 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  Proposal
                </button>

                <button
                  type="button"
                  onClick={() => setCreateType("PROJECT")}
                  disabled={!canCreateProject}
                  className={[
                    "flex-1 px-6 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    createType === "PROJECT"
                      ? "bg-samasa-black text-samasa-yellow border-samasa-black shadow-lg"
                      : "bg-white text-slate-500 border-slate-200 hover:border-samasa-blue/40",
                    !canCreateProject ? "opacity-40 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  Project
                </button>
              </div>

              {createType === "PROPOSAL" ? (
                <>
                  {/* Title */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Title
                    </label>
                    <input
                      value={pTitle}
                      onChange={(e) => setPTitle(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      placeholder="Enter proposal title..."
                      required
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Category
                    </label>
                    <select
                      value={String(pCategory)}
                      onChange={(e) => setPCategory(e.target.value as any)}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                    >
                      <option value={ProposalCategory.RESOURCES}>RESOURCES</option>
                      <option value={ProposalCategory.PROGRAMS}>PROGRAMS</option>
                      <option value={ProposalCategory.POLICY}>POLICY</option>
                    </select>
                  </div>

                  {/* Proponent */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Proponent
                    </label>
                    <input
                      value={pProponent}
                      onChange={(e) => setPProponent(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      placeholder="Your name..."
                    />
                  </div>

                  {/* Narrative */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Narrative / Description
                    </label>
                    <textarea
                      value={pNarrative}
                      onChange={(e) => setPNarrative(e.target.value)}
                      className="w-full min-h-[140px] px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      placeholder="Write the proposal narrative..."
                      required
                    />
                  </div>

                  {/* PDF */}
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-samasa-blue" />
                        <div>
                          <div className="text-sm font-black text-samasa-black">
                            Attach PDF (optional)
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Upload a PDF document
                          </div>
                        </div>
                      </div>

                      <input
                        ref={proposalPdfInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => onProposalPdfPick(e.target.files?.[0] || null)}
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => proposalPdfInputRef.current?.click()}
                          className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Choose
                          </span>
                        </button>

                        {(pPdfUrl || pPdfName) && (
                          <button
                            type="button"
                            onClick={removeProposalPdf}
                            className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-samasa-red transition-all"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {(pPdfUrl || pPdfName) ? (
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-3 text-slate-600">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-bold truncate max-w-[60vw] sm:max-w-[420px]">
                            {pPdfName || "Selected PDF"}
                          </span>
                        </div>

                        {pPdfUrl && (
                          <a
                            href={pPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-full bg-samasa-black text-samasa-yellow text-[10px] font-black uppercase tracking-widest hover:bg-samasa-blue hover:text-white transition-all"
                          >
                            Preview
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        No PDF attached.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Title */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Title
                    </label>
                    <input
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      placeholder="Enter project title..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Timeline */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Timeline
                      </label>
                      <input
                        value={prTimeline}
                        onChange={(e) => setPrTimeline(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                        placeholder="e.g. Feb–Jun 2026"
                        required
                      />
                    </div>

                    {/* In charge */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        In Charge
                      </label>
                      <input
                        value={prInCharge}
                        onChange={(e) => setPrInCharge(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                        placeholder="Name/Office"
                        required
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Status
                      </label>
                      <select
                        value={String(prStatus)}
                        onChange={(e) => setPrStatus(e.target.value as any)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      >
                        <option value={ProjectStatus.PLANNED}>PLANNED</option>
                        <option value={ProjectStatus.ONGOING}>ONGOING</option>
                        <option value={ProjectStatus.COMPLETED}>COMPLETED</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Description
                    </label>
                    <textarea
                      value={prDesc}
                      onChange={(e) => setPrDesc(e.target.value)}
                      className="w-full min-h-[140px] px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      placeholder="Describe the project..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Budget */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Budget Allocated
                      </label>
                      <input
                        value={String(prBudget)}
                        onChange={(e) => setPrBudget(safeNum(e.target.value))}
                        type="number"
                        min={0}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                        placeholder="0"
                      />
                    </div>

                    {/* Spent */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Spent Amount
                      </label>
                      <input
                        value={String(prSpent)}
                        onChange={(e) => setPrSpent(safeNum(e.target.value))}
                        type="number"
                        min={0}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                        placeholder="0"
                      />
                    </div>

                    {/* Objectives */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Objectives (comma-separated)
                      </label>
                      <input
                        value={prObjectives}
                        onChange={(e) => setPrObjectives(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                        placeholder="e.g. Awareness, Training, Outreach"
                      />
                    </div>
                  </div>

                  {/* Banner */}
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <ImageIcon className="w-5 h-5 text-samasa-red" />
                        <div>
                          <div className="text-sm font-black text-samasa-black">
                            Banner Image (optional)
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            JPG/PNG/WEBP/GIF
                          </div>
                        </div>
                      </div>

                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onBannerPick(e.target.files?.[0] || null)}
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => bannerInputRef.current?.click()}
                          className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Choose
                          </span>
                        </button>

                        {prBannerUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              revokeIfBlob(lastBannerObjectUrlRef.current || undefined);
                              lastBannerObjectUrlRef.current = null;
                              setPrBannerUrl("");
                              setPrBannerFile(null);
                              if (bannerInputRef.current) bannerInputRef.current.value = "";
                            }}
                            className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-samasa-red transition-all"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {prBannerUrl ? (
                      <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                        <img
                          src={prBannerUrl}
                          alt="Selected banner"
                          className="w-full h-56 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        No banner selected.
                      </div>
                    )}
                  </div>

                  {/* Project PDF */}
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-samasa-blue" />
                        <div>
                          <div className="text-sm font-black text-samasa-black">
                            Attach PDF (optional)
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Upload a PDF document
                          </div>
                        </div>
                      </div>

                      <input
                        ref={projectPdfInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => onProjectPdfPick(e.target.files?.[0] || null)}
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => projectPdfInputRef.current?.click()}
                          className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Choose
                          </span>
                        </button>

                        {(prPdfUrl || prPdfName) && (
                          <button
                            type="button"
                            onClick={removeProjectPdf}
                            className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-samasa-red transition-all"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {(prPdfUrl || prPdfName) ? (
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-3 text-slate-600">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-bold truncate max-w-[60vw] sm:max-w-[420px]">
                            {prPdfName || "Selected PDF"}
                          </span>
                        </div>

                        {prPdfUrl && (
                          <a
                            href={prPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-full bg-samasa-black text-samasa-yellow text-[10px] font-black uppercase tracking-widest hover:bg-samasa-blue hover:text-white transition-all"
                          >
                            Preview
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        No PDF attached.
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreate}
                  className="px-8 py-3 rounded-full bg-white border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCreate}
                  className="px-10 py-3 rounded-full bg-samasa-black text-samasa-yellow font-black text-[10px] uppercase tracking-widest hover:bg-samasa-blue hover:text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingCreate ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================
          PROPOSAL MODAL
      ============================== */}
      {selectedProposal && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeProposalModal();
          }}
        >
          <div className="w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getProposalStatusStyle(
                      (selectedProposal as any).status
                    )}`}
                  >
                    {(selectedProposal as any).status}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    {(selectedProposal as any).dateSubmitted || "—"}
                  </span>
                </div>

                <div className="text-2xl font-black text-samasa-black truncate">
                  {proposalEditMode ? ppTitle : (selectedProposal as any).title}
                </div>

                <div className="mt-2 flex items-center gap-3 text-slate-500">
                  <UserCircle className="w-4 h-4" />
                  <span className="text-xs font-bold truncate">
                    {proposalEditMode
                      ? ppProponent
                      : (selectedProposal as any).proponent || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManage && !proposalEditMode && (
                  <button
                    onClick={() => setProposalEditMode(true)}
                    className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      Edit
                    </span>
                  </button>
                )}

                {canManage && proposalEditMode && (
                  <button
                    onClick={cancelProposalEdits}
                    className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    <span className="inline-flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Cancel
                    </span>
                  </button>
                )}

                {canManage && proposalEditMode && (
                  <button
                    onClick={saveProposalEdits}
                    disabled={savingProposalEdit}
                    className="px-4 py-2 rounded-full bg-samasa-black text-samasa-yellow text-[10px] font-black uppercase tracking-widest hover:bg-samasa-blue hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {savingProposalEdit ? "Saving..." : "Save"}
                    </span>
                  </button>
                )}

                <button
                  onClick={closeProposalModal}
                  className="p-3 rounded-full bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-700 hover:bg-white transition-all"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-10 py-8 space-y-8">
              {proposalEditMode ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Title
                    </label>
                    <input
                      value={ppTitle}
                      onChange={(e) => setPpTitle(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Category
                      </label>
                      <select
                        value={String(ppCategory)}
                        onChange={(e) => setPpCategory(e.target.value as any)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      >
                        <option value={ProposalCategory.RESOURCES}>RESOURCES</option>
                        <option value={ProposalCategory.PROGRAMS}>PROGRAMS</option>
                        <option value={ProposalCategory.POLICY}>POLICY</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Status
                      </label>
                      <select
                        value={ppStatus}
                        onChange={(e) => setPpStatus(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      >
                        <option value="REVIEW">REVIEW</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="IMPLEMENTED">IMPLEMENTED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Proponent
                    </label>
                    <input
                      value={ppProponent}
                      onChange={(e) => setPpProponent(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Narrative / Description
                    </label>
                    <textarea
                      value={ppNarrative}
                      onChange={(e) => setPpNarrative(e.target.value)}
                      className="w-full min-h-[180px] px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                    />
                  </div>

                  {/* Edit PDF */}
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-samasa-blue" />
                        <div>
                          <div className="text-sm font-black text-samasa-black">
                            Attached PDF
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Replace or remove
                          </div>
                        </div>
                      </div>

                      <input
                        ref={proposalModalPdfRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) =>
                          onProposalModalPdfPick(e.target.files?.[0] || null)
                        }
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => proposalModalPdfRef.current?.click()}
                          className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Replace
                          </span>
                        </button>

                        {(ppPdfUrl || ppPdfName) && (
                          <button
                            type="button"
                            onClick={removeProposalModalPdf}
                            className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-samasa-red transition-all"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {(ppPdfUrl || ppPdfName) ? (
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-3 text-slate-600">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-bold truncate max-w-[60vw] sm:max-w-[420px]">
                            {ppPdfName || "PDF attached"}
                          </span>
                        </div>

                        {ppPdfUrl && (
                          <a
                            href={ppPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-full bg-samasa-black text-samasa-yellow text-[10px] font-black uppercase tracking-widest hover:bg-samasa-blue hover:text-white transition-all"
                          >
                            Preview
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        No PDF attached.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 p-6 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Category
                      </div>
                      <div className="px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        {(selectedProposal as any).category}
                      </div>
                    </div>

                    <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                      {(selectedProposal as any).description}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-samasa-blue" />
                        <div>
                          <div className="text-sm font-black text-samasa-black">
                            Document
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            PDF attachment (if any)
                          </div>
                        </div>
                      </div>

                      {(selectedProposal as any).pdfUrl ? (
                        <a
                          href={(selectedProposal as any).pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-2.5 rounded-full bg-samasa-black text-samasa-yellow text-[10px] font-black uppercase tracking-widest hover:bg-samasa-blue hover:text-white transition-all"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Open PDF
                          </span>
                        </a>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                          None
                        </span>
                      )}
                    </div>

                    {(selectedProposal as any).pdfName && (
                      <div className="mt-4 text-xs font-bold text-slate-500 truncate">
                        {(selectedProposal as any).pdfName}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==============================
          PROJECT MODAL
      ============================== */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeProjectModal();
          }}
        >
          <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span
                    className={[
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center",
                      getProjectStatusColor((selectedProject as any).status),
                    ].join(" ")}
                  >
                    {getProjectStatusIcon((selectedProject as any).status)}
                    {(selectedProject as any).status}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    {(selectedProject as any).timeline || "—"}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    {(selectedProject as any).inCharge || "—"}
                  </span>
                </div>

                <div className="text-2xl font-black text-samasa-black truncate">
                  {projectEditMode ? epTitle : (selectedProject as any).title}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManage && !projectEditMode && (
                  <button
                    onClick={() => setProjectEditMode(true)}
                    className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      Edit
                    </span>
                  </button>
                )}

                {canManage && projectEditMode && (
                  <button
                    onClick={cancelProjectEdits}
                    className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    <span className="inline-flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Cancel
                    </span>
                  </button>
                )}

                {canManage && projectEditMode && (
                  <button
                    onClick={saveProjectEdits}
                    disabled={savingProjectEdit}
                    className="px-4 py-2 rounded-full bg-samasa-black text-samasa-yellow text-[10px] font-black uppercase tracking-widest hover:bg-samasa-blue hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {savingProjectEdit ? "Saving..." : "Save"}
                    </span>
                  </button>
                )}

                <button
                  onClick={closeProjectModal}
                  className="p-3 rounded-full bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-700 hover:bg-white transition-all"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-10 py-8 space-y-8">
              {/* Banner */}
              <div className="rounded-[2rem] overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={
                    projectEditMode
                      ? epBannerUrl || DEFAULT_PROJECT_BANNER
                      : (selectedProject as any).bannerImage || DEFAULT_PROJECT_BANNER
                  }
                  alt="Project banner"
                  className="w-full h-64 object-cover"
                />
              </div>

              {projectEditMode ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Title
                      </label>
                      <input
                        value={epTitle}
                        onChange={(e) => setEpTitle(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Timeline
                      </label>
                      <input
                        value={epTimeline}
                        onChange={(e) => setEpTimeline(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        In Charge
                      </label>
                      <input
                        value={epInCharge}
                        onChange={(e) => setEpInCharge(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Status
                      </label>
                      <select
                        value={String(epStatus)}
                        onChange={(e) => setEpStatus(e.target.value as any)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      >
                        <option value={ProjectStatus.PLANNED}>PLANNED</option>
                        <option value={ProjectStatus.ONGOING}>ONGOING</option>
                        <option value={ProjectStatus.COMPLETED}>COMPLETED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Budget Allocated
                      </label>
                      <input
                        value={String(epBudget)}
                        onChange={(e) => setEpBudget(safeNum(e.target.value))}
                        type="number"
                        min={0}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Spent Amount
                      </label>
                      <input
                        value={String(epSpent)}
                        onChange={(e) => setEpSpent(safeNum(e.target.value))}
                        type="number"
                        min={0}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Objectives (comma-separated)
                    </label>
                    <input
                      value={epObjectives}
                      onChange={(e) => setEpObjectives(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                      placeholder="e.g. Awareness, Training, Outreach"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Description
                    </label>
                    <textarea
                      value={epDesc}
                      onChange={(e) => setEpDesc(e.target.value)}
                      className="w-full min-h-[180px] px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30 font-medium"
                    />
                  </div>

                  {/* Banner controls */}
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <ImageIcon className="w-5 h-5 text-samasa-red" />
                        <div>
                          <div className="text-sm font-black text-samasa-black">
                            Banner Image
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Replace or remove
                          </div>
                        </div>
                      </div>

                      <input
                        ref={projectModalBannerRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          onProjectModalBannerPick(e.target.files?.[0] || null)
                        }
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => projectModalBannerRef.current?.click()}
                          className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Replace
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={removeProjectModalBanner}
                          className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-samasa-red transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PDF controls */}
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-samasa-blue" />
                        <div>
                          <div className="text-sm font-black text-samasa-black">
                            Attached PDF
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Replace or remove
                          </div>
                        </div>
                      </div>

                      <input
                        ref={projectModalPdfRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => onProjectModalPdfPick(e.target.files?.[0] || null)}
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => projectModalPdfRef.current?.click()}
                          className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Replace
                          </span>
                        </button>

                        {(epPdfUrl || epPdfName) && (
                          <button
                            type="button"
                            onClick={removeProjectModalPdf}
                            className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-samasa-red transition-all"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {(epPdfUrl || epPdfName) ? (
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-3 text-slate-600">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-bold truncate max-w-[60vw] sm:max-w-[520px]">
                            {epPdfName || "PDF attached"}
                          </span>
                        </div>

                        {epPdfUrl && (
                          <a
                            href={epPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-full bg-samasa-black text-samasa-yellow text-[10px] font-black uppercase tracking-widest hover:bg-samasa-blue hover:text-white transition-all"
                          >
                            Preview
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        No PDF attached.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Summary row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-2xl border border-slate-200 p-6">
                      <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <Coins className="w-5 h-5" />
                        <div className="text-[10px] font-black uppercase tracking-widest">
                          Budget
                        </div>
                      </div>
                      <div className="text-2xl font-black text-samasa-black">
                        ₱{safeNum((selectedProject as any).budgetAllocated).toLocaleString()}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-6">
                      <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <Coins className="w-5 h-5" />
                        <div className="text-[10px] font-black uppercase tracking-widest">
                          Spent
                        </div>
                      </div>
                      <div className="text-2xl font-black text-samasa-black">
                        ₱{safeNum((selectedProject as any).spentAmount).toLocaleString()}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-6">
                      <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <Target className="w-5 h-5" />
                        <div className="text-[10px] font-black uppercase tracking-widest">
                          Utilization
                        </div>
                      </div>
                      <div className="text-2xl font-black text-samasa-black">
                        {Math.round(
                          safePercent(
                            safeNum((selectedProject as any).spentAmount),
                            safeNum((selectedProject as any).budgetAllocated)
                          )
                        )}
                        %
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      <span>Fund Utilization</span>
                      <span className="text-samasa-blue">
                        {Math.round(
                          safePercent(
                            safeNum((selectedProject as any).spentAmount),
                            safeNum((selectedProject as any).budgetAllocated)
                          )
                        )}
                        %
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-samasa-blue rounded-full transition-all duration-700"
                        style={{
                          width: `${safePercent(
                            safeNum((selectedProject as any).spentAmount),
                            safeNum((selectedProject as any).budgetAllocated)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Description
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                      {(selectedProject as any).description}
                    </p>
                  </div>

                  {/* Objectives */}
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Objectives
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {((selectedProject as any).objectives || []).length ? (
                        (selectedProject as any).objectives.map((obj: string, i: number) => (
                          <span
                            key={i}
                            className="px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest"
                          >
                            {obj}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                          None
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PDF */}
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-samasa-blue" />
                        <div>
                          <div className="text-sm font-black text-samasa-black">
                            Document
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            PDF attachment (if any)
                          </div>
                        </div>
                      </div>

                      {(selectedProject as any).pdfUrl ? (
                        <a
                          href={(selectedProject as any).pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-2.5 rounded-full bg-samasa-black text-samasa-yellow text-[10px] font-black uppercase tracking-widest hover:bg-samasa-blue hover:text-white transition-all"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Open PDF
                          </span>
                        </a>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                          None
                        </span>
                      )}
                    </div>

                    {(selectedProject as any).pdfName && (
                      <div className="mt-4 text-xs font-bold text-slate-500 truncate">
                        {(selectedProject as any).pdfName}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegislativeHub;
