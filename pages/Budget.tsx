// src/pages/Budget.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { User, UserRole, BudgetEntry, DepartmentType } from "../types";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  Save,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Layers,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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

interface BudgetProps {
  user: User;
  isEditable?: boolean; // controls editing (not viewing)
  hideTitle?: boolean;  // ✅ add this for landing page
}

type DeptKey = DepartmentType | "ALL";
type FundKey = "operational" | "project" | "trust";
type RecordMode = "INCOME" | "EXPENSE" | "AVAILABLE_ONLY";

const PAGE_SIZE = 10;

const deptLabel = (d: DeptKey) => (d === "ALL" ? "Overall" : String(d));
const normalizeNumber = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const isFundKey = (v: any): v is FundKey => v === "operational" || v === "project" || v === "trust";

const isoToday = () => new Date().toISOString().slice(0, 10);
const toISODate = (raw: any) => {
  const s = String(raw ?? "").trim();
  if (!s) return isoToday();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return isoToday();
  return d.toISOString().slice(0, 10);
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const Budget: React.FC<BudgetProps> = ({ user, isEditable = true, hideTitle = false }) => {
  const isPrivilegedViewer = user.role === UserRole.SUPERADMIN || user.role === UserRole.OFFICER;
  const canManage = isEditable && isPrivilegedViewer;

  // ===== Data =====
  const [entries, setEntries] = useState<BudgetEntry[]>([]);

  // ===== Filters =====
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<DeptKey>("ALL");

  // ===== Pagination (table) =====
  const [page, setPage] = useState(1);

  // ===== Record Modal =====
  const [recordOpen, setRecordOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BudgetEntry | null>(null);

  const [mode, setMode] = useState<RecordMode>("EXPENSE");
  const [deptInput, setDeptInput] = useState<DepartmentType>(DepartmentType.SAMASA as any);
  const [dateInput, setDateInput] = useState<string>(isoToday());
  const [amountInput, setAmountInput] = useState<string>("");

  const [fundInput, setFundInput] = useState<FundKey>("operational");
  const [fundSelected, setFundSelected] = useState(false);

  const titleRef = useRef<HTMLInputElement | null>(null);
  const categoryRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!recordOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [recordOpen]);

  // ===== Firestore listener =====
  useEffect(() => {
    const qEntries = query(collection(db, "budgetEntries"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qEntries,
      (snap) => {
        const rows: BudgetEntry[] = snap.docs.map((d) => {
          const data = d.data() as any;

          const fundRaw = data?.fund;
          const fund = isFundKey(fundRaw) ? (fundRaw as FundKey) : undefined;

          const impact = data?.impact === "AVAILABLE_ONLY" ? "AVAILABLE_ONLY" : "LEDGER";

          return {
            id: d.id,
            title: String(data.title ?? ""),
            amount: normalizeNumber(data.amount),
            type: (data.type === "INCOME" ? "INCOME" : "EXPENSE") as "INCOME" | "EXPENSE",
            category: String(data.category ?? ""),
            department: (data.department ?? DepartmentType.SAMASA) as any,
            date: String(data.date ?? ""),
            approvedBy: String(data.approvedBy ?? ""),
            fund,
            impact: impact as any,
          } as any;
        });

        setEntries(rows);
      },
      () => setEntries((prev) => prev)
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, selectedDept]);

  // ===== Dept-scoped entries =====
  const entriesForDept = useMemo(() => {
    return selectedDept === "ALL"
      ? entries
      : entries.filter((e) => String(e.department) === String(selectedDept));
  }, [entries, selectedDept]);

  const ledgerEntries = useMemo(
    () => entriesForDept.filter((e: any) => e?.impact !== "AVAILABLE_ONLY"),
    [entriesForDept]
  );

  const availableAdjustEntries = useMemo(
    () => entriesForDept.filter((e: any) => e?.impact === "AVAILABLE_ONLY"),
    [entriesForDept]
  );

  // ===== Cards =====
  const revenue = useMemo(
    () => ledgerEntries.filter((e) => e.type === "INCOME").reduce((a, e) => a + e.amount, 0),
    [ledgerEntries]
  );

  const expenditure = useMemo(
    () => ledgerEntries.filter((e) => e.type === "EXPENSE").reduce((a, e) => a + e.amount, 0),
    [ledgerEntries]
  );

  const availableAdjust = useMemo(
    () => availableAdjustEntries.reduce((a, e) => a + (Number(e.amount) || 0), 0),
    [availableAdjustEntries]
  );

  const available = useMemo(() => revenue - expenditure + availableAdjust, [revenue, expenditure, availableAdjust]);

  const funds = useMemo(() => {
    const spent = (fund: FundKey) =>
      ledgerEntries
        .filter((e: any) => e.type === "EXPENSE" && e.fund === fund)
        .reduce((a, e) => a + e.amount, 0);

    return {
      operational: spent("operational"),
      project: spent("project"),
      trust: spent("trust"),
    };
  }, [ledgerEntries]);

  // ===== Table entries =====
  const tableEntriesAll = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return entriesForDept;
    return entriesForDept.filter((e: any) => {
      const hay = `${e.title} ${e.category} ${e.department} ${e.date} ${e.type} ${e.fund ?? ""} ${
        e.impact ?? ""
      }`.toLowerCase();
      return hay.includes(s);
    });
  }, [entriesForDept, search]);

  const pageCount = useMemo(() => {
    if (user.role !== UserRole.SUPERADMIN && user.role !== UserRole.OFFICER) return 1;
    return Math.max(1, Math.ceil(tableEntriesAll.length / PAGE_SIZE));
  }, [tableEntriesAll.length, user.role]);

  useEffect(() => {
    setPage((p) => clamp(p, 1, pageCount));
  }, [pageCount]);

  const pagedEntries = useMemo(() => {
    if (!isPrivilegedViewer) return tableEntriesAll.slice(0, PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    return tableEntriesAll.slice(start, start + PAGE_SIZE);
  }, [tableEntriesAll, page, isPrivilegedViewer]);

  const visibleFrom = useMemo(() => {
    if (!isPrivilegedViewer) return tableEntriesAll.length === 0 ? 0 : 1;
    return tableEntriesAll.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  }, [tableEntriesAll.length, page, isPrivilegedViewer]);

  const visibleTo = useMemo(() => {
    if (tableEntriesAll.length === 0) return 0;
    if (!isPrivilegedViewer) return Math.min(PAGE_SIZE, tableEntriesAll.length);
    return Math.min(page * PAGE_SIZE, tableEntriesAll.length);
  }, [tableEntriesAll.length, page, isPrivilegedViewer]);

  // ===== UI helpers =====
  const MetricCard: React.FC<{
    title: string;
    value: number;
    tone?: "neutral" | "good" | "bad";
    icon: React.ReactNode;
  }> = ({ title, value, tone = "neutral", icon }) => {
    const color =
      tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-samasa-red" : "text-samasa-black";

    return (
      <div className="bg-white p-8 rounded-[2.25rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500">
            {icon}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</div>
        </div>
        <div className={`mt-6 text-4xl font-black tracking-tighter ${color}`}>₱{Number(value).toLocaleString()}</div>
      </div>
    );
  };

  const Pill: React.FC<{
    active: boolean;
    disabled?: boolean;
    onClick?: () => void;
    activeClass: string;
    children: React.ReactNode;
  }> = ({ active, disabled, onClick, activeClass, children }) => {
    const base =
      "w-full px-4 py-3 rounded-2xl border font-black text-[10px] uppercase tracking-[0.25em] transition-all";
    const idle = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50";
    const cls = active ? activeClass : idle;

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`${base} ${cls} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {children}
      </button>
    );
  };

  // ===== Open / Edit =====
  const openNewRecord = () => {
    if (!canManage) return;
    setEditingEntry(null);

    setMode("EXPENSE");
    setDeptInput((selectedDept === "ALL" ? DepartmentType.SAMASA : selectedDept) as any);
    setDateInput(isoToday());
    setAmountInput("");

    setFundInput("operational");
    setFundSelected(false);

    setRecordOpen(true);
    setTimeout(() => titleRef.current?.focus(), 0);
  };

  const openEditRecord = (e: BudgetEntry) => {
    if (!canManage) return;
    setEditingEntry(e);

    const impact = (e as any)?.impact === "AVAILABLE_ONLY" ? "AVAILABLE_ONLY" : "LEDGER";
    if (impact === "AVAILABLE_ONLY") setMode("AVAILABLE_ONLY");
    else setMode(e.type === "INCOME" ? "INCOME" : "EXPENSE");

    setDeptInput((e.department || DepartmentType.SAMASA) as any);
    setDateInput(toISODate((e as any)?.date));
    setAmountInput(String(e.amount ?? ""));

    const fund = isFundKey((e as any)?.fund) ? ((e as any).fund as FundKey) : "operational";
    setFundInput(fund);
    setFundSelected(e.type === "EXPENSE" && isFundKey((e as any)?.fund));

    setRecordOpen(true);
    setTimeout(() => titleRef.current?.focus(), 0);
  };

  const closeRecord = () => setRecordOpen(false);

  // ===== Save / Delete =====
  const handleDelete = async (id: string) => {
    if (!canManage) return;
    if (!confirm("Delete this record?")) return;
    try {
      await deleteDoc(doc(db, "budgetEntries", id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete record.");
    }
  };

  const saveRecord = async () => {
    if (!canManage) return;

    const title = String(titleRef.current?.value || "").trim();
    const categoryRaw = String(categoryRef.current?.value || "").trim();
    const amount = normalizeNumber(amountInput);

    if (!title) return alert("Description is required.");
    if (!Number.isFinite(amount) || amount === 0) return alert("Amount must not be 0.");

    if (mode === "EXPENSE" && !fundSelected) {
      return alert("Pick Operational / Project / Trust for Expense.");
    }

    const base: any = {
      title,
      amount,
      department: String(deptInput),
      date: dateInput || isoToday(),
      approvedBy: user.name,
      updatedAt: serverTimestamp(),
    };

    if (mode === "AVAILABLE_ONLY") {
      base.impact = "AVAILABLE_ONLY";
      base.type = "INCOME";
      base.category = categoryRaw || "Balance Adjustment";
    } else {
      base.impact = "LEDGER";
      base.type = mode === "INCOME" ? "INCOME" : "EXPENSE";
      base.category = categoryRaw || (mode === "INCOME" ? "Income" : "Expense");
      if (mode === "EXPENSE") base.fund = fundInput;
    }

    try {
      if (editingEntry?.id) {
        await updateDoc(doc(db, "budgetEntries", editingEntry.id), base);
      } else {
        await addDoc(collection(db, "budgetEntries"), { ...base, createdAt: serverTimestamp() });
      }
      closeRecord();
      setEditingEntry(null);
    } catch (err: any) {
      alert(err?.message || "Failed to save record.");
    }
  };

  return (
    <div className="w-full">
      {/* Header (hidden on landing page) */}
      {!hideTitle && (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <div className="text-4xl font-black tracking-tighter text-samasa-black">Budget</div>
            <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
              {deptLabel(selectedDept)}
            </div>
          </div>

          {canManage && (
            <button
              onClick={openNewRecord}
              className="inline-flex items-center justify-center gap-3 px-7 py-4 bg-samasa-black text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-samasa-blue transition-all active:scale-95 shadow-xl shadow-samasa-blue/10"
            >
              <Plus className="w-4 h-4" />
              Record
            </button>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MetricCard title="Available" value={available} tone={available >= 0 ? "neutral" : "bad"} icon={<Wallet size={18} />} />
        <MetricCard title="Revenue" value={revenue} tone="good" icon={<ArrowUpRight size={18} />} />
        <MetricCard title="Expenditure" value={expenditure} tone="bad" icon={<ArrowDownRight size={18} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MetricCard title="Operational" value={funds.operational} icon={<Briefcase size={18} />} />
        <MetricCard title="Project" value={funds.project} icon={<Layers size={18} />} />
        <MetricCard title="Trust" value={funds.trust} icon={<ShieldCheck size={18} />} />
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-samasa-blue/5 focus:border-samasa-blue font-bold text-sm transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value as any)}
              className="pl-10 pr-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none appearance-none hover:border-slate-300 transition-colors cursor-pointer"
            >
              <option value="ALL">Overall</option>
              {Object.values(DepartmentType).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.25rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                {canManage && (
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {pagedEntries.map((e: any) => {
                const isAdj = e?.impact === "AVAILABLE_ONLY";
                const fundText =
                  e.fund === "operational"
                    ? "Operational"
                    : e.fund === "project"
                      ? "Project"
                      : e.fund === "trust"
                        ? "Trust"
                        : "";

                return (
                  <tr
                    key={e.id}
                    className={`group hover:bg-slate-50/40 transition-colors ${canManage ? "cursor-pointer" : ""}`}
                    onClick={() => canManage && openEditRecord(e)}
                  >
                    <td className="px-8 py-6">
                      <div className="font-black text-samasa-black text-lg tracking-tight group-hover:text-samasa-blue transition-colors">
                        {e.title}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-md text-[9px] font-black uppercase tracking-wider text-slate-600">
                          {e.department}
                        </span>

                        <span
                          className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            isAdj
                              ? "bg-indigo-50 border border-indigo-100 text-indigo-700"
                              : "bg-slate-50 border border-slate-100 text-slate-600"
                          }`}
                        >
                          {isAdj ? "Balance" : e.type === "INCOME" ? "Income" : "Expense"}
                        </span>

                        {!isAdj && e.type === "EXPENSE" && fundText && (
                          <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md text-[9px] font-black uppercase tracking-wider text-slate-600">
                            {fundText}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {e.category} • {e.date}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div
                        className={`text-xl font-black tracking-tight ${
                          isAdj ? "text-indigo-700" : e.type === "INCOME" ? "text-emerald-600" : "text-samasa-red"
                        }`}
                      >
                        {isAdj ? "" : e.type === "INCOME" ? "+" : "-"}₱{Number(e.amount).toLocaleString()}
                      </div>
                    </td>

                    {canManage && (
                      <td className="px-8 py-6 text-right" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditRecord(e)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:bg-samasa-blue/10 hover:text-samasa-blue transition-all"
                            title="Edit"
                            type="button"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-samasa-red transition-all"
                            title="Delete"
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {pagedEntries.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 3 : 2} className="px-8 py-16 text-center">
                    <div className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">No records</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-6 sm:px-8 py-5 border-t border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Showing {visibleFrom}-{visibleTo} of {tableEntriesAll.length}
              {!isPrivilegedViewer && tableEntriesAll.length > PAGE_SIZE ? " (latest 10)" : ""}
            </div>

            {isPrivilegedViewer && pageCount > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 ${
                    page <= 1
                      ? "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>

                <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Page {page} / {pageCount}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 ${
                    page >= pageCount
                      ? "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>

      {/* Record Modal (unchanged) */}
      {recordOpen && (
        <div className="fixed inset-0 z-[500]">
          <div className="absolute inset-0 bg-samasa-black/40 backdrop-blur-md" onClick={closeRecord} />
          <div className="relative h-full w-full flex items-center justify-center p-4 sm:p-6">
            <div
              className="w-full max-w-2xl bg-white rounded-[2.25rem] shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "90vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 sm:px-8 py-6 border-b border-slate-100">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-3xl font-black tracking-tighter text-samasa-black">
                    {editingEntry ? "Update" : "Record"}
                  </div>
                  <button
                    type="button"
                    onClick={closeRecord}
                    className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-400 hover:bg-samasa-red hover:text-white transition-all flex items-center justify-center"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Pill
                    active={mode === "INCOME"}
                    onClick={() => {
                      setMode("INCOME");
                      setFundSelected(false);
                    }}
                    activeClass="bg-emerald-600 border-emerald-600 text-white"
                  >
                    Income
                  </Pill>

                  <Pill
                    active={mode === "EXPENSE"}
                    onClick={() => {
                      setMode("EXPENSE");
                      if (!editingEntry) setFundSelected(false);
                    }}
                    activeClass="bg-rose-600 border-rose-600 text-white"
                  >
                    Expense
                  </Pill>

                  <Pill
                    active={mode === "AVAILABLE_ONLY"}
                    onClick={() => {
                      setMode("AVAILABLE_ONLY");
                      setFundSelected(false);
                    }}
                    activeClass="bg-blue-600 border-blue-600 text-white"
                  >
                    Balance
                  </Pill>
                </div>

                {mode === "EXPENSE" && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Pill
                      active={fundInput === "operational"}
                      onClick={() => {
                        setFundInput("operational");
                        setFundSelected(true);
                      }}
                      activeClass="bg-blue-600 border-blue-600 text-white"
                    >
                      Operational
                    </Pill>

                    <Pill
                      active={fundInput === "project"}
                      onClick={() => {
                        setFundInput("project");
                        setFundSelected(true);
                      }}
                      activeClass="bg-violet-600 border-violet-600 text-white"
                    >
                      Project
                    </Pill>

                    <Pill
                      active={fundInput === "trust"}
                      onClick={() => {
                        setFundInput("trust");
                        setFundSelected(true);
                      }}
                      activeClass="bg-teal-600 border-teal-600 text-white"
                    >
                      Trust
                    </Pill>
                  </div>
                )}
              </div>

              <div className="px-6 sm:px-8 py-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Description
                    </div>
                    <input
                      ref={titleRef}
                      defaultValue={editingEntry?.title}
                      placeholder="e.g., Office supplies"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-samasa-blue/5 focus:border-samasa-blue transition-all"
                    />
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Amount
                    </div>
                    <input
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-samasa-blue/5 focus:border-samasa-blue transition-all"
                    />
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Department
                    </div>
                    <select
                      value={deptInput as any}
                      onChange={(e) => setDeptInput(e.target.value as any)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none cursor-pointer"
                    >
                      {Object.values(DepartmentType).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Date
                    </div>
                    <input
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      type="date"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-samasa-blue/5 focus:border-samasa-blue transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Category
                    </div>
                    <input
                      ref={categoryRef}
                      defaultValue={editingEntry?.category}
                      placeholder={mode === "AVAILABLE_ONLY" ? "Balance Adjustment" : "e.g., Supplies / Event"}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-samasa-blue/5 focus:border-samasa-blue transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8 py-6 border-t border-slate-100 bg-white">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={closeRecord}
                    className="flex-1 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-[0.98] text-[10px] uppercase tracking-[0.3em]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={saveRecord}
                    className="flex-1 py-4 bg-samasa-black text-white font-black rounded-2xl hover:bg-samasa-blue transition-all active:scale-[0.98] shadow-xl shadow-samasa-blue/20 text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
