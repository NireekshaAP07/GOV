import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileText,
  Search as SearchIcon,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload, setData };
}

export function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="title-actions">{actions}</div>}
    </div>
  );
}

export function DemoNotice() {
  return (
    <div className="demo-notice">
      <span className="demo-dot" />
      <span>
        <strong>Demo workspace active:</strong>
        <span className="demo-copy">
          {" "}
          Operating on synthetic sample CPSE dataset because backend API is disconnected. Actions remain localized in memory.
        </span>
      </span>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll("_", "-");
  const label = status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const isGood =
    normalized.includes("approv") ||
    (normalized.includes("match") && !normalized.includes("review") && !normalized.includes("non")) ||
    normalized.includes("functionally-equiv");

  const isWarm =
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("investigate") ||
    normalized.includes("potential");

  const isBad =
    normalized.includes("reject") ||
    normalized.includes("conflict") ||
    normalized.includes("non-match");

  const kind = isGood
    ? "status-good"
    : isWarm
      ? "status-warm"
      : isBad
        ? "status-bad"
        : "status-neutral";

  return (
    <span className={`status-badge ${kind}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

export function ConfidenceBadge({
  value,
  showLabel = false,
}: {
  value?: number;
  showLabel?: boolean;
}) {
  if (value == null) return <span className="muted" style={{ fontFamily: "var(--font-mono)" }}>—</span>;
  const percent = Math.round(value * 100);
  const tier = percent >= 95 ? "high" : percent >= 80 ? "medium" : "low";

  return (
    <span className={`confidence-badge ${tier}`}>
      <span>{percent}%</span>
      {showLabel && (
        <small>
          {percent >= 95 ? "Strong" : percent >= 80 ? "Review" : "Investigate"}
        </small>
      )}
    </span>
  );
}

export function EmptyState({
  title = "No data found",
  body = "Once records are imported and processed, they will appear here.",
  icon: Icon = FileText,
  action,
}: {
  title?: string;
  body?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-label="Loading content">
      <div className="skeleton skeleton-heading" />
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton skeleton-row" key={i} />
      ))}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search materials, codes or specifications…",
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}) {
  return (
    <form
      className="search-field"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <SearchIcon size={16} />
      <input
        aria-label="Search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="clear-search"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X size={14} />
        </button>
      )}
    </form>
  );
}

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="toast-viewport" style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 120 }}>
      <div className="toast-card toast-success" role="status">
        <div className="toast-icon-wrap" style={{ color: "var(--brand-primary)" }}>
          <Check size={18} />
        </div>
        <div className="toast-body">
          <strong className="toast-title">{message}</strong>
        </div>
        <button
          type="button"
          className="toast-close-btn"
          onClick={onClose}
          aria-label="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-select">
      <span className="select-wrap">
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>{label}:</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Filter by ${label}`}
        >
          <option value="">All {label}s</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
      </span>
    </label>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="inline-error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  );
}

export function NationalJourney() {
  const steps = [
    { num: "01", name: "Import", sub: "Preserve CPSE legacy codes" },
    { num: "02", name: "Normalize", sub: "Standardize units & text" },
    { num: "03", name: "Extract", sub: "Fingerprint technical specs" },
    { num: "04", name: "Compare", sub: "Deterministic attribute match" },
    { num: "05", name: "Review", sub: "Human-in-the-loop decision" },
    { num: "06", name: "Unify", sub: "Assign National Material Code" },
  ];

  return (
    <div className="journey-strip">
      <div>
        <span className="journey-kicker">
          <Sparkles size={14} /> National Material Lifecycle
        </span>
        <strong>From fragmented CPSE records to unified national clarity.</strong>
      </div>
      <div className="journey-steps">
        {steps.map((st, i) => (
          <div key={st.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className={`journey-step-badge ${i === 4 ? "active" : ""}`} title={st.sub}>
              <small style={{ opacity: 0.7, fontFamily: "var(--font-mono)" }}>{st.num}</small>
              <span>{st.name}</span>
            </span>
            {i < steps.length - 1 && <i />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "emerald",
  change,
  direction = "up",
  link,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone?: "emerald" | "blue" | "amber" | "purple" | "cyan";
  change?: string;
  direction?: "up" | "down" | "flat";
  link?: string;
}) {
  const content = (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon ${tone}`}>
          <Icon size={19} />
        </div>
        {change && (
          <span className={`stat-change ${direction}`}>
            {direction === "up" ? (
              <ArrowUpRight size={13} />
            ) : direction === "down" ? (
              <ArrowDownRight size={13} />
            ) : null}
            {change}
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} style={{ display: "contents" }}>
        {content}
      </Link>
    );
  }

  return content;
}
