import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Info,
  Users,
  Wallet,
  FileText,
  ChevronRight,
  Settings,
  X,
} from "lucide-react";
import { User, UserRole } from "../types";

interface SidebarProps {
  user: User | null;
  onLogout: () => void; // kept for compatibility (not used here)
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const links = useMemo(
    () => [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
      { name: "SAMASA About", path: "/about", icon: Info },
      { name: "Meet the Officers", path: "/officers", icon: Users },
      { name: "Budget Tracker", path: "/budget", icon: Wallet },
      { name: "Proposals & Projects", path: "/proposals", icon: FileText },
    ],
    []
  );

  const isSuperAdmin = user.role === UserRole.SUPERADMIN;

  // Listen to Header toggle
  useEffect(() => {
    const onToggle = () => setMobileOpen((v) => !v);
    const onClose = () => setMobileOpen(false);

    window.addEventListener("samasa:toggle-sidebar", onToggle as any);
    window.addEventListener("samasa:close-sidebar", onClose as any);

    return () => {
      window.removeEventListener("samasa:toggle-sidebar", onToggle as any);
      window.removeEventListener("samasa:close-sidebar", onClose as any);
    };
  }, []);

  // Close drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const NavItems = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="space-y-2">
      {links.map((link) => (
        <NavLink
          key={link.path}
          to={link.path}
          onClick={onItemClick}
          className={({ isActive }) => `
            flex items-center justify-between px-6 py-5 rounded-2xl transition-all group
            ${
              isActive
                ? "bg-samasa-blue text-white shadow-xl shadow-samasa-blue/20"
                : "text-slate-500 hover:bg-white/5 hover:text-white"
            }
          `}
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center space-x-4">
                <link.icon className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {link.name}
                </span>
              </div>
              <ChevronRight
                className={`w-4 h-4 transition-all group-hover:translate-x-1 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  // ---------- Desktop Sidebar ----------
  // Visible only on lg+
  const DesktopSidebar = () => (
    <aside className="hidden lg:flex w-72 bg-samasa-black fixed left-0 top-24 h-[calc(100vh-6rem)] flex-col border-r border-white/5 z-50 overflow-y-auto">
      <div className="p-8 flex flex-col h-full">
        <div>
          <div className="mb-10 px-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">
              Command Menu
            </p>
            <div className="h-[1px] w-full bg-white/5" />
          </div>

          <NavItems />
        </div>

        {/* Bottom Controls */}
        <div className="mt-auto pt-10">
          {isSuperAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `
                w-full flex items-center justify-center
                h-14 rounded-2xl transition-all
                border border-white/10
                ${
                  isActive
                    ? "bg-samasa-blue text-white shadow-xl shadow-samasa-blue/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }
              `}
              title="Admin Control"
              aria-label="Admin Control"
            >
              <Settings className="w-6 h-6" />
            </NavLink>
          )}
        </div>
      </div>
    </aside>
  );

  // ---------- Mobile Drawer ----------
  const MobileDrawer = () =>
    mobileOpen ? (
      <div className="fixed inset-0 z-[90] lg:hidden">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Drawer */}
        <aside className="absolute left-0 top-0 bottom-0 w-72 bg-samasa-black border-r border-white/10 shadow-2xl flex flex-col">
          <div className="h-20 px-5 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10">
                <img
                  src="/assets/samasa-logo.png"
                  alt="SAMASA Logo"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black tracking-tight text-sm uppercase">
                  SAMASA
                </span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                  Menu
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="w-10 h-10 rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 active:scale-95 transition flex items-center justify-center"
              aria-label="Close menu"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <div className="mb-8 px-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">
                Command Menu
              </p>
              <div className="h-[1px] w-full bg-white/5" />
            </div>

            <NavItems onItemClick={() => setMobileOpen(false)} />
          </div>

          <div className="mt-auto p-6 border-t border-white/5">
            {isSuperAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `
                  w-full flex items-center justify-center
                  h-14 rounded-2xl transition-all
                  border border-white/10
                  ${
                    isActive
                      ? "bg-samasa-blue text-white shadow-xl shadow-samasa-blue/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }
                `}
                title="Admin Control"
                aria-label="Admin Control"
              >
                <Settings className="w-6 h-6" />
              </NavLink>
            )}
          </div>
        </aside>
      </div>
    ) : null;

  return (
    <>
      <DesktopSidebar />
      <MobileDrawer />
    </>
  );
};

export default Sidebar;
