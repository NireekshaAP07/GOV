import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileUp,
  GitCompareArrows,
  Landmark,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { useApiMode } from "../services/api";
import { onUnauthorized, useAuth } from "../services/auth";
import { DemoNotice, SearchField } from "../components/common";

const navGroups = [
  {
    label: "Workspace",
    links: [
      { to: "/", label: "Overview", icon: BarChart3 },
      { to: "/materials", label: "Materials", icon: Boxes },
      { to: "/import", label: "Import data", icon: FileUp },
      {
        to: "/duplicates",
        label: "Duplicate detection",
        icon: GitCompareArrows,
      },
      { to: "/reviews", label: "AI match review", icon: ClipboardCheck },
    ],
  },
  {
    label: "National master",
    links: [
      {
        to: "/national-materials",
        label: "National materials",
        icon: Landmark,
      },
      { to: "/mappings", label: "Mappings", icon: GitCompareArrows },
      { to: "/procurement", label: "Procurement opportunities", icon: Archive },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Governance",
    links: [{ to: "/audit", label: "Audit & governance", icon: ShieldCheck }],
  },
];

const pageNames: Record<string, string> = {
  "/": "Overview",
  "/materials": "Materials",
  "/import": "Import data",
  "/duplicates": "Duplicate detection",
  "/reviews": "AI Match Review",
  "/national-materials": "National Material Master",
  "/mappings": "Mappings",
  "/procurement": "Procurement opportunities",
  "/analytics": "Analytics",
  "/audit": "Audit & Governance",
  "/settings": "Settings",
  "/help": "Help",
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = useApiMode();
  const { status, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    // A write request whose session turned out to be invalid (expired
    // refresh token, revoked user, etc) redirects here to /login rather than
    // leaving the reviewer looking at a raw error.
    return onUnauthorized(() => {
      navigate("/login", { state: { from: location.pathname }, replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  const pathBase =
    `/${location.pathname.split("/")[1] || ""}` === "/"
      ? "/"
      : `/${location.pathname.split("/")[1]}`;
  const pageTitle = location.pathname.startsWith("/materials/")
    ? "Material detail"
    : location.pathname.startsWith("/national-materials/")
      ? "National material detail"
      : (pageNames[pathBase] ?? "Overview");
  const authDisplay =
    status === "guest"
      ? null
      : {
          name:
            status === "disabled"
              ? "Local session"
              : user?.full_name || user?.username || "Account",
          role:
            status === "disabled"
              ? "Auth disabled"
              : user?.role === "ADMIN"
                ? "Administrator"
                : "Reviewer",
        };
  const goToLogin = () => navigate("/login", { state: { from: location.pathname } });
  const SidebarContent = () => (
    <>
      <div className="brand">
        <div className="brand-mark">
          <Landmark size={21} />
        </div>
        <div>
          <strong>National Material</strong>
          <span>One code. Shared clarity.</span>
        </div>
        <button
          className="icon-button sidebar-close"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        >
          <X size={18} />
        </button>
      </div>
      <div className="workspace-pill">
        <span className="workspace-seal">
          <Landmark size={15} />
        </span>
        <span>
          <b>National workspace</b>
          <small>All CPSEs</small>
        </span>
        <ChevronDown size={15} className="workspace-chevron" />
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.links.map(({ to, label, icon: Icon }) => (
              <NavLink
                onClick={() => setMobileOpen(false)}
                to={to}
                end={to === "/"}
                key={to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tools">
          <NavLink to="/help" className="nav-link">
            <CircleHelp size={18} />
            <span>Help & guidance</span>
          </NavLink>
          <NavLink to="/settings" className="nav-link">
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </div>
        <div className="profile-card">
          {status === "guest" ? (
            <button className="auth-guest-pill" onClick={goToLogin}>
              <LogIn size={14} />
              <span>Sign in</span>
            </button>
          ) : (
            <>
              <div className="avatar">{authDisplay?.name.charAt(0).toUpperCase()}</div>
              <div className="profile-copy">
                <b>{authDisplay?.name}</b>
                <span>{authDisplay?.role}</span>
              </div>
              {status === "authenticated" && (
                <button
                  className="icon-button profile-more"
                  aria-label="Sign out"
                  title="Sign out"
                  onClick={logout}
                >
                  <LogOut size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
  return (
    <div className="app-frame">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <aside className="sidebar">
        <SidebarContent />
      </aside>
      {mobileOpen && (
        <div className="mobile-scrim" onClick={() => setMobileOpen(false)}>
          <aside
            className="sidebar mobile-sidebar"
            onClick={(event) => event.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>
            <div className="breadcrumbs">
              <span>National Material Master</span>
              <span className="breadcrumb-slash">/</span>
              <b>{pageTitle}</b>
            </div>
          </div>
          <div className="topbar-actions">
            <form
              className="top-search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(`/materials?q=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={16} />
              <input
                aria-label="Global search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search anything…"
              />
              <kbd>⌘ K</kbd>
            </form>
            <div className="notification-wrap">
              <button
                className={`icon-button notification-button ${notificationsOpen ? "active" : ""}`}
                aria-label="Notifications"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={18} />
                <i />
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <b>You're all caught up</b>
                  <span>New match reviews will appear here.</span>
                </div>
              )}
            </div>
            {status === "guest" ? (
              <button className="auth-guest-pill" onClick={goToLogin}>
                <LogIn size={14} />
                <span>Sign in</span>
              </button>
            ) : (
              <div className="top-profile">
                <div className="avatar avatar-small">{authDisplay?.name.charAt(0).toUpperCase()}</div>
                <div>
                  <b>{authDisplay?.name}</b>
                  <span>{authDisplay?.role}</span>
                </div>
                {status === "authenticated" ? (
                  <button className="icon-button" aria-label="Sign out" title="Sign out" onClick={logout}>
                    <LogOut size={14} />
                  </button>
                ) : (
                  <ChevronDown size={14} />
                )}
              </div>
            )}
          </div>
        </header>
        <main className="content-area" id="main-content" tabIndex={-1}>
          {isDemo && <DemoNotice />}
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>National Unified Material Master Framework</span>
          <span>
            <Activity size={13} /> Built for transparent, human-reviewed
            standardization
          </span>
        </footer>
      </div>
    </div>
  );
}

export function GlobalSearchBox({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return <SearchField value={value} onChange={onChange} onSubmit={onSubmit} />;
}
