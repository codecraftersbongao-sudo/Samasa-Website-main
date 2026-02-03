import React, { useEffect, useState } from "react";
import {
  LogOut,
  ShieldCheck,
  User as UserIcon,
  X,
  AlertTriangle,
  Menu,
} from "lucide-react";
import { User } from "../types";

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  if (!user) return null;

  const handleOpenSidebar = () => {
    // Sidebar listens for this event and opens on mobile
    window.dispatchEvent(new CustomEvent("samasa:toggle-sidebar"));
  };

  const handleFinalLogout = () => {
    setIsTerminating(true);
    // Simulate a brief secure session termination
    window.setTimeout(() => {
      onLogout();
    }, 800);
  };

  // ESC closes modal (if not terminating)
  useEffect(() => {
    if (!showConfirm) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isTerminating) setShowConfirm(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showConfirm, isTerminating]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-xl shadow-black/5 z-[60] flex items-center justify-between px-4 sm:px-6 lg:px-12 h-20 sm:h-24">
        {/* Left */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Mobile: Menu button */}
          <button
            type="button"
            onClick={handleOpenSidebar}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition"
            aria-label="Open menu"
            title="Open menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 cursor-default shrink-0">
            <img
              src="/assets/samasa-logo.png"
              alt="SAMASA Logo"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>

          <div className="flex flex-col min-w-0">
            <h1 className="text-base sm:text-xl lg:text-2xl font-black text-samasa-black tracking-tighter leading-none uppercase truncate">
              SAMASA <span className="text-samasa-blue">CASS Portal</span>
            </h1>
            <span className="hidden sm:block text-[9px] font-black text-slate-400 tracking-[0.4em] uppercase mt-1 truncate">
              Official Governance Environment
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 sm:gap-6 lg:gap-10">
          {/* User badge (hide on very small screens) */}
          <div className="hidden sm:flex items-center space-x-4 px-4 lg:px-6 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:border-samasa-blue/30">
            <div className="w-8 h-8 rounded-full bg-samasa-blue flex items-center justify-center text-white transition-transform group-hover:scale-110">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-samasa-black uppercase leading-tight">
                {user.name}
              </span>
              <div className="flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-samasa-blue" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 sm:gap-3 px-4 sm:px-7 lg:px-8 py-3 sm:py-4 bg-samasa-red text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-samasa-black transition-all shadow-xl shadow-samasa-red/20 active:scale-95 group"
            aria-label="Exit session"
            title="Exit session"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            <span className="hidden sm:inline">Exit Session</span>
          </button>
        </div>
      </header>

      {/* Modern Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-samasa-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => !isTerminating && setShowConfirm(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] sm:rounded-[3rem] p-7 sm:p-10 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            {!isTerminating && (
              <button
                onClick={() => setShowConfirm(false)}
                className="absolute top-6 right-6 sm:top-8 sm:right-8 p-2 text-slate-300 hover:text-samasa-black hover:bg-slate-50 rounded-full transition-all"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            )}

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-samasa-red/10 rounded-full flex items-center justify-center mb-6 sm:mb-8">
                <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-samasa-red" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-samasa-black mb-3 sm:mb-4 tracking-tight">
                Terminate Session?
              </h2>
              <p className="text-slate-500 font-medium leading-relaxed mb-7 sm:mb-10 text-sm sm:text-base">
                You are about to exit the secure administrative environment. Ensure all legislative changes and budget entries are synchronized before proceeding.
              </p>

              <div className="w-full flex flex-col space-y-3 sm:space-y-4">
                <button
                  onClick={handleFinalLogout}
                  disabled={isTerminating}
                  className="w-full py-4 sm:py-5 bg-samasa-red text-white font-black rounded-2xl hover:bg-samasa-black transition-all shadow-xl shadow-samasa-red/20 active:scale-95 flex items-center justify-center space-x-3 uppercase tracking-widest text-[10px] sm:text-[11px]"
                >
                  {isTerminating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Purging Session Tokens...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>Confirm Exit</span>
                    </>
                  )}
                </button>

                {!isTerminating && (
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="w-full py-4 sm:py-5 bg-slate-50 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-widest text-[10px] sm:text-[11px]"
                  >
                    Return to Portal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
