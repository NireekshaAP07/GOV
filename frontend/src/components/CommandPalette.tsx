import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  BarChart3,
  Boxes,
  CircleHelp,
  ClipboardCheck,
  FileUp,
  GitCompareArrows,
  Landmark,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Action" | "Master Data";
  path?: string;
  icon: typeof Search;
  action?: () => void;
  keywords?: string;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: CommandItem[] = [
    {
      id: "overview",
      title: "Overview & Command Center",
      category: "Navigation",
      path: "/",
      icon: BarChart3,
      keywords: "dashboard metrics kpi",
    },
    {
      id: "materials",
      title: "Material Intelligence Explorer",
      category: "Navigation",
      path: "/materials",
      icon: Boxes,
      keywords: "source records catalog search cpse",
    },
    {
      id: "import",
      title: "Import Material Data",
      category: "Action",
      path: "/import",
      icon: FileUp,
      keywords: "upload csv excel file ingest",
    },
    {
      id: "duplicates",
      title: "Duplicate Detection Clusters",
      category: "Navigation",
      path: "/duplicates",
      icon: GitCompareArrows,
      keywords: "clusters equivalent records candidates",
    },
    {
      id: "reviews",
      title: "AI Match Review (Human-in-the-Loop)",
      category: "Navigation",
      path: "/reviews",
      icon: ClipboardCheck,
      keywords: "approve reject recommendations decision",
    },
    {
      id: "national",
      title: "National Material Master (NMC)",
      category: "Master Data",
      path: "/national-materials",
      icon: Landmark,
      keywords: "nmc national codes approved identities",
    },
    {
      id: "mappings",
      title: "CPSE Source-to-National Mappings",
      category: "Master Data",
      path: "/mappings",
      icon: GitCompareArrows,
      keywords: "lineage relationships legacy codes",
    },
    {
      id: "procurement",
      title: "Procurement Opportunities",
      category: "Navigation",
      path: "/procurement",
      icon: Archive,
      keywords: "spend demand consolidation suppliers",
    },
    {
      id: "analytics",
      title: "Material Master Analytics",
      category: "Navigation",
      path: "/analytics",
      icon: BarChart3,
      keywords: "charts coverage distributions",
    },
    {
      id: "audit",
      title: "Audit, Lineage & Governance",
      category: "Navigation",
      path: "/audit",
      icon: ShieldCheck,
      keywords: "traceability logs history accountability",
    },
    {
      id: "help",
      title: "Help & Guidance Framework",
      category: "Navigation",
      path: "/help",
      icon: CircleHelp,
      keywords: "documentation faq guide instructions",
    },
    {
      id: "settings",
      title: "System & Workspace Settings",
      category: "Navigation",
      path: "/settings",
      icon: Settings,
      keywords: "preferences dark theme thresholds",
    },
  ];

  const filtered = items.filter((item) => {
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.keywords && item.keywords.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          if (selected.path) navigate(selected.path);
          if (selected.action) selected.action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="command-palette-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Menu"
    >
      <div
        className="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="command-search-header">
          <Search size={18} />
          <input
            className="command-search-input"
            autoFocus
            placeholder="Type a page, command, or search term…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="clear-search"
            onClick={onClose}
            aria-label="Close command palette"
          >
            <X size={16} />
          </button>
        </div>

        <div className="command-results-list">
          {filtered.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              No commands found for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`command-item ${isSelected ? "selected" : ""}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    if (item.path) navigate(item.path);
                    if (item.action) item.action();
                    onClose();
                  }}
                >
                  <Icon size={16} className="command-item-icon" />
                  <span style={{ flex: 1 }}>{item.title}</span>
                  <span
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-faint)",
                      background: "var(--bg-subtle)",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-xs)",
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="command-footer">
          <span>Navigate with <kbd className="shortcut-kbd">↑</kbd> <kbd className="shortcut-kbd">↓</kbd></span>
          <span>Select with <kbd className="shortcut-kbd">↵ Enter</kbd></span>
          <span>Close with <kbd className="shortcut-kbd">Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
