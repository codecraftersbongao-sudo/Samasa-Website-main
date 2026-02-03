// src/pages/Home.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { User, BudgetEntry } from "../types";
import {
  LayoutDashboard,
  ShieldAlert,
  CheckCircle,
  FileText,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
} from "lucide-react";

// ✅ Firestore
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

interface HomeProps {
  user: User;
}

const normalizeNumber = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

type TopOverride = {
  available: number;
  revenue: number;
  expenditure: number;
};

const Home: React.FC<HomeProps> = ({ user }) => {
  // ===== Budget (same source as Budget.tsx) =====
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(true);

  // Overrides (budgetOverrides/ALL) — same schema as Budget.tsx
  const [topOverrideAll, setTopOverrideAll] = useState<TopOverride>({
    available: 0,
    revenue: 0,
    expenditure: 0,
  });

  // ===== Proposals count (for Legislative Alert) =====
  const [pendingProposals, setPendingProposals] = useState<number>(0);
  const [proposalLoading, setProposalLoading] = useState(true);

  // ✅ Load budget entries (all, real-time)
  useEffect(() => {
    const qEntries = query(collection(db, "budgetEntries"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qEntries,
      (snap) => {
        const rows: BudgetEntry[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: String(data.title ?? ""),
            amount: normalizeNumber(data.amount),
            type: (data.type === "INCOME" ? "INCOME" : "EXPENSE") as "INCOME" | "EXPENSE",
            category: String(data.category ?? ""),
            department: (data.department ?? "SAMASA") as any,
            date: String(data.date ?? ""),
            approvedBy: String(data.approvedBy ?? ""),
          } as BudgetEntry;
        });

        setEntries(rows);
        setBudgetLoading(false);
      },
      (err) => {
        console.warn("Home budgetEntries snapshot error:", err);
        setEntries([]);
        setBudgetLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ✅ Load overrides for ALL (real-time)
  useEffect(() => {
    const ref = doc(db, "budgetOverrides", "ALL");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.data() || {}) as any;
        setTopOverrideAll({
          available: normalizeNumber(data?.top?.available),
          revenue: normalizeNumber(data?.top?.revenue),
          expenditure: normalizeNumber(data?.top?.expenditure),
        });
      },
      (err) => {
        console.warn("Home budgetOverrides/ALL snapshot error:", err);
        setTopOverrideAll({ available: 0, revenue: 0, expenditure: 0 });
      }
    );

    return () => unsub();
  }, []);

  // ✅ Pending proposals (REVIEW + PENDING) real-time
  useEffect(() => {
    const qPending = query(
      collection(db, "proposals"),
      where("status", "in", ["REVIEW", "PENDING"])
    );

    const unsub = onSnapshot(
      qPending,
      (snap) => {
        setPendingProposals(snap.size);
        setProposalLoading(false);
      },
      (err) => {
        console.warn("Home proposals snapshot error:", err);
        setPendingProposals(0);
        setProposalLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ===== Budget totals (Overall, like selectedDept=ALL and search="") =====
  const totalIncome = useMemo(
    () => entries.filter((e) => e.type === "INCOME").reduce((acc, e) => acc + e.amount, 0),
    [entries]
  );

  const totalExpense = useMemo(
    () => entries.filter((e) => e.type === "EXPENSE").reduce((acc, e) => acc + e.amount, 0),
    [entries]
  );

  const balance = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);

  // Display = computed + override (same as Budget.tsx displayedTop)
  const displayedTopAll = useMemo(() => {
    const available = balance + (topOverrideAll.available ?? 0);
    const revenue = totalIncome + (topOverrideAll.revenue ?? 0);
    const expenditure = totalExpense + (topOverrideAll.expenditure ?? 0);
    return { available, revenue, expenditure };
  }, [balance, totalIncome, totalExpense, topOverrideAll]);

  // ✅ Activity feed uses newest 4 (like Budget ordering)
  const recentActivity = useMemo(() => entries.slice(0, 4), [entries]);

  const firstName = useMemo(() => {
    const n = (user as any)?.name || (user as any)?.fullName || "Officer";
    return String(n).split(" ")[0] || "Officer";
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12">
        <div className="flex items-center space-x-2 text-samasa-blue font-black mb-2 uppercase tracking-[0.3em] text-[10px]">
          <LayoutDashboard className="w-4 h-4" />
          <span>Internal Portal</span>
        </div>
        <h1 className="text-6xl font-black text-samasa-black tracking-tighter">
          Welcome, <span className="text-samasa-blue">{firstName}</span>.
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {/* Quick Stats (same UI/UX) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Legislative Alert */}
            <Link
              to="/proposals"
              className="bg-samasa-yellow p-10 rounded-[3rem] shadow-xl hover:rotate-1 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                <FileText className="w-12 h-12 text-samasa-black opacity-10 group-hover:opacity-30 transition-all" />
              </div>

              <div className="flex items-center space-x-2 text-samasa-black font-black uppercase tracking-widest text-[10px] mb-8">
                <span className="w-2 h-2 rounded-full bg-samasa-red animate-pulse"></span>
                <span>Legislative Alert</span>
              </div>

              <h3 className="text-5xl font-black text-samasa-black mb-2 tracking-tighter">
                {proposalLoading ? "—" : pendingProposals}
              </h3>

              <p className="text-samasa-black/60 font-black uppercase tracking-widest text-[10px]">
                Pending Actions Required
              </p>

              <div className="mt-8 flex items-center text-xs font-black uppercase text-samasa-black">
                Review Queue{" "}
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>

            {/* ✅ Audit Status card now driven by Budget.tsx logic (Available Overall) */}
            <Link
              to="/budget"
              className="bg-samasa-blue p-10 rounded-[3rem] shadow-xl text-white hover:-rotate-1 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                <CheckCircle className="w-12 h-12 text-white opacity-10 group-hover:opacity-30 transition-all" />
              </div>

              <div className="flex items-center space-x-2 text-samasa-yellow font-black uppercase tracking-widest text-[10px] mb-8">
                <span className="w-2 h-2 rounded-full bg-samasa-yellow"></span>
                <span>Audit Status</span>
              </div>

              <h3 className="text-5xl font-black mb-2 tracking-tighter">
                {budgetLoading ? "—" : `₱${Number(displayedTopAll.available).toLocaleString()}`}
              </h3>

              <p className="text-blue-100 font-black uppercase tracking-widest text-[10px]">
                Available Balance (Overall)
              </p>

              <div className="mt-8 flex items-center text-xs font-black uppercase text-samasa-yellow">
                Audit Registry{" "}
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
          </div>

          {/* Activity Feed (same UI/UX) */}
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h4 className="text-xl font-black text-samasa-black uppercase tracking-[0.2em] flex items-center">
                Recent Activity
                <div className="ml-6 flex-grow h-[1px] bg-slate-100 hidden sm:block"></div>
              </h4>
              <Link
                to="/budget"
                className="text-[10px] font-black text-samasa-blue uppercase tracking-widest hover:underline"
              >
                View Full Ledger
              </Link>
            </div>

            <div className="space-y-4">
              {budgetLoading ? (
                <div className="py-14 text-center">
                  <div className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">
                    Loading activity…
                  </div>
                </div>
              ) : (
                <>
                  {recentActivity.map((activity: any, i: number) => (
                    <div
                      key={activity.id || i}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[2rem] bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 transition-all group gap-4"
                    >
                      <div className="flex items-center space-x-6">
                        <div
                          className={`p-4 rounded-2xl ${
                            activity.type === "INCOME"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-red-100 text-samasa-red"
                          }`}
                        >
                          {activity.type === "INCOME" ? (
                            <TrendingUp className="w-6 h-6" />
                          ) : (
                            <TrendingDown className="w-6 h-6" />
                          )}
                        </div>

                        <div>
                          <p className="font-black text-lg text-samasa-black group-hover:text-samasa-blue transition-colors">
                            {activity.title}
                          </p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span
                              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                activity.type === "INCOME"
                                  ? "bg-emerald-600/10 text-emerald-600"
                                  : "bg-samasa-red/10 text-samasa-red"
                              }`}
                            >
                              {activity.type}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Auth: {activity.approvedBy || "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-black text-samasa-black tracking-tighter">
                          {activity.type === "INCOME" ? "+" : "-"} ₱
                          {Number(activity.amount || 0).toLocaleString()}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          {activity.date || "—"}
                        </span>
                      </div>
                    </div>
                  ))}

                  {recentActivity.length === 0 && (
                    <div className="py-14 text-center">
                      <div className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">
                        No recent activity
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Side cards (unchanged) */}
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm text-center">
            <div className="w-20 h-20 bg-samasa-blue/5 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShieldCheck className="w-10 h-10 text-samasa-blue" />
            </div>
            <h4 className="text-xl font-black text-samasa-black mb-2 uppercase tracking-tight">
              Security Core
            </h4>
            <p className="text-slate-500 font-medium text-xs mb-8 leading-relaxed">
              System session is AES-encrypted. Your activity is logged for
              administrative accountability.
            </p>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="w-1/2 h-full bg-samasa-blue"></div>
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">
              Session Integrity: 100%
            </p>
          </div>

          <div className="bg-samasa-red p-10 rounded-[3.5rem] shadow-xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldAlert className="w-16 h-16" />
            </div>
            <h4 className="text-xl font-black mb-4 uppercase tracking-widest">
              Protocol Notice
            </h4>
            <p className="text-red-100 font-medium text-xs leading-relaxed">
              Ensure all departmental audits are finalized before the quarterly
              synchronization. Unauthorized spending is flagged automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
