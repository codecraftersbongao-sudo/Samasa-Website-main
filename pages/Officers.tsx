// src/pages/Officers.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Officer,
  OfficerDivision,
  User,
  UserRole,
  Department,
  DepartmentType,
  UserAccount,
  DepartmentId,
} from "../types";
import {
  ArrowLeft,
  Star,
  Hexagon,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  RotateCcw,
  Image as ImageIcon,
  ChevronDown,
  SlidersHorizontal,
  Settings,
  Users,
  KeyRound,
  Mail,
  Lock,
  Link2,
} from "lucide-react";

import { auth, db } from "../firebase/firebaseConfig";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { initializeApp, getApps } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";

interface OfficersProps {
  currentUser?: User | null;
}

const SECONDARY_APP_NAME = "samasa-secondary";

const Officers: React.FC<OfficersProps> = ({ currentUser }) => {
  const isSuperAdmin = currentUser?.role === UserRole.SUPERADMIN;
  const isPublic = !isSuperAdmin;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);

  const activeDepartments = useMemo(() => {
    return departments
      .filter((d) => String(d.id) !== String(DepartmentType.SAMASA) && d.active)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [departments]);

  const [selectedDeptId, setSelectedDeptId] = useState<string>(String(DepartmentType.MSA));
  const didInitSelectedDept = useRef(false);

  // Officer editor modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Officer | null>(null);

  const [form, setForm] = useState<Officer>({
    id: "",
    name: "",
    position: "",
    department: DepartmentType.SAMASA,
    division: OfficerDivision.EXECUTIVE,
    photoUrl: "",
    order: 0,
  });

  // Department manager modal
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptDraft, setDeptDraft] = useState<Department[]>([]);
  const [deptNewName, setDeptNewName] = useState("");

  // Accounts manager modal
  const [acctModalOpen, setAcctModalOpen] = useState(false);
  const [acctEditing, setAcctEditing] = useState<UserAccount | null>(null);
  const [acctForm, setAcctForm] = useState<UserAccount>({
    id: "",
    name: "",
    email: "",
    password: "",
    role: UserRole.OFFICER,
    officerId: "",
    department: DepartmentType.SAMASA,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    active: true,
  });

  const deptName = (id: any) =>
    departments.find((d) => String(d.id) === String(id))?.name || String(id);

  const sortByOrder = (a: Officer, b: Officer) => (a.order ?? 0) - (b.order ?? 0);

  const officerById = (id?: string) => officers.find((o) => o.id === id);

  const accountForOfficer = (officerId?: string) =>
    accounts.find(
      (a) => a.role === UserRole.OFFICER && String(a.officerId || "") === String(officerId || "")
    );

  // ✅ Firestore listeners (FIXED: remove orderBy("createdAt") to avoid index failures)
  useEffect(() => {
    const deptQ = query(collection(db, "departments"), orderBy("order", "asc"));
    const offQ = query(collection(db, "officers"), orderBy("order", "asc"));

    // 🔥 IMPORTANT FIX:
    // where(role == OFFICER) + orderBy(createdAt) often requires a composite index.
    // If index missing, snapshot fails and you get empty UI.
    const acctQ = query(collection(db, "users"), where("role", "==", "OFFICER"));

    const unsubDept = onSnapshot(
      deptQ,
      (snap) => {
        const rows: Department[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: String(data.id ?? d.id),
            name: String(data.name ?? ""),
            active: data.active !== false,
            order: Number.isFinite(data.order) ? Number(data.order) : 0,
            locked: String(data.id ?? d.id) === String(DepartmentType.SAMASA),
          } as Department;
        });

        // Ensure SAMASA exists in UI (locked)
        const hasSamasa = rows.some((r) => String(r.id) === String(DepartmentType.SAMASA));
        const finalRows = hasSamasa
          ? rows
          : ([
              {
                id: DepartmentType.SAMASA,
                name: "SAMASA",
                active: true,
                order: 0,
                locked: true,
              } as Department,
              ...rows,
            ] as Department[]);

        const sorted = finalRows.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setDepartments(sorted);
        setDeptDraft(sorted);
      },
      (err) => {
        console.error("departments onSnapshot error:", err);
      }
    );

    const unsubOff = onSnapshot(
      offQ,
      (snap) => {
        const rows: Officer[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: String(data.name ?? ""),
            position: String(data.position ?? ""),
            department: (data.department ?? DepartmentType.SAMASA) as any,
            division: (data.division ?? OfficerDivision.EXECUTIVE) as any,
            photoUrl: String(data.photoUrl ?? ""),
            order: Number.isFinite(data.order) ? Number(data.order) : 0,
          } as Officer;
        });

        setOfficers(rows);
      },
      (err) => {
        console.error("officers onSnapshot error:", err);
      }
    );

    const unsubAcct = onSnapshot(
      acctQ,
      (snap) => {
        const rows: UserAccount[] = snap.docs.map((d) => {
          const data = d.data() as any;

          const createdAt =
            typeof data.createdAt?.toMillis === "function"
              ? data.createdAt.toMillis()
              : Number.isFinite(Number(data.createdAt))
              ? Number(data.createdAt)
              : 0;

          const updatedAt =
            typeof data.updatedAt?.toMillis === "function"
              ? data.updatedAt.toMillis()
              : Number.isFinite(Number(data.updatedAt))
              ? Number(data.updatedAt)
              : 0;

          return {
            id: d.id,
            name: String(data.name ?? ""),
            email: String(data.email ?? ""),
            password: "", // never stored/retrieved from Firestore
            role: UserRole.OFFICER,
            officerId: String(data.officerId ?? ""),
            department: (data.department ?? DepartmentType.SAMASA) as any,
            createdAt,
            updatedAt,
            active: data.active !== false,
          } as UserAccount;
        });

        // ✅ Sort locally (instead of Firestore orderBy)
        rows.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        setAccounts(rows);
      },
      (err) => {
        console.error("users(officer accounts) onSnapshot error:", err);
      }
    );

    return () => {
      unsubDept();
      unsubOff();
      unsubAcct();
    };
  }, []);

  // init/keep selected dept valid
  useEffect(() => {
    if (!didInitSelectedDept.current) {
      const first = activeDepartments[0]?.id;
      if (first) setSelectedDeptId(String(first));
      didInitSelectedDept.current = true;
      return;
    }

    const stillActive = activeDepartments.some((d) => String(d.id) === String(selectedDeptId));
    if (!stillActive) setSelectedDeptId(String(activeDepartments[0]?.id || DepartmentType.MSA));
  }, [activeDepartments, selectedDeptId]);

  // Highlight detection
  const findExecutiveHighlights = (list: Officer[]) => {
    const by = (re: RegExp) => list.find((o) => re.test((o.position || "").toLowerCase()));

    const governor = by(/\b(governor|mayor)\b/) || by(/\bpresident\b/);
    const vice = by(/\bvice\s*(governor|mayor)\b/) || by(/\bvice\s*president\b/);
    const secretary =
      by(/\b(secretary\s*general|general\s*secretary)\b/) || by(/\bsecretary\b/);
    const auditor = by(/\bauditor\b/);

    return { governor, vice, secretary, auditor };
  };

  const groupByDivision = (list: Officer[]) => {
    const exec = list
      .filter((o) => o.division === OfficerDivision.EXECUTIVE)
      .slice()
      .sort(sortByOrder);
    const under = list
      .filter((o) => o.division === OfficerDivision.UNDERSECRETARIES)
      .slice()
      .sort(sortByOrder);
    const legis = list
      .filter((o) => o.division === OfficerDivision.LEGISLATIVE)
      .slice()
      .sort(sortByOrder);
    const advisers = list
      .filter((o) => o.division === OfficerDivision.ADVISERS)
      .slice()
      .sort(sortByOrder);
    return { exec, under, legis, advisers };
  };

  // Data: SAMASA
  const samasaAll = useMemo(
    () =>
      officers
        .filter((o) => String(o.department) === String(DepartmentType.SAMASA))
        .slice()
        .sort(sortByOrder),
    [officers]
  );

  const samasaGrouped = useMemo(() => groupByDivision(samasaAll), [samasaAll]);
  const samasaHighlights = useMemo(() => findExecutiveHighlights(samasaGrouped.exec), [samasaGrouped.exec]);

  const samasaHighlightIds = new Set(
    [
      samasaHighlights.governor?.id,
      samasaHighlights.vice?.id,
      samasaHighlights.secretary?.id,
      samasaHighlights.auditor?.id,
    ].filter(Boolean) as string[]
  );

  const samasaExecRest = samasaGrouped.exec.filter((o) => !samasaHighlightIds.has(o.id));
  const samasaUnder = samasaGrouped.under;
  const samasaLegis = samasaGrouped.legis;
  const samasaAdvisers = samasaGrouped.advisers;

  // Data: Selected Department
  const deptAll = useMemo(
    () =>
      officers
        .filter((o) => String(o.department) === String(selectedDeptId))
        .slice()
        .sort(sortByOrder),
    [officers, selectedDeptId]
  );

  const deptGrouped = useMemo(() => groupByDivision(deptAll), [deptAll]);
  const deptHighlights = useMemo(() => findExecutiveHighlights(deptGrouped.exec), [deptGrouped.exec]);

  const deptHighlightIds = new Set(
    [
      deptHighlights.governor?.id,
      deptHighlights.vice?.id,
      deptHighlights.secretary?.id,
      deptHighlights.auditor?.id,
    ].filter(Boolean) as string[]
  );

  const deptExecRest = deptGrouped.exec.filter((o) => !deptHighlightIds.has(o.id));
  const deptUnder = deptGrouped.under;
  const deptLegis = deptGrouped.legis;
  const deptAdvisers = deptGrouped.advisers;

  // Upload-only photo
  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await fileToDataUrl(file);
    setForm((p) => ({ ...p, photoUrl: data }));
  };

  // Officers CRUD (Firestore)
  const openCreate = (dept?: string) => {
    if (!isSuperAdmin) return;
    setEditing(null);
    setForm({
      id: "",
      name: "",
      position: "",
      department: (dept || DepartmentType.SAMASA) as any,
      division: OfficerDivision.EXECUTIVE,
      photoUrl: "",
      order: 0,
    });
    setEditorOpen(true);
  };

  const openEdit = (o: Officer) => {
    if (!isSuperAdmin) return;
    setEditing(o);
    setForm({ ...o, photoUrl: o.photoUrl || "" });
    setEditorOpen(true);
  };

  const removeOfficer = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!confirm("Delete this officer entry?")) return;

    // If any accounts link to this officer, unlink them
    const linked = accounts.filter((a) => a.role === UserRole.OFFICER && String(a.officerId) === String(id));
    if (linked.length > 0) {
      const ok = confirm(`This officer has ${linked.length} linked account(s). Unlink them too?`);
      if (ok) {
        const batch = writeBatch(db);
        linked.forEach((a) => {
          batch.update(doc(db, "users", a.id), { officerId: "", updatedAt: serverTimestamp() });
        });
        await batch.commit();
      }
    }

    await deleteDoc(doc(db, "officers", id));
  };

  const submitOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    if (!editing && !form.photoUrl) {
      alert("Please upload a photo before saving.");
      return;
    }

    const clean: Officer = {
      ...form,
      name: form.name.trim(),
      position: form.position.trim(),
      department: (form.department || DepartmentType.SAMASA) as DepartmentId,
      division: form.division || OfficerDivision.EXECUTIVE,
      photoUrl: form.photoUrl || "",
      order: Number.isFinite(form.order) ? Number(form.order) : 0,
      id: editing?.id || form.id || "",
    };

    if (!clean.name || !clean.position) return;

    if (editing?.id) {
      await updateDoc(doc(db, "officers", editing.id), {
        name: clean.name,
        position: clean.position,
        department: clean.department,
        division: clean.division,
        photoUrl: clean.photoUrl,
        order: clean.order,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create with Firestore-generated id
      const newRef = doc(collection(db, "officers"));
      await setDoc(newRef, {
        name: clean.name,
        position: clean.position,
        department: clean.department,
        division: clean.division,
        photoUrl: clean.photoUrl,
        order: clean.order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    setEditorOpen(false);
    setEditing(null);
  };

  // Accounts CRUD (Firestore users + Firebase Auth create)
  const getSecondaryAuth = () => {
    const options = (auth as any)?.app?.options;
    if (!options) throw new Error("Firebase app options not found. Ensure auth is initialized from firebaseConfig.");

    const existing = getApps().find((a) => a.name === SECONDARY_APP_NAME);
    const secondaryApp = existing ?? initializeApp(options, SECONDARY_APP_NAME);
    return getAuth(secondaryApp);
  };

  const openAccountsManager = () => {
    if (!isSuperAdmin) return;
    setAcctEditing(null);
    setAcctForm({
      id: "",
      name: "",
      email: "",
      password: "",
      role: UserRole.OFFICER,
      officerId: "",
      department: selectedDeptId as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      active: true,
    });
    setAcctModalOpen(true);
  };

  const openCreateAccount = () => {
    setAcctEditing(null);
    setAcctForm({
      id: "",
      name: "",
      email: "",
      password: "",
      role: UserRole.OFFICER,
      officerId: "",
      department: selectedDeptId as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      active: true,
    });
  };

  const openEditAccount = (a: UserAccount) => {
    setAcctEditing(a);
    setAcctForm({ ...a, password: "", updatedAt: Date.now() });
  };

  const deleteAccount = async (id: string) => {
    if (!confirm("Delete this officer account?")) return;
    await deleteDoc(doc(db, "users", id));
    alert("Account profile deleted. If you also need to delete the Auth login, do it via Admin SDK / Firebase Console.");
  };

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    const emailNorm = acctForm.email.trim().toLowerCase();
    if (!emailNorm) return alert("Email is required.");
    if (!acctForm.name.trim()) return alert("Name is required.");
    if (!acctEditing && !acctForm.password) return alert("Password is required.");

    // Email uniqueness check (Firestore)
    const qEmail = query(collection(db, "users"), where("email", "==", emailNorm));
    const snapEmail = await getDocs(qEmail);
    const clash = snapEmail.docs.find((d) => d.id !== acctForm.id);
    if (clash) return alert("Email already exists. Use another email.");

    if (acctForm.officerId) {
      const qOfficer = query(
        collection(db, "users"),
        where("role", "==", "OFFICER"),
        where("officerId", "==", String(acctForm.officerId))
      );
      const snapOfficer = await getDocs(qOfficer);
      const officerClash = snapOfficer.docs.find((d) => d.id !== acctForm.id);
      if (officerClash) return alert("That Officer card is already linked to another account.");
    }

    if (acctEditing) {
      await updateDoc(doc(db, "users", acctEditing.id), {
        name: acctForm.name.trim(),
        email: emailNorm,
        role: "OFFICER",
        officerId: acctForm.officerId ? String(acctForm.officerId) : "",
        department: acctForm.department as any,
        active: acctForm.active !== false,
        updatedAt: serverTimestamp(),
      });

      if (acctForm.password) {
        alert("Password changes for other users require Admin SDK. This form updated profile only.");
      }

      openCreateAccount();
      return;
    }

    try {
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, emailNorm, acctForm.password);
      const uid = cred.user.uid;

      await setDoc(doc(db, "users", uid), {
        name: acctForm.name.trim(),
        email: emailNorm,
        role: "OFFICER",
        officerId: acctForm.officerId ? String(acctForm.officerId) : "",
        department: acctForm.department as any,
        active: acctForm.active !== false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await signOut(secondaryAuth);
      openCreateAccount();
    } catch (err: any) {
      const code = String(err?.code || "");
      if (code === "auth/email-already-in-use") alert("That email is already registered in Firebase Auth.");
      else if (code === "auth/invalid-email") alert("Invalid email.");
      else if (code === "auth/weak-password") alert("Weak password. Use a stronger password (6+ characters).");
      else alert(err?.message || "Failed to create account.");
    }
  };

  const onLinkOfficer = (officerId: string) => {
    const o = officerById(officerId);
    setAcctForm((p) => ({
      ...p,
      officerId,
      name: o?.name ?? p.name,
      department: (o?.department ?? p.department) as any,
    }));
  };

  // Department manager (Firestore)
  const openDeptManager = () => {
    if (!isSuperAdmin) return;
    setDeptDraft(departments);
    setDeptNewName("");
    setDeptModalOpen(true);
  };

  const deleteDepartment = (deptId: string) => {
    if (!isSuperAdmin) return;
    if (String(deptId) === String(DepartmentType.SAMASA)) return;

    if (!confirm(`Delete department "${deptName(deptId)}"? Officers under it will be moved to SAMASA.`)) return;

    setDeptDraft((p) => p.filter((d) => String(d.id) !== String(deptId)));

    (async () => {
      const toMoveOfficers = officers.filter((o) => String(o.department) === String(deptId));
      const toMoveAccounts = accounts.filter((a) => String(a.department) === String(deptId));

      const batch = writeBatch(db);

      toMoveOfficers.forEach((o) => {
        batch.update(doc(db, "officers", o.id), { department: DepartmentType.SAMASA, updatedAt: serverTimestamp() });
      });

      toMoveAccounts.forEach((a) => {
        batch.update(doc(db, "users", a.id), { department: DepartmentType.SAMASA, updatedAt: serverTimestamp() });
      });

      await batch.commit();
    })();
  };

  const saveDeptManager = async () => {
    if (!isSuperAdmin) return;

    const locked = deptDraft.map((d) =>
      String(d.id) === String(DepartmentType.SAMASA)
        ? { ...d, id: DepartmentType.SAMASA, name: "SAMASA", active: true, order: 0, locked: true }
        : { ...d, locked: false }
    );

    const hasSamasa = locked.some((d) => String(d.id) === String(DepartmentType.SAMASA));
    const final = hasSamasa
      ? locked
      : [{ id: DepartmentType.SAMASA, name: "SAMASA", active: true, order: 0, locked: true } as Department, ...locked];

    const sorted = final.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const existingSnap = await getDocs(collection(db, "departments"));
    const existingIds = new Set(existingSnap.docs.map((d) => String((d.data() as any)?.id ?? d.id)));
    const nextIds = new Set(sorted.map((d) => String(d.id)));

    const batch = writeBatch(db);

    sorted.forEach((d) => {
      const id = String(d.id);
      const ref = doc(db, "departments", id);
      batch.set(
        ref,
        {
          id,
          name: d.name,
          active: d.active !== false,
          order: Number.isFinite(d.order) ? Number(d.order) : 0,
          locked: String(id) === String(DepartmentType.SAMASA),
          updatedAt: serverTimestamp(),
          ...(existingIds.has(id) ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );
    });

    existingIds.forEach((id) => {
      if (String(id) === String(DepartmentType.SAMASA)) return;
      if (!nextIds.has(id)) batch.delete(doc(db, "departments", id));
    });

    await batch.commit();

    const stillActive = sorted
      .filter((d) => String(d.id) !== String(DepartmentType.SAMASA) && d.active)
      .some((d) => String(d.id) === String(selectedDeptId));

    if (!stillActive) {
      const first = sorted
        .filter((d) => String(d.id) !== String(DepartmentType.SAMASA) && d.active)
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]?.id;
      setSelectedDeptId(String(first || DepartmentType.MSA));
    }

    setDeptModalOpen(false);
  };

  const addDepartment = () => {
    if (!isSuperAdmin) return;
    const name = deptNewName.trim();
    if (!name) return;

    const nextId =
      name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 30) || Math.random().toString(36).slice(2, 10).toUpperCase();

    const exists = deptDraft.some((d) => String(d.id) === String(nextId));
    const id = exists ? `${nextId}_${Math.random().toString(36).slice(2, 6).toUpperCase()}` : nextId;

    const maxOrder = deptDraft.reduce((m, d) => Math.max(m, Number(d.order ?? 0)), 0);

    setDeptDraft((p) => [
      ...p,
      { id, name, active: true, order: maxOrder + 1, locked: false } as Department,
    ]);

    setDeptNewName("");
  };

  const resetDeptDraft = () => {
    if (!isSuperAdmin) return;
    if (!confirm("Reset departments to default?")) return;

    const base: Department[] = [
      { id: DepartmentType.SAMASA, name: "SAMASA", active: true, order: 0, locked: true } as Department,
      { id: DepartmentType.MSA, name: "MSA", active: true, order: 1, locked: false } as Department,
    ];

    setDeptDraft(base);
  };

  // UI helpers
  const sectionHeader = (title: string, count: number) => (
    <div className="flex items-center justify-between mb-6 mt-14">
      <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{title}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{count} listed</div>
    </div>
  );

  const renderOfficerCard = (o: Officer, variant: "dark" | "light" = "light", size: "md" | "xl" | "spot" = "md") => {
    const hasPhoto = !!o.photoUrl;
    const hasAccount = !!accountForOfficer(o.id);

    const card =
      variant === "dark" ? "bg-samasa-black text-white border-white/10" : "bg-white text-samasa-black border-slate-200";

    const topBar = variant === "dark" ? "bg-samasa-yellow" : "bg-samasa-blue";

    const pad = size === "spot" ? "p-12 sm:p-14" : size === "xl" ? "p-10 sm:p-12" : "p-6 sm:p-8";

    const imgSize =
      size === "spot"
        ? "w-36 h-36 sm:w-40 sm:h-40"
        : size === "xl"
        ? "w-32 h-32 sm:w-36 sm:h-36"
        : "w-24 h-24 sm:w-28 sm:h-28";

    const nameSize =
      size === "spot" ? "text-4xl sm:text-5xl" : size === "xl" ? "text-3xl sm:text-4xl" : "text-2xl";

    const tagPad = size === "spot" ? "px-6 py-3" : size === "xl" ? "px-5 py-3" : "px-4 py-2";

    const safeTopPad = hasAccount ? (size === "spot" ? "pt-16" : size === "xl" ? "pt-14" : "pt-12") : "";

    const badgeBase =
      variant === "dark" ? "bg-white/10 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-700";

    return (
      <div
        className={`group relative overflow-hidden border rounded-[2.8rem] ${pad} ${safeTopPad} transition-all hover:-translate-y-1 hover:shadow-2xl ${card}`}
      >
        <div className={`absolute top-0 left-0 w-full h-2 ${topBar}`} />

        {hasAccount && (
          <div className="absolute top-5 left-6">
            <div
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border ${badgeBase} text-[10px] font-black uppercase tracking-[0.25em]`}
              title="Linked officer account"
            >
              <KeyRound className="w-4 h-4" />
              Account
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => openEdit(o)}
              className={`p-2.5 rounded-2xl border transition-all ${
                variant === "dark"
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100"
              }`}
              title="Edit"
              aria-label="Edit officer"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => removeOfficer(o.id)}
              className={`p-2.5 rounded-2xl border transition-all ${
                variant === "dark"
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100"
              }`}
              title="Delete"
              aria-label="Delete officer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-7">
            <div
              className={`${imgSize} rounded-[2.2rem] overflow-hidden border ${
                variant === "dark" ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
              } flex items-center justify-center`}
            >
              {hasPhoto ? (
                <img src={o.photoUrl} alt={o.name} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-10 h-10 rounded-2xl ${variant === "dark" ? "bg-white/10" : "bg-slate-200"}`} />
              )}
            </div>

            <div
              className={`mt-6 inline-flex ${tagPad} rounded-full text-[10px] font-black uppercase tracking-[0.25em] ${
                variant === "dark" ? "bg-samasa-yellow text-samasa-black" : "bg-samasa-blue text-white"
              }`}
            >
              {o.position}
            </div>
          </div>

          <div className={`${nameSize} font-black tracking-tighter uppercase leading-tight`}>{o.name}</div>

          <div
            className={`mt-3 text-[10px] font-black uppercase tracking-[0.3em] ${
              variant === "dark" ? "text-white/60" : "text-slate-500"
            }`}
          >
            {String(o.department) === String(DepartmentType.SAMASA) ? "Central Board" : `${deptName(o.department)} Council`}
          </div>
        </div>
      </div>
    );
  };

  const executiveGrid = (
    variant: "dark" | "light",
    highlights: { governor?: Officer; vice?: Officer; secretary?: Officer; auditor?: Officer },
    rest: Officer[]
  ) => {
    const boxBase =
      variant === "dark"
        ? "bg-samasa-black text-white border-white/10"
        : "bg-white border-slate-200 text-slate-600";

    const placeholder = (label: string) => (
      <div className={`rounded-[2.8rem] border p-12 sm:p-14 ${boxBase}`}>
        <div className="text-[10px] font-black uppercase tracking-[0.35em] opacity-60">{label}</div>
        <div className="mt-4 text-2xl font-black tracking-tighter">Not set</div>
      </div>
    );

    return (
      <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {highlights.governor ? renderOfficerCard(highlights.governor, variant, "spot") : placeholder("Governor / Mayor")}
          {highlights.vice ? renderOfficerCard(highlights.vice, variant, "spot") : placeholder("Vice Governor / Vice Mayor")}
          {highlights.secretary ? renderOfficerCard(highlights.secretary, variant, "spot") : placeholder("Secretary General / Secretary")}
          {highlights.auditor ? renderOfficerCard(highlights.auditor, variant, "spot") : placeholder("Auditor")}
        </div>

        {rest.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((o) => (
              <div key={o.id}>{renderOfficerCard(o, variant === "dark" ? "dark" : "light")}</div>
            ))}
          </div>
        ) : (
          !isPublic && (
            <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-200 text-slate-500 font-semibold">
              No other executive officers listed.
            </div>
          )
        )}
      </div>
    );
  };

  const renderSectionGrid = (
    title: string,
    list: Officer[],
    cols: string,
    cardVariant: "dark" | "light" = "light",
    emptyText: string
  ) => {
    if (list.length === 0) {
      if (isPublic) return null;
      return (
        <>
          {sectionHeader(title, 0)}
          <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-200 text-slate-500 font-semibold">
            {emptyText}
          </div>
        </>
      );
    }

    return (
      <>
        {sectionHeader(title, list.length)}
        <div className={cols}>
          {list.map((o) => (
            <div key={o.id}>{renderOfficerCard(o, cardVariant)}</div>
          ))}
        </div>
      </>
    );
  };

  const officerChoices = useMemo(() => {
    return officers
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .map((o) => ({
        id: o.id,
        label: `${o.name} — ${o.position} (${String(o.department) === String(DepartmentType.SAMASA) ? "SAMASA" : deptName(o.department)})`,
      }));
  }, [officers, departments]);

  const officerAccounts = useMemo(
    () =>
      accounts
        .filter((a) => a.role === UserRole.OFFICER)
        .slice()
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
    [accounts]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto pb-28 px-6">
        <div className="pt-10 mb-8 flex items-start justify-between gap-6 flex-wrap">
          <div className="h-14 flex items-center">
            {!isSuperAdmin && (
              <Link to="/" className="group inline-flex items-center gap-3 text-slate-500 hover:text-samasa-black transition-all">
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center group-hover:bg-samasa-black group-hover:text-white transition-all shadow-sm">
                  <ArrowLeft size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em]">Exit to Portal</span>
              </Link>
            )}
          </div>

          {isSuperAdmin && (
            <div className="w-full lg:w-auto">
              <div className="bg-white border border-slate-200 rounded-[2rem] p-4 sm:p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-3 px-2">Superadmin Controls</div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => openCreate(String(selectedDeptId))}
                    className="inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-samasa-black text-white font-black text-[10px] uppercase tracking-[0.25em] hover:bg-samasa-blue transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>

                  <button
                    onClick={openDeptManager}
                    className="inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-[10px] uppercase tracking-[0.25em] hover:bg-slate-50 transition-all active:scale-95"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-samasa-blue" />
                    Manage Departments
                  </button>

                  <button
                    onClick={openAccountsManager}
                    className="inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-[10px] uppercase tracking-[0.25em] hover:bg-slate-50 transition-all active:scale-95"
                  >
                    <Users className="w-4 h-4 text-samasa-blue" />
                    Manage Officer Accounts
                  </button>
                </div>

                <div className="mt-4 text-xs font-semibold text-slate-400 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Add button uses current selected department. Select SAMASA by using “SAMASA” option in the officer form.
                </div>
              </div>
            </div>
          )}
        </div>

        <section className="mb-24">
          <div className="rounded-[3rem] overflow-hidden border border-slate-200 bg-white">
            <div className="p-10 sm:p-14 bg-samasa-black text-white relative">
              <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-3 px-5 py-3 bg-white/10 border border-white/10 rounded-2xl">
                  <Star className="w-5 h-5 text-white" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Central Directory</span>
                </div>

                <div className="mt-10">
                  <div className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-[0.9]">SAMASA</div>
                  <div className="mt-3 inline-flex bg-samasa-yellow text-samasa-black px-5 py-3 rounded-2xl font-black italic tracking-tight">
                    CENTRAL BOARD
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 sm:p-14">
              {sectionHeader("Executive", samasaGrouped.exec.length)}
              {executiveGrid("dark", samasaHighlights, samasaExecRest)}

              {renderSectionGrid(
                "Undersecretaries",
                samasaUnder,
                "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
                "light",
                "No undersecretaries listed."
              )}

              {renderSectionGrid(
                "Legislative",
                samasaLegis,
                "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6",
                "light",
                "No legislative members listed."
              )}

              {renderSectionGrid(
                "Advisers",
                samasaAdvisers,
                "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
                "light",
                "No advisers listed."
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-col lg:flex-row justify-between items-end gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 text-samasa-blue mb-4">
                <Star className="w-5 h-5" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">Local Councils</span>
              </div>
              <h2 className="text-5xl sm:text-6xl font-black text-samasa-black tracking-tighter leading-none">
                DEPARTMENT <br />
                <span className="text-samasa-blue">DIRECTORY.</span>
              </h2>
            </div>

            <div className="w-full lg:w-auto">
              <div className="relative">
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full lg:w-96 appearance-none px-6 py-5 rounded-2xl bg-white border border-slate-200 font-black text-[10px] uppercase tracking-[0.25em] text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                >
                  {activeDepartments.map((d) => (
                    <option key={String(d.id)} value={String(d.id)}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 sm:p-14 border border-slate-200">
            <div className="flex items-center gap-3 mb-8 text-slate-400">
              <Hexagon className="w-4 h-4 text-samasa-blue" />
              <div className="text-[10px] font-black uppercase tracking-[0.35em]">{deptName(selectedDeptId)} Council</div>
            </div>

            {sectionHeader("Executive", deptGrouped.exec.length)}
            {executiveGrid("light", deptHighlights, deptExecRest)}

            {renderSectionGrid(
              "Undersecretaries",
              deptUnder,
              "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6",
              "light",
              `No undersecretaries listed for ${deptName(selectedDeptId)}.`
            )}

            {renderSectionGrid(
              "Legislative",
              deptLegis,
              "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6",
              "light",
              `No legislative members listed for ${deptName(selectedDeptId)}.`
            )}

            {renderSectionGrid(
              "Advisers",
              deptAdvisers,
              "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
              "light",
              `No advisers listed for ${deptName(selectedDeptId)}.`
            )}
          </div>
        </section>
      </div>

      {/* Officer Editor */}
      {editorOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-[100] bg-samasa-black/80 backdrop-blur-md p-4">
          <div className="mx-auto w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white rounded-[3rem] border border-white/30 shadow-2xl">
            <div className="p-8 sm:p-10 border-b border-slate-100 flex items-start justify-between gap-6 sticky top-0 bg-white z-10">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Officer Editor</div>
                <div className="mt-2 text-3xl font-black text-samasa-black tracking-tighter">
                  {editing ? "Edit Officer" : "Add Officer"}
                </div>
              </div>

              <button
                onClick={() => {
                  setEditorOpen(false);
                  setEditing(null);
                }}
                className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-samasa-black transition-all"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-96px)] overflow-y-auto p-8 sm:p-10">
              <form onSubmit={submitOfficer} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                      Name
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                      Position
                    </label>
                    <input
                      value={form.position}
                      onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                      className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                      Department
                    </label>
                    <select
                      value={String(form.department)}
                      onChange={(e) => setForm((p) => ({ ...p, department: e.target.value as any }))}
                      className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 font-black text-[10px] uppercase tracking-[0.25em] text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                    >
                      {departments
                        .slice()
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map((d) => (
                          <option key={String(d.id)} value={String(d.id)}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                      Division
                    </label>
                    <select
                      value={form.division}
                      onChange={(e) => setForm((p) => ({ ...p, division: e.target.value as OfficerDivision }))}
                      className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 font-black text-[10px] uppercase tracking-[0.25em] text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                    >
                      <option value={OfficerDivision.EXECUTIVE}>Executive</option>
                      <option value={OfficerDivision.UNDERSECRETARIES}>Undersecretaries</option>
                      <option value={OfficerDivision.LEGISLATIVE}>Legislative</option>
                      <option value={OfficerDivision.ADVISERS}>Advisers</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                      Order (optional)
                    </label>
                    <input
                      type="number"
                      value={form.order ?? 0}
                      onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
                      className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                      Photo {editing ? "(optional)" : "(required)"}
                    </label>
                    <label className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 cursor-pointer flex items-center gap-3 hover:bg-slate-50 transition-all">
                      <ImageIcon className="w-5 h-5 text-samasa-blue" />
                      <span className="text-sm font-semibold text-slate-600">{form.photoUrl ? "Change photo" : "Upload photo"}</span>
                      <input type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
                    </label>
                  </div>
                </div>

                {form.photoUrl && (
                  <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Preview
                    </div>
                    <div className="w-28 h-28 rounded-[1.75rem] overflow-hidden border border-slate-200 bg-white">
                      <img src={form.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-samasa-blue text-white font-black text-[10px] uppercase tracking-[0.25em] hover:opacity-90 transition-all active:scale-95 shadow-xl"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorOpen(false);
                      setEditing(null);
                    }}
                    className="px-6 py-5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-[0.25em] hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Department Manager */}
      {deptModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-[100] bg-samasa-black/80 backdrop-blur-md p-4">
          <div className="mx-auto w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white rounded-[3rem] border border-white/30 shadow-2xl">
            <div className="p-8 sm:p-10 border-b border-slate-100 flex items-start justify-between gap-6 sticky top-0 bg-white z-10">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Department Manager</div>
                <div className="mt-2 text-3xl font-black text-samasa-black tracking-tighter">Manage Departments</div>
              </div>

              <button
                onClick={() => setDeptModalOpen(false)}
                className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-samasa-black transition-all"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-96px)] overflow-y-auto p-8 sm:p-10 space-y-6">
              <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Add Department</div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={deptNewName}
                    onChange={(e) => setDeptNewName(e.target.value)}
                    placeholder="Department name (e.g., Social Science)"
                    className="flex-1 px-5 py-4 rounded-2xl bg-white border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                  />
                  <button
                    onClick={addDepartment}
                    disabled={!deptNewName.trim()}
                    className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-samasa-black text-white font-black text-[10px] uppercase tracking-[0.25em] hover:bg-samasa-blue transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {deptDraft
                  .slice()
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((d) => {
                    const locked = String(d.id) === String(DepartmentType.SAMASA);
                    return (
                      <div
                        key={String(d.id)}
                        className="bg-white border border-slate-200 rounded-[2rem] p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            {locked ? "Locked" : "Department"}
                          </div>
                          <div className="text-xl font-black text-samasa-black truncate">{locked ? "SAMASA" : d.name}</div>
                          <div className="mt-2 text-xs font-semibold text-slate-400">ID: {String(d.id)}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <button
                            onClick={() =>
                              setDeptDraft((prev) =>
                                prev.map((x) =>
                                  String(x.id) === String(d.id) ? { ...x, active: locked ? true : !x.active } : x
                                )
                              )
                            }
                            className={`px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] border transition-all ${
                              d.active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-200"
                            } ${locked ? "opacity-60 pointer-events-none" : ""}`}
                          >
                            {d.active ? "Active" : "Inactive"}
                          </button>

                          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-[0.25em]">
                            Order
                            <input
                              type="number"
                              value={d.order}
                              disabled={locked}
                              onChange={(e) =>
                                setDeptDraft((prev) =>
                                  prev.map((x) => (String(x.id) === String(d.id) ? { ...x, order: Number(e.target.value) } : x))
                                )
                              }
                              className="w-20 px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-[10px] uppercase tracking-[0.25em] text-slate-700 focus:outline-none"
                            />
                          </div>

                          <button
                            onClick={() => deleteDepartment(String(d.id))}
                            disabled={locked}
                            className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all disabled:opacity-50 disabled:pointer-events-none"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-samasa-red" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetDeptDraft}
                  className="inline-flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-[0.25em] hover:bg-slate-200 transition-all active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Draft
                </button>

                <button
                  onClick={saveDeptManager}
                  className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-samasa-blue text-white font-black text-[10px] uppercase tracking-[0.25em] hover:opacity-90 transition-all active:scale-95 shadow-xl"
                >
                  <Save className="w-4 h-4" />
                  Save Departments
                </button>
              </div>

              <div className="text-xs font-semibold text-slate-400">Note: Deleting a department moves its officers to SAMASA.</div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Manager */}
      {acctModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-[120] bg-samasa-black/80 backdrop-blur-md p-4">
          <div className="mx-auto w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-[3rem] border border-white/30 shadow-2xl">
            <div className="p-8 sm:p-10 border-b border-slate-100 flex items-start justify-between gap-6 sticky top-0 bg-white z-10">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Officer Accounts</div>
                <div className="mt-2 text-3xl font-black text-samasa-black tracking-tighter">Manage Officer Login Accounts</div>
                <div className="mt-2 text-xs font-semibold text-slate-400">
                  Accounts are stored in Firebase Auth (login) and Firestore users collection (profile).
                </div>
              </div>

              <button
                onClick={() => setAcctModalOpen(false)}
                className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-samasa-black transition-all"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-96px)] overflow-y-auto p-8 sm:p-10 space-y-10">
              <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{acctEditing ? "Edit Account" : "Create Account"}</div>
                    <div className="mt-2 text-2xl font-black text-samasa-black tracking-tighter flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-samasa-blue" />
                      Officer Login Account
                    </div>
                  </div>

                  <button
                    onClick={openCreateAccount}
                    className="inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-[10px] uppercase tracking-[0.25em] hover:bg-slate-50 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-samasa-blue" />
                    New
                  </button>
                </div>

                <form onSubmit={submitAccount} className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                      Linked Officer (optional)
                    </label>
                    <div className="relative">
                      <Link2 className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <select
                        value={acctForm.officerId || ""}
                        onChange={(e) => onLinkOfficer(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                      >
                        <option value="">— Not linked —</option>
                        {officerChoices.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-400">
                      Linking shows an “Account” badge on the officer card.
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Name</label>
                    <input
                      value={acctForm.name}
                      onChange={(e) => setAcctForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                      placeholder="Officer user name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        value={acctForm.email}
                        onChange={(e) => setAcctForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                        placeholder="officer@samasa.edu"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="password"
                        value={acctForm.password}
                        onChange={(e) => setAcctForm((p) => ({ ...p, password: e.target.value }))}
                        className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-samasa-blue/30"
                        placeholder={acctEditing ? "Leave blank to keep password" : "Set a password"}
                        required={!acctEditing}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-2 flex items-center justify-between flex-wrap gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setAcctForm((p) => ({ ...p, active: !p.active }))}
                      className={`px-5 py-4 rounded-2xl border font-black text-[10px] uppercase tracking-[0.25em] transition-all ${
                        acctForm.active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {acctForm.active ? "Active" : "Disabled"}
                    </button>

                    <div className="flex gap-3 flex-1">
                      <button
                        type="submit"
                        className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-samasa-blue text-white font-black text-[10px] uppercase tracking-[0.25em] hover:opacity-90 transition-all active:scale-95 shadow-xl"
                      >
                        <Save className="w-4 h-4" />
                        {acctEditing ? "Save Changes" : "Create Account"}
                      </button>

                      <button
                        type="button"
                        onClick={openCreateAccount}
                        className="px-6 py-5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-[0.25em] hover:bg-slate-50 transition-all active:scale-95"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Existing Officer Accounts</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{officerAccounts.length} total</div>
                </div>

                {officerAccounts.length === 0 ? (
                  <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-200 text-slate-500 font-semibold">
                    No officer accounts created yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {officerAccounts.map((a) => {
                      const linked = a.officerId ? officerById(a.officerId) : undefined;
                      return (
                        <div
                          key={a.id}
                          className="bg-white border border-slate-200 rounded-[2.5rem] p-6 flex items-start justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-black text-samasa-black truncate">{a.name}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500 truncate">{a.email}</div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] bg-slate-50 border border-slate-200 text-slate-600">
                                <Users className="w-4 h-4" />
                                OFFICER
                              </span>

                              {a.active === false ? (
                                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] bg-rose-50 border border-rose-100 text-rose-700">
                                  <KeyRound className="w-4 h-4" />
                                  Disabled
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] bg-emerald-50 border border-emerald-100 text-emerald-700">
                                  <KeyRound className="w-4 h-4" />
                                  Active
                                </span>
                              )}

                              {linked ? (
                                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] bg-emerald-50 border border-emerald-100 text-emerald-700">
                                  <Link2 className="w-4 h-4" />
                                  Linked: {linked.name}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] bg-amber-50 border border-amber-100 text-amber-700">
                                  <Link2 className="w-4 h-4" />
                                  Not linked
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => openEditAccount(a)}
                              className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteAccount(a.id)}
                              className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-samasa-red" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setAcctModalOpen(false)}
                  className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-[0.25em] hover:bg-slate-200 transition-all active:scale-95"
                >
                  Close
                </button>
              </div>

              <div className="text-xs font-semibold text-slate-400">
                Note: Deleting an officer card can also unlink its linked account(s). Deleting Auth users requires Admin SDK.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Officers;
