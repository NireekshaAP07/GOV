import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  FileText,
  Search as SearchIcon,
  X,
} from "lucide-react";

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
  // The caller controls when this request repeats through its dependency list.
  useEffect(() => {
    void reload();
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
        <strong>Demo workspace</strong>
        <span className="demo-copy">
          {" "}
          Synthetic sample data is shown because the backend is unavailable.
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
  const kind =
    normalized.includes("approv") ||
    (normalized.includes("match") && !normalized.includes("review"))
      ? "status-good"
      : normalized.includes("pending") ||
          normalized.includes("review") ||
          normalized.includes("equivalent")
        ? "status-warm"
        : normalized.includes("reject") ||
            normalized.includes("conflict") ||
            normalized.includes("non-match")
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
  if (value == null) return <span className="muted">—</span>;
  const percent = Math.round(value * 100);
  return (
    <span
      className={`confidence-badge ${percent >= 95 ? "high" : percent >= 80 ? "medium" : "low"}`}
    >
      {percent}%
      {showLabel && (
        <small>
          {percent >= 95 ? "Strong" : percent >= 80 ? "Review" : "Investigate"}
        </small>
      )}
    </span>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  body = "Once materials are imported, your unified material records will appear here.",
  icon: Icon = FileText,
  action,
}: {
  title?: string;
  body?: string;
  icon?: typeof FileText;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={23} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-label="Loading">
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
      <SearchIcon size={17} />
      <input
        aria-label="Search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="icon-button clear-search"
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
    <div className="toast" role="status">
      <span className="toast-icon">
        <Check size={15} />
      </span>
      <span>{message}</span>
      <button
        className="icon-button"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
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
      <span>{label}</span>
      <span className="select-wrap">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">All {label.toLowerCase()}s</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={14} />
      </span>
    </label>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="inline-error">
      <AlertCircle size={17} />
      {message}
    </div>
  );
}
