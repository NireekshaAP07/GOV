import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  GitCompareArrows,
  Info,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import {
  ConfidenceBadge,
  EmptyState,
  InlineError,
  LoadingSkeleton,
  PageTitle,
  StatusBadge,
} from "../components/common";
import { useToast } from "../context/ToastContext";
import type { ReviewItem } from "../types";
import { humanize } from "./Materials";

export default function Review() {
  const [params] = useSearchParams();
  const { success, warning, error: toastError } = useToast();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [comment, setComment] = useState("");
  const [standardDescription, setStandardDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    action: "approve" | "reject" | "modify" | "escalate";
    title: string;
    message: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await api.reviews();
      setReviews(result);
      const requested = Number(params.get("reviewId"));
      setSelectedId((old) =>
        requested && result.some((item) => item.review_id === requested)
          ? requested
          : old && result.some((item) => item.review_id === old)
            ? old
            : (result[0]?.review_id ?? null),
      );
    } catch (e) {
      setReviews([]);
      setSelectedId(null);
      setLoadError(
        e instanceof Error ? e.message : "Could not load review queue",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = reviews.find((item) => item.review_id === selectedId);

  const executeDecision = async (
    decision: "approve" | "reject" | "modify" | "escalate",
  ) => {
    if (!current) return;
    setBusy(true);
    setConfirmModal(null);

    try {
      if (decision === "escalate") {
        warning(
          "Review Escalated",
          `Review #${current.review_id} has been flagged for Technical Metallurgy Committee evaluation.`,
        );
        setComment("");
        setBusy(false);
        return;
      }

      const result = await api.decideReview(
        current.review_id,
        decision,
        "Nireeksha (Certified Reviewer)",
        comment,
        standardDescription || undefined,
      );

      if (decision === "reject") {
        warning(
          "Candidate Match Rejected",
          `Match #${current.review_id} rejected. Records remain separate under their local CPSE identities.`,
        );
      } else {
        success(
          "National Material Code Allocated",
          `Approved and registered as ${result.national_code ?? "NMC-00000001"}. CPSE mappings established.`,
        );
      }

      setComment("");
      setStandardDescription("");
      await load();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Review decision could not be recorded";
      toastError("Decision Failed", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="HUMAN-IN-THE-LOOP VERIFICATION"
        title="AI Match Review & Governance"
        description="Inspect deterministic attribute evidence, evaluate potential conflicts and certify whether cross-CPSE records share a single national identity."
        actions={
          <span className="approval-note">
            <UserCheck size={16} /> Human Certification Mandatory
          </span>
        }
      />

      {loadError && <InlineError message={loadError} />}

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : loadError ? null : !current ? (
        <div className="panel review-empty">
          <EmptyState
            icon={CheckCircle2}
            title="Review queue is completely clear"
            body="All pending candidate matches have been reviewed and decided. New suggestions will populate as materials are ingested."
            action={
              <Link to="/materials" className="button button-primary">
                Browse Material Explorer <ArrowRight size={14} />
              </Link>
            }
          />
        </div>
      ) : (
        <div className="review-workspace">
          {/* Left Column: Review Queue */}
          <aside className="panel review-queue">
            <div className="queue-heading">
              <div>
                <span className="eyebrow">PENDING QUEUE</span>
                <h2>Candidate Matches</h2>
              </div>
              <span className="queue-count">{reviews.length}</span>
            </div>

            <p className="queue-caption">
              AI recommendations are advisory decision-support. Source records remain unchanged until certified.
            </p>

            <div className="queue-list">
              {reviews.map((item) => (
                <button
                  type="button"
                  key={item.review_id}
                  className={`queue-item ${item.review_id === selectedId ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedId(item.review_id);
                    setComment("");
                    setStandardDescription("");
                  }}
                >
                  <div className="queue-item-top">
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      Review #{item.review_id}
                    </span>
                    <ConfidenceBadge value={item.match.final_score} />
                  </div>

                  <b>
                    <span>{item.material_a.cpse_code} ({item.material_a.legacy_material_code})</span>
                    <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
                    <span>{item.material_b.cpse_code} ({item.material_b.legacy_material_code})</span>
                  </b>

                  <span className="queue-description" title={item.material_a.normalized_description}>
                    {item.material_a.normalized_description}
                  </span>

                  <div className="queue-item-bottom">
                    <StatusBadge status={item.match.classification} />
                    <span style={{ color: "var(--text-muted)" }}>
                      {Math.round(item.match.final_score * 100)}% Match
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Right Column: Detailed Match Inspection */}
          <div className="review-detail">
            {/* Header Summary & Prominent Confidence Ring */}
            <div className="panel review-summary">
              <div className="review-summary-top">
                <div style={{ flex: 1 }}>
                  <span className="eyebrow">
                    {Object.keys(current.match.conflicting_features ?? {}).length
                      ? "ATTENTION REQUIRED"
                      : "RECOMMENDED EQUIVALENCE"}
                  </span>
                  <h2>
                    {Object.keys(current.match.conflicting_features ?? {}).length
                      ? "Technical Specification Conflict Detected"
                      : "Functionally Equivalent Material Candidate"}
                  </h2>
                  <p>
                    Deterministic engine analyzed normalized descriptions, extracted attributes, material grades, and thread dimensions.
                  </p>
                </div>

                {/* Prominent Confidence Ring */}
                <div
                  className="confidence-ring"
                  style={
                    {
                      "--confidence": `${Math.round(current.match.final_score * 100)}%`,
                    } as React.CSSProperties
                  }
                  title={`Confidence rating: ${Math.round(current.match.final_score * 100)}%`}
                >
                  <span>
                    {Math.round(current.match.final_score * 100)}
                    <small>%</small>
                  </span>
                  <i>Confidence</i>
                </div>
              </div>

              <div className="review-meta">
                <StatusBadge status={current.recommendation} />
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Sparkles size={14} style={{ color: "var(--brand-primary)" }} />
                  <span>Rule Engine Recommendation</span>
                </span>
                <span className="meta-divider" />
                <span>
                  {current.procurement_context
                    ? `${current.procurement_context.material_a_records + current.procurement_context.material_b_records} historical procurement events analyzed`
                    : "Standalone engineering verification"}
                </span>
              </div>
            </div>

            {/* Side-by-Side Detailed Comparison */}
            <section className="compare-grid">
              <MaterialCompareCard
                material={current.material_a}
                label="SOURCE RECORD A (FIRST CPSE)"
              />
              <div className="compare-connector">
                <span>
                  <GitCompareArrows size={17} />
                </span>
              </div>
              <MaterialCompareCard
                material={current.material_b}
                label="SOURCE RECORD B (SECOND CPSE)"
              />
            </section>

            {/* Specification Conflict Alert Banner */}
            {Object.keys(current.match.conflicting_features ?? {}).length > 0 && (
              <div className="conflict-card">
                <div className="conflict-icon">
                  <AlertTriangle size={20} />
                </div>
                <div className="conflict-body">
                  <b>Critical Specification Conflict Warning</b>
                  <p>
                    These records contain conflicting engineering parameters (e.g. differing steel grades or thread lengths). They must not be unified into the same National Material Code without explicit modification.
                  </p>
                  <div className="conflict-values">
                    {Object.entries(current.match.conflicting_features).map(
                      ([key, values]) => (
                        <span key={key}>
                          <b style={{ color: "var(--text-primary)" }}>{humanize(key)}:</b>
                          <em>{values.a} (Record A)</em>
                          <X size={13} style={{ color: "var(--accent-rose)" }} />
                          <em>{values.b} (Record B)</em>
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Why This Match Was Suggested (Explainability Matrix) */}
            <section className="panel explanation-panel">
              <div className="explanation-heading">
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div className="section-icon emerald">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <span className="eyebrow">TRANSPARENT REASONING</span>
                    <h2>Why this match was suggested</h2>
                    <p>{current.match.explanation}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="button button-quiet"
                  style={{ fontSize: "11px", height: "30px" }}
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? "Collapse Breakdown" : "Expand Breakdown"}
                </button>
              </div>

              {showDetails && (
                <>
                  {/* Matching Attributes Badges */}
                  <div style={{ marginTop: "16px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--brand-primary)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <Check size={14} /> Agreed Engineering Attributes:
                    </span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {Object.keys(current.match.matching_features ?? {}).length ? (
                        Object.entries(current.match.matching_features).map(
                          ([key, value]) => (
                            <span
                              key={key}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                borderRadius: "var(--radius-md)",
                                background: "var(--brand-light)",
                                color: "var(--brand-text)",
                                fontSize: "11.5px",
                                border: "1px solid var(--brand-border)",
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>{humanize(key)}:</span>
                              <b style={{ fontFamily: "var(--font-mono)" }}>
                                {Array.isArray(value) ? String(value[0]) : String(value)}
                              </b>
                            </span>
                          ),
                        )
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                          No shared extracted attributes in this candidate.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 5-Score Bar Breakdown */}
                  <div className="score-grid">
                    <ScoreItem
                      label="Semantic Description"
                      value={current.match.semantic_score}
                    />
                    <ScoreItem
                      label="Attribute Match"
                      value={current.match.attribute_score}
                    />
                    <ScoreItem
                      label="Technical Spec"
                      value={current.match.specification_score}
                    />
                    <ScoreItem
                      label="Category Alignment"
                      value={current.match.category_score}
                    />
                    <ScoreItem
                      label="Procurement Context"
                      value={current.match.procurement_score}
                    />
                  </div>
                </>
              )}
            </section>

            {/* Human Decision Panel */}
            <section className="panel decision-panel">
              <div className="decision-heading">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="section-icon emerald">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <span className="eyebrow">HUMAN SIGN-OFF</span>
                    <h2>Certified Decision Matrix</h2>
                    <p>Approval generates an authoritative National Material Code (NMC) and links both CPSE source records.</p>
                  </div>
                </div>
              </div>

              {/* Reviewer Comment */}
              <label className="reviewer-label" htmlFor="reviewer-comment">
                Reviewer Certification Comment <span style={{ opacity: 0.6 }}>(Optional)</span>
              </label>
              <textarea
                id="reviewer-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Document your technical evaluation for the permanent governance audit trail…"
                rows={2}
              />

              {/* Editable Standard Description for Modify */}
              {standardDescription !== "" && (
                <div style={{ marginTop: "12px" }}>
                  <label className="reviewer-label" htmlFor="standard-desc">
                    National Material Master Standard Description
                  </label>
                  <input
                    id="standard-desc"
                    value={standardDescription}
                    onChange={(e) => setStandardDescription(e.target.value)}
                    className="text-input"
                    placeholder="Enter revised standardized description for the national master registry…"
                  />
                </div>
              )}

              {/* Consequential Action Buttons */}
              <div className="decision-actions">
                <button
                  type="button"
                  disabled={busy}
                  className="button button-danger-quiet"
                  onClick={() =>
                    setConfirmModal({
                      action: "reject",
                      title: "Reject Candidate Equivalence?",
                      message:
                        "This will mark the suggestion as rejected. Both source records will retain their local CPSE identities without unification.",
                    })
                  }
                >
                  <X size={15} /> Reject Match
                </button>

                <button
                  type="button"
                  disabled={busy}
                  className="button button-outline"
                  onClick={() =>
                    setConfirmModal({
                      action: "escalate",
                      title: "Escalate to Metallurgy Committee?",
                      message:
                        "Flag this match for elevated review by the inter-CPSE standardization committee due to technical uncertainty.",
                    })
                  }
                >
                  <ShieldAlert size={15} /> Escalate
                </button>

                <button
                  type="button"
                  disabled={busy}
                  className="button button-outline"
                  onClick={() =>
                    setStandardDescription(
                      current.material_a.normalized_description,
                    )
                  }
                >
                  <MessageSquareText size={15} /> Modify Description
                </button>

                {standardDescription && (
                  <button
                    type="button"
                    disabled={busy}
                    className="button button-warm"
                    onClick={() =>
                      setConfirmModal({
                        action: "modify",
                        title: "Approve with Modified Description?",
                        message: `The national code will be created with the custom description: "${standardDescription}".`,
                      })
                    }
                  >
                    <Check size={16} /> Certify Modified
                  </button>
                )}

                <button
                  type="button"
                  disabled={busy}
                  className="button button-primary"
                  onClick={() =>
                    setConfirmModal({
                      action: "approve",
                      title: "Certify and Allocate National Material Code?",
                      message:
                        "This will approve the equivalence, generate an NMC code, and establish bidirectional mappings for both CPSE records.",
                    })
                  }
                >
                  <Check size={16} /> Certify & Unify
                </button>
              </div>

              <div className="decision-footnote">
                <Info size={14} style={{ color: "var(--brand-primary)", flexShrink: 0 }} />
                <span>
                  All actions are logged in the immutable audit registry under reviewer <strong>Nireeksha</strong>. Local enterprise ERP codes remain fully active.
                </span>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Consequential Decisions */}
      {confirmModal && (
        <div
          className="command-palette-backdrop"
          onClick={() => setConfirmModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="panel"
            style={{
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              boxShadow: "var(--shadow-xl)",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-xl)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div
                className={`stat-icon ${confirmModal.action === "reject" ? "amber" : "emerald"}`}
                style={{ width: "38px", height: "38px" }}
              >
                {confirmModal.action === "reject" ? (
                  <AlertTriangle size={20} />
                ) : (
                  <ShieldCheck size={20} />
                )}
              </div>
              <h3 style={{ fontSize: "16px" }}>{confirmModal.title}</h3>
            </div>

            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
              {confirmModal.message}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setConfirmModal(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`button ${
                  confirmModal.action === "reject"
                    ? "button-danger"
                    : confirmModal.action === "escalate"
                      ? "button-warm"
                      : "button-primary"
                }`}
                onClick={() => void executeDecision(confirmModal.action)}
                disabled={busy}
              >
                {busy ? "Processing…" : "Confirm Decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MaterialCompareCard({
  material,
  label,
}: {
  material: ReviewItem["material_a"];
  label: string;
}) {
  return (
    <div className="compare-card">
      <div className="compare-label">{label}</div>
      <div className="compare-org">
        <span className="cpse-avatar">{(material.cpse_code ?? "C")[0]}</span>
        <div>
          <b style={{ fontSize: "12px", color: "var(--text-primary)" }}>
            {material.cpse_name ?? material.cpse_code ?? `CPSE ${material.cpse_id}`}
          </b>
          <small style={{ color: "var(--text-muted)", display: "block" }}>
            Participating CPSE
          </small>
        </div>
      </div>

      <div className="compare-code">{material.legacy_material_code}</div>
      <p title={material.original_description}>{material.original_description}</p>

      <div className="compare-attrs">
        <span>Category: {humanize(material.category)}</span>
        <span>Material: {humanize(material.material)}</span>
        <span>Grade: {material.grade ?? "—"}</span>
        <span>Unit: {material.unit ?? "EA"}</span>
      </div>

      <Link
        to={`/materials/${material.id}`}
        className="button button-quiet"
        style={{ fontSize: "11px", height: "30px", marginTop: "auto", justifyContent: "flex-start", padding: "0 8px" }}
      >
        Inspect full record <ArrowRight size={13} style={{ marginLeft: "auto" }} />
      </Link>
    </div>
  );
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div className="score-item">
      <span>{label}</span>
      <b>{percent}%</b>
      <div className="progress-track" style={{ height: "5px" }}>
        <span
          className="progress-fill emerald"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
