// src/pages/Login.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, UserRole } from "../types";
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";

import { auth, db } from "../firebase/firebaseConfig";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

interface LoginProps {
  onLogin: (user: User) => void;
}

const LANDING_DOC_REF = () => doc(db, "siteSettings", "landingPage");

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // UX states
  const [error, setError] = useState<string | null>(null);

  // ✅ NEW: superadmin-editable login background
  const [loginBgUrl, setLoginBgUrl] = useState<string>("");

  const navigate = useNavigate();
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  // ✅ Load login background (public readable doc)
  useEffect(() => {
    const ref = LANDING_DOC_REF();

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as any;
        setLoginBgUrl(String(data?.loginBackgroundUrl || ""));
      },
      (err) => {
        console.warn("Login background load failed (ok if rules block):", err);
      }
    );

    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      // 1) Firebase Auth login
      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const fbUser = cred.user;

      // 2) Validate role + active from Firestore (users/{uid})
      const userRef = doc(db, "users", fbUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        setError("Account profile not found. Please contact the Superadmin.");
        await signOut(auth);
        return;
      }

      const data = snap.data() as any;

      // ✅ Allowed roles: SUPERADMIN, OFFICER (keep strict)
      const roleRaw = String(data.role || "").toUpperCase();
      const isOfficer = roleRaw === String(UserRole.OFFICER);
      const isSuperAdmin = roleRaw === String(UserRole.SUPERADMIN);

      if (!isOfficer && !isSuperAdmin) {
        setError("This account is not permitted to access the portal.");
        await signOut(auth);
        return;
      }

      if (data.active === false) {
        setError("This account is disabled. Please contact the Superadmin.");
        await signOut(auth);
        return;
      }

      const user: User = {
        id: fbUser.uid,
        name: data.name || fbUser.displayName || "User",
        email: fbUser.email || normalizedEmail,
        role: isSuperAdmin ? UserRole.SUPERADMIN : UserRole.OFFICER,
        officerId: data.officerId,
      };

      onLogin(user);
      navigate("/");
    } catch (err: any) {
      const code = err?.code || "";

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-email"
      ) {
        setError("Invalid email or password.");
      } else if (code === "auth/user-not-found") {
        setError("Account not found. Please contact the Superadmin.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white selection:bg-samasa-blue selection:text-white font-sans">
      {/* Branding Narrative Side */}
      <div className="lg:w-1/2 bg-samasa-black relative flex flex-col justify-between px-6 py-10 sm:p-12 lg:p-24 overflow-hidden">
        {/* ✅ NEW: Admin-controlled background image (keeps dark theme) */}
        {loginBgUrl ? (
          <img
            src={loginBgUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25 grayscale"
            draggable={false}
          />
        ) : null}

        {/* ✅ Dark overlay always (so theme stays dark even with bright image) */}
        <div className="absolute inset-0 bg-gradient-to-b from-samasa-black/40 via-samasa-black/85 to-samasa-black" />

        {/* Existing glow blobs */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-samasa-blue/20 blur-[150px] rounded-full -mr-96 -mt-96 animate-pulse duration-[10s]" />
        <div className="absolute bottom-0 left-0 w-[520px] h-[520px] bg-samasa-red/10 blur-[120px] rounded-full -ml-48 -mb-48 animate-pulse duration-[8s]" />

        <div className="relative z-10">
          <div className="flex items-center space-x-4 sm:space-x-5 mb-10 sm:mb-16 lg:mb-24 group cursor-default">
            <div className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 flex items-center justify-center shrink-0">
              <img
                src="/assets/samasa-logo.png"
                alt="SAMASA Logo"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-none">
                SAMASA
              </span>
              <span className="text-[9px] sm:text-[10px] font-black text-samasa-yellow uppercase tracking-[0.5em] sm:tracking-[0.6em] mt-2 block opacity-70">
                CASS Infrastructure
              </span>
            </div>
          </div>

          <div className="max-w-xl">
            <h2 className="text-4xl sm:text-6xl lg:text-8xl font-black text-white tracking-tighter leading-[0.95] mb-6 sm:mb-10">
              Serve <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-samasa-blue to-blue-400">
                Strategically.
              </span>
            </h2>

            <div className="flex items-start sm:items-center space-x-4 sm:space-x-6">
              <div className="h-14 sm:h-20 w-1 bg-samasa-blue rounded-full shrink-0" />
              <p className="text-slate-400 text-base sm:text-xl font-medium leading-relaxed max-w-sm italic">
                Secure gateway for College of Arts and Social Sciences student leaders.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 sm:pt-10 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-5 sm:space-x-6">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-samasa-black bg-slate-800 flex items-center justify-center shadow-lg transition-transform hover:translate-y-[-4px]"
                >
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-samasa-yellow" />
                </div>
              ))}
            </div>

            <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose">
              Trusted governance <br />
              environment
            </p>
          </div>
        </div>
      </div>

      {/* Authentication Side */}
      <div className="lg:w-1/2 flex items-center justify-center px-4 py-10 sm:p-8 lg:p-24 bg-slate-50 relative">
        {/* Back circles */}
        <div className="absolute top-24 right-10 sm:right-24 w-56 sm:w-64 h-56 sm:h-64 border-2 border-slate-100 rounded-full opacity-50" />
        <div className="absolute bottom-24 left-10 sm:left-24 w-36 sm:w-40 h-36 sm:h-40 border-2 border-slate-100 rounded-full opacity-30" />

        <div className="max-w-md w-full relative z-10">
          {/* Back ABOVE "Sign in" */}
          <div className="mb-6 sm:mb-8">
            <Link
              to="/"
              className="group inline-flex items-center space-x-3 text-slate-400 hover:text-samasa-black transition-colors"
            >
              <div className="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center group-hover:border-samasa-black group-hover:bg-samasa-black group-hover:text-white transition-all shadow-sm">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block">
                Back
              </span>
            </Link>
          </div>

          <div className="mb-10 sm:mb-14">
            <h1 className="text-5xl sm:text-7xl font-black text-samasa-black mb-3 sm:mb-4 tracking-tight">
              Sign in
            </h1>
            <p className="text-slate-500 font-medium text-base sm:text-lg">
              Use your official account to access the portal.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 rounded-3xl border border-samasa-red/20 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm font-semibold text-samasa-red">{error}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6 sm:space-y-8"
            autoComplete="on"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          >
            {/* Email */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">
                Email
              </label>

              <div className="relative group">
                <Mail className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-samasa-blue transition-colors" />
                <input
                  name="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-14 sm:pl-16 pr-6 py-4 sm:py-6 bg-white border border-slate-200 rounded-[1.75rem] sm:rounded-[2rem] focus:ring-8 focus:ring-samasa-blue/5 focus:border-samasa-blue outline-none transition-all font-bold text-samasa-black shadow-xl shadow-black/[0.02]"
                  placeholder="name@samasa.edu"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">
                Password
              </label>

              <div className="relative group">
                <Lock className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-samasa-blue transition-colors" />

                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-14 sm:pl-16 pr-14 sm:pr-16 py-4 sm:py-6 bg-white border border-slate-200 rounded-[1.75rem] sm:rounded-[2rem] focus:ring-8 focus:ring-samasa-blue/5 focus:border-samasa-blue outline-none transition-all font-bold text-samasa-black shadow-xl shadow-black/[0.02]"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-samasa-black hover:bg-slate-50 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="group w-full py-4 sm:py-6 bg-samasa-black text-white font-black rounded-[1.75rem] sm:rounded-[2rem] hover:bg-samasa-blue transition-all shadow-2xl shadow-samasa-blue/10 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center text-xs uppercase tracking-[0.3em]"
            >
              {isLoading ? (
                <div className="flex items-center space-x-4">
                  <div className="w-5 h-5 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Enter</span>
                  <ArrowRight className="ml-4 w-5 h-5 transition-transform group-hover:translate-x-2" />
                </>
              )}
            </button>

            <p className="text-xs text-slate-400 font-semibold text-center">
              Having trouble? Contact your Superadmin to verify your account status.
            </p>
          </form>

          <div className="mt-10 sm:mt-16 pt-8 sm:pt-10 border-t border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
                <ShieldCheck className="w-4 h-4" />
                <span>Protected Access</span>
              </div>

              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">
                CASS PORTAL
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-400 font-semibold">
              Only registered officers and superadmin accounts can sign in.
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 sm:bottom-12 flex items-center space-x-3 text-slate-300 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.45em] sm:tracking-[0.5em]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Secure Node</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
