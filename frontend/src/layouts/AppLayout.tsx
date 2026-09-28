import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  ClipboardCheck,
  FileUp,
  GitCompareArrows,
  Landmark,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Laptop,
  X,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useApiMode } from "../services/api";
import { onUnauthorized, useAuth } from "../services/auth";
import { DemoNotice } from "../components/common";
import { CommandPalette } from "../components/CommandPalette";
import { useTheme } from "../context/ThemeContext";

const navGroups = [
  {
    label: "Workspace",
    links: [
      { to: "/", label: "Overview", icon: BarChart3 },
      { to: "/materials", label: "Material Explorer", icon: Boxes },
      { to: "/import", label: "Import Data", icon: FileUp },
      { to: "/duplicates", label: "Duplicate Detection", icon: GitCompareArrows, badge: "Live" },
      { to: "/reviews", label: "AI Match Review", icon: ClipboardCheck, badge: "Pending", alert: true },
    ],
  },
  {
    label: "National Master",
    links: [
      { to: "/national-materials", label: "National Materials", icon: Landmark },
      { to: "/mappings", label: "CPSE Mappings", icon: GitCompareArrows },
      { to: "/procurement", label: "Procurement Signals", icon: Archive },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Governance",
    links: [
      { to: "/audit", label: "Audit & Lineage", icon: ShieldCheck },
    ],
  },
  {
    label: "System",
    links: [
      { to: "/help", label: "Help & Guidance", icon: CircleHelp },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const pageHierarchy: Record<string, { group: string; title: string }> = {
  "/": { group: "Workspace", title: "Overview & Metrics" },
  "/materials": { group: "Workspace", title: "Material Intelligence Explorer" },
  "/import": { group: "Workspace", title: "Data Ingestion Pipeline" },
  "/duplicates": { group: "Workspace", title: "Duplicate Clusters" },
  "/reviews": { group: "Workspace", title: "AI Match Review (Human Decision)" },
  "/national-materials": { group: "National Master", title: "Approved National Materials" },
  "/mappings": { group: "National Master", title: "Source-to-National Mappings" },
  "/procurement": { group: "National Master", title: "Collaborative Demand Signals" },
  "/analytics": { group: "National Master", title: "Catalog Intelligence Analytics" },
  "/audit": { group: "Governance", title: "Audit Trail & Lineage" },
  "/settings": { group: "System", title: "Platform Settings" },
  "/help": { group: "System", title: "Help & Technical Architecture" },
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = useApiMode();
  const { status, user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle write request 401 unauthorized
  useEffect(() => {
    return onUnauthorized(() => {
      navigate("/login", { state: { from: location.pathname }, replace: true });
    });
  }, [location.pathname, navigate]);

  const pathBase = `/${location.pathname.split("/")[1] || ""}` === "/"
    ? "/"
    : `/${location.pathname.split("/")[1]}`;

  const currentMeta = location.pathname.startsWith("/materials/")
    ? { group: "Workspace", title: "Source Material Detail" }
    : location.pathname.startsWith("/national-materials/")
      ? { group: "National Master", title: "National Material Specification" }
      : (pageHierarchy[pathBase] ?? { group: "Workspace", title: "Overview" });

  const authDisplay =
    status === "guest"
      ? null
      : {
          name: status === "disabled" ? "Reviewer Session" : user?.full_name || user?.username || "Authorized User",
          role: status === "disabled" ? "Local Development" : user?.role === "ADMIN" ? "National Administrator" : "Technical Reviewer",
        };

  const goToLogin = () => navigate("/login", { state: { from: location.pathname } });

  const notifications = [
    {
      id: "1",
      title: "Match suggestions ready for review",
      detail: "BHEL (BOLT-10021) & NTPC (MAT-98231) require human decision.",
      time: "10m ago",
      icon: Sparkles,
      link: "/reviews",
    },
    {
      id: "2",
      title: "Material batch ingested",
      detail: "NTPC CSV uploaded · 246 records parsed and fingerprinted.",
      time: "1h ago",
      icon: FileUp,
      link: "/materials",
    },
    {
      id: "3",
      title: "National code allocated",
      detail: "NMC-00000001 (Hex Bolt M16x50 SS304) approved.",
      time: "3h ago",
      icon: CheckCircle2,
      link: "/national-materials/1",
    },
  ];

  const SidebarContent = () => (
    <>
      <div className="sidebar-header">
        <div className="brand-wrapper">
          <div className="brand-logo-mark" title="National Material Master">
            <Landmark size={20} />
          </div>
          <div className="brand-text-block">
            <span className="brand-name">National Material</span>
            <span className="brand-tagline">One code. Shared clarity.</span>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      <div className="sidebar-workspace-pill">
        <div className="workspace-badge-icon">
          <ShieldCheck size={16} />
        </div>
        <div className="workspace-pill-info">
          <span className="workspace-pill-title">Central Master</span>
          <span className="workspace-pill-sub">All CPSE Enterprises</span>
        </div>
      </div>

      <nav className="sidebar-nav-container" aria-label="Main Navigation">
        {navGroups.map((group) => (
          <div className="nav-section" key={group.label}>
            <div className="nav-section-title">{group.label}</div>
            {group.links.map(({ to, label, icon: Icon, badge, alert }) => (
              <NavLink
                to={to}
                end={to === "/"}
                key={to}
                title={sidebarCollapsed ? label : undefined}
                className={({ isActive }) => `nav-item-link ${isActive ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <div className="nav-item-icon">
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <span className="nav-item-label">{label}</span>
                {badge && (
                  <span className={`nav-item-badge ${alert ? "alert" : ""}`}>
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-profile-card">
          {status === "guest" ? (
            <button
              type="button"
              className="button button-soft"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={goToLogin}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          ) : (
            <>
              <div className="user-avatar-circle">
                {authDisplay?.name.charAt(0).toUpperCase()}
              </div>
              <div className="profile-copy">
                <span className="profile-name">{authDisplay?.name}</span>
                <span className="profile-role">{authDisplay?.role}</span>
              </div>
              {status === "authenticated" && (
                <button
                  type="button"
                  className="sidebar-action-btn"
                  title="Sign out"
                  onClick={logout}
                  aria-label="Sign out"
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

      {/* Desktop Persistent Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileOpen && (
        <div className="mobile-scrim" onClick={() => setMobileOpen(false)}>
          <div
            className="mobile-sidebar-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px 0" }}>
              <button
                type="button"
                className="topbar-icon-btn"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation drawer"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main App Content Shell */}
      <div className={`main-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-nav-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open mobile navigation"
            >
              <Menu size={18} />
            </button>

            <nav className="topbar-breadcrumbs" aria-label="Breadcrumb">
              <span className="breadcrumb-root">
                <Landmark size={14} /> National Material Master
              </span>
              <span className="breadcrumb-divider">/</span>
              <span>{currentMeta.group}</span>
              <span className="breadcrumb-divider">/</span>
              <span className="breadcrumb-current">{currentMeta.title}</span>
            </nav>
          </div>

          <div className="topbar-right">
            {/* Global Search trigger for Command Palette */}
            <button
              type="button"
              className="global-search-trigger"
              onClick={() => setCommandOpen(true)}
              aria-label="Open global search (Ctrl+K)"
            >
              <Search size={15} />
              <span>Search materials, codes, CPSEs…</span>
              <kbd className="shortcut-kbd">⌘K</kbd>
            </button>

            {/* Notification Center */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className={`topbar-icon-btn ${notificationsOpen ? "active" : ""}`}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setThemeMenuOpen(false);
                }}
                aria-label="Open notifications"
                title="Notifications"
              >
                <Bell size={17} />
                <span className="notification-unread-dot" />
              </button>

              {notificationsOpen && (
                <div className="popover-menu">
                  <div className="popover-header">
                    <h4>Notifications</h4>
                    <span style={{ fontSize: "11px", color: "var(--brand-primary)", fontWeight: 600 }}>
                      3 updates
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {notifications.map((n) => {
                      const Icon = n.icon;
                      return (
                        <div
                          key={n.id}
                          className="notification-item-card"
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate(n.link);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="notif-icon-box" style={{ background: "var(--brand-light)", color: "var(--brand-primary)" }}>
                            <Icon size={16} />
                          </div>
                          <div className="notif-content">
                            <b>{n.title}</b>
                            <span>{n.detail}</span>
                            <time>{n.time}</time>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button & Menu */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className={`topbar-icon-btn ${themeMenuOpen ? "active" : ""}`}
                onClick={() => {
                  setThemeMenuOpen(!themeMenuOpen);
                  setNotificationsOpen(false);
                }}
                aria-label="Change theme"
                title={`Current theme: ${theme} (${resolvedTheme})`}
              >
                {resolvedTheme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
              </button>

              {themeMenuOpen && (
                <div className="popover-menu" style={{ width: "240px" }}>
                  <div className="popover-header">
                    <h4>Theme Appearance</h4>
                  </div>
                  <div className="theme-options-grid">
                    <button
                      type="button"
                      className={`theme-option-btn ${theme === "light" ? "active" : ""}`}
                      onClick={() => {
                        setTheme("light");
                        setThemeMenuOpen(false);
                      }}
                    >
                      <Sun size={18} />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      className={`theme-option-btn ${theme === "dark" ? "active" : ""}`}
                      onClick={() => {
                        setTheme("dark");
                        setThemeMenuOpen(false);
                      }}
                    >
                      <Moon size={18} />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      className={`theme-option-btn ${theme === "system" ? "active" : ""}`}
                      onClick={() => {
                        setTheme("system");
                        setThemeMenuOpen(false);
                      }}
                    >
                      <Laptop size={18} />
                      <span>System</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User status or login button */}
            {status === "guest" ? (
              <button
                type="button"
                className="button button-soft"
                onClick={goToLogin}
                style={{ height: "36px", padding: "0 12px" }}
              >
                <LogIn size={14} />
                <span>Sign in</span>
              </button>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div className="user-avatar-circle" style={{ width: "26px", height: "26px", fontSize: "11px" }}>
                  {authDisplay?.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, lineHeight: 1.2, color: "var(--text-primary)" }}>
                    {authDisplay?.name}
                  </span>
                  <span style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>
                    {authDisplay?.role}
                  </span>
                </div>
                {status === "authenticated" && (
                  <button
                    type="button"
                    onClick={logout}
                    title="Sign out"
                    aria-label="Sign out"
                    style={{ padding: "4px", color: "var(--text-muted)", marginLeft: "4px" }}
                  >
                    <LogOut size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="content-area" id="main-content" tabIndex={-1}>
          {isDemo && <DemoNotice />}
          <Outlet />
        </main>

        {/* Enterprise Government Footer */}
        <footer className="app-footer">
          <span>
            <Landmark size={14} style={{ color: "var(--brand-primary)" }} />
            National Unified Material Master Framework · Ministry of Heavy Industries & CPSE Consortium
          </span>
          <span>
            <Activity size={14} style={{ color: "var(--brand-primary)" }} />
            Deterministic AI Matching Engine · Human Governance Required
          </span>
        </footer>
      </div>

      {/* Global Interactive Command Palette */}
      <CommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
      />
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
  return (
    <form
      className="search-field"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Search size={16} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search materials, codes or specifications…"
      />
    </form>
  );
}
