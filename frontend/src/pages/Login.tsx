import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Landmark, LogIn, TriangleAlert } from "lucide-react";
import { useAuth } from "../services/auth";

export default function Login() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If auth is disabled on the backend, there is no login concept at all --
  // send the visitor straight back in rather than showing a dead-end form.
  if (status === "disabled" || status === "authenticated") {
    const redirectTo = (location.state as { from?: string } | null)?.from || "/";
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      const redirectTo = (location.state as { from?: string } | null)?.from || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card panel">
        <div className="auth-brand">
          <div className="brand-mark">
            <Landmark size={21} />
          </div>
          <div>
            <strong>National Material</strong>
            <span>One code. Shared clarity.</span>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="muted">
          Sign in to import data, trigger matching, and record review
          decisions. Anyone can still browse dashboards without signing in.
        </p>
        <form onSubmit={onSubmit} className="auth-form">
          <label className="field-label">
            Username
            <input
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="field-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <div className="inline-error" role="alert">
              <TriangleAlert size={14} />
              <span>{error}</span>
            </div>
          )}
          <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? <span className="mini-spinner" /> : <LogIn size={15} />}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
