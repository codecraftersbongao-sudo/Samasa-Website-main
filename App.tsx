// App.tsx
import React, { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

// Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import WelcomeIntro from "./components/WelcomeIntro";
import { User, UserRole } from "./types";

// Pages
import Home from "./pages/Home";
import About from "./pages/About";
import Officers from "./pages/Officers";
import Budget from "./pages/Budget";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import AdminDashboard from "./pages/AdminDashboard";
import LegislativeHub from "./pages/LegislativeHub";

const LS_USER_KEY = "samasa_user";

// Helper: Resets scroll to top when changing routes
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// ✅ Safe load user from localStorage (prevents white screen crash)
const safeLoadUser = (): User | null => {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Minimal validation so Header/Sidebar won’t crash
    const role = parsed?.role;
    const validRole =
      role === UserRole.SUPERADMIN || role === UserRole.OFFICER || role === UserRole.STUDENT;

    const ok =
      typeof parsed?.id === "string" &&
      typeof parsed?.name === "string" &&
      validRole;

    if (!ok) {
      localStorage.removeItem(LS_USER_KEY);
      return null;
    }

    return parsed as User;
  } catch (err) {
    localStorage.removeItem(LS_USER_KEY);
    // optional: helps debug in dev
    console.warn("Invalid samasa_user in localStorage. Cleared.", err);
    return null;
  }
};

const saveUser = (user: User) => localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
const clearUser = () => localStorage.removeItem(LS_USER_KEY);

/** ✅ Role-protected wrapper */
const RequireRole: React.FC<{
  user: User | null;
  allow: UserRole[];
  children: React.ReactElement;
}> = ({ user, allow, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

/** ✅ Authenticated shell swaps sidebar on /admin */
const AuthenticatedShell: React.FC<{
  user: User;
  onLogout: () => void;
}> = ({ user, onLogout }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="flex flex-col">
      <Header user={user} onLogout={onLogout} />

      {isAdminRoute ? (
        <div className="pt-20 sm:pt-24">
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireRole user={user} allow={[UserRole.SUPERADMIN]}>
                  <AdminDashboard user={user} />
                </RequireRole>
              }
            />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      ) : (
        <div className="flex pt-20 sm:pt-24">
          <Sidebar user={user} onLogout={onLogout} />

          <main className="flex-grow ml-0 lg:ml-72 p-6 sm:p-10 lg:p-12 bg-slate-50 min-h-screen">
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/about" element={<About currentUser={user} />} />
              <Route path="/officers" element={<Officers currentUser={user} />} />
              <Route path="/budget" element={<Budget user={user} isEditable={true} />} />
              <Route path="/proposals" element={<LegislativeHub user={user} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    setCurrentUser(safeLoadUser());
  }, []);

  useEffect(() => {
    if (!showWelcome) return;
    const timer = setTimeout(() => setShowWelcome(false), 5000);
    return () => clearTimeout(timer);
  }, [showWelcome]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    saveUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    clearUser();
  };

  if (showWelcome) {
    return <WelcomeIntro onDone={() => setShowWelcome(false)} totalMs={5000} />;
  }

  return (
    <Router>
      <ScrollToTop />
      <div className="bg-white min-h-screen">
        {currentUser ? (
          <AuthenticatedShell user={currentUser} onLogout={handleLogout} />
        ) : (
          <Routes>
            <Route path="/" element={<LandingPage />} />

            {/* ✅ PUBLIC VIEW */}
            <Route path="/about" element={<About currentUser={null} />} />
            <Route path="/officers" element={<Officers currentUser={null} />} />

            <Route path="/login" element={<Login onLogin={handleLogin} />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  );
};

export default App;
