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
  ShieldCheck,
  Sparkles,
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
  Toast,
} from "../components/common";
import type { ReviewItem } from "../types";
import { humanize } from "./Materials";

export default function Review() {
  const [params] = useSearchParams();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [comment, setComment] = useState("");
  const [standardDescription, setStandardDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [showDetails, setShowDetails] = useState(true);
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
  }, []);
  const current = reviews.find((item) => item.review_id === selectedId);
  const action = async (decision: "approve" | "reject" | "modify") => {
    if (!current) return;
    setBusy(true);
    try {
      const result = await api.decideReview(
        current.review_id,
        decision,
        "Nireeksha",
        comment,
        standardDescription || undefined,
      );
      setToast(
        decision === "reject"
          ? "Recommendation rejected and recorded"
          : `Mapping approved · ${result.national_code ?? "Demo national code generated"}`,
      );
      setComment("");
      await load();
    } catch (e) {
      setToast(
        e instanceof Error ? e.message : "Review decision could not be saved",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="HUMAN-IN-THE-LOOP WORKSPACE"
        title="AI Match Review"
        description="Review evidence, inspect differences and decide whether source records should share a national identity."
        actions={
          <span className="approval-note">
            <ShieldCheck size={16} /> Human approval required
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
            title="Your review queue is clear"
            body="New AI-assisted suggestions will appear here after materials are compared."
            action={
              <Link to="/materials" className="button button-soft">
                Explore materials <ArrowRight size={15} />
              </Link>
            }
          />
        </div>
      ) : (
        <div className="review-workspace">
          <aside className="review-queue panel">
            <div className="queue-heading">
              <div>
                <span className="eyebrow">REVIEW QUEUE</span>
                <h2>Suggestions</h2>
              </div>
              <span className="queue-count">{reviews.length}</span>
            </div>
            <p className="queue-caption">
              AI suggestions are evidence to consider, not final decisions.
            </p>
            <div className="queue-list">
              {reviews.map((item, index) => (
                <button
                  key={item.review_id}
                  className={`queue-item ${item.review_id === selectedId ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedId(item.review_id);
                    setComment("");
                    setStandardDescription("");
                  }}
                >
                  <div className="queue-item-top">
                    <span>Review #{item.review_id}</span>
                    <ConfidenceBadge value={item.match.final_score} />
                  </div>
                  <b>
                    {item.material_a.legacy_material_code}{" "}
                    <ChevronRight size={13} />{" "}
                    {item.material_b.legacy_material_code}
                  </b>
                  <span className="queue-description">
                    {item.material_a.normalized_description}
                  </span>
                  <div className="queue-item-bottom">
                    <StatusBadge status={item.match.classification} />
                    <span>
                      {index === 0 ? "Best match" : "Needs a closer look"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>
          <div className="review-detail">
            <div className="review-summary panel">
              <div className="review-summary-top">
                <div>
                  <span className="eyebrow">AI-ASSISTED RECOMMENDATION</span>
                  <h2>
                    {Object.keys(current.match.conflicting_features ?? {})
                      .length
                      ? "Technical conflict needs review"
                      : "Likely equivalent material"}
                  </h2>
                  <p>
                    The system compared descriptions, technical attributes and
                    available specifications.
                  </p>
                </div>
                <div
                  className="confidence-ring"
                  style={
                    {
                      "--confidence": `${Math.round(current.match.final_score * 100)}%`,
                    } as React.CSSProperties
                  }
                >
                  <span>
                    {Math.round(current.match.final_score * 100)}
                    <small>%</small>
                  </span>
                  <i>confidence</i>
                </div>
              </div>
              <div className="review-meta">
                <StatusBadge status={current.recommendation} />
                <span>
                  <Sparkles size={14} /> AI recommendation
                </span>
                <span className="meta-divider" />
                <span>
                  {current.procurement_context
                    ? `${current.procurement_context.material_a_records + current.procurement_context.material_b_records} procurement records considered`
                    : "Procurement context not available"}
                </span>
              </div>
            </div>
            <section className="compare-grid">
              <MaterialCompare
                material={current.material_a}
                label="SOURCE RECORD A"
              />
              <div className="compare-connector">
                <span>
                  <GitCompareArrows size={17} />
                </span>
              </div>
              <MaterialCompare
                material={current.material_b}
                label="SOURCE RECORD B"
              />
            </section>
            {Object.keys(current.match.conflicting_features ?? {}).length >
              0 && (
              <div className="conflict-card">
                <div className="conflict-icon">
                  <AlertTriangle size={19} />
                </div>
                <div className="conflict-body">
                  <b>Specification conflict</b>
                  <p>
                    These records may not represent the same material. Review
                    conflicting attributes before making a decision.
                  </p>
                  <div className="conflict-values">
                    {Object.entries(current.match.conflicting_features).map(
                      ([key, values]) => (
                        <span key={key}>
                          <b>{humanize(key)}</b>
                          <em>{values.a}</em>
                          <X size={13} />
                          <em>{values.b}</em>
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
            <section className="panel explanation-panel">
              <div className="explanation-heading">
                <div>
                  <div className="section-icon sage">
                    <Sparkles size={17} />
                  </div>
                  <div>
                    <h2>Why this match was suggested</h2>
                    <p>{current.match.explanation}</p>
                  </div>
                </div>
                <button
                  className="text-link"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? "Hide" : "View"} matching details{" "}
                  <ChevronRight
                    size={14}
                    className={showDetails ? "rotate-down" : ""}
                  />
                </button>
              </div>
              {showDetails && (
                <>
                  <div className="matching-attributes">
                    <span className="match-yes">
                      <Check size={14} /> Matching attributes
                    </span>
                    {Object.keys(current.match.matching_features ?? {})
                      .length ? (
                      Object.entries(current.match.matching_features).map(
                        ([key, value]) => (
                          <span className="attribute-match" key={key}>
                            <CheckCircle2 size={14} />
                            {humanize(key)}{" "}
                            <b>
                              {Array.isArray(value)
                                ? String(value[0])
                                : String(value)}
                            </b>
                          </span>
                        ),
                      )
                    ) : (
                      <span className="muted">
                        No shared extracted attributes in this recommendation.
                      </span>
                    )}
                  </div>
                  <div className="score-grid">
                    <Score
                      label="Description similarity"
                      value={current.match.semantic_score}
                    />
                    <Score
                      label="Attribute match"
                      value={current.match.attribute_score}
                    />
                    <Score
                      label="Specification match"
                      value={current.match.specification_score}
                    />
                    <Score
                      label="Category match"
                      value={current.match.category_score}
                    />
                    <Score
                      label="Procurement context"
                      value={current.match.procurement_score}
                    />
                  </div>
                </>
              )}
            </section>
            <section className="panel decision-panel">
              <div className="decision-heading">
                <div className="section-icon clay">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2>Your review decision</h2>
                  <p>
                    Approval creates a national code and maps both source
                    records.
                  </p>
                </div>
                <span className="human-pill">
                  <ShieldCheck size={14} /> Human approval required
                </span>
              </div>
              <label className="reviewer-label" htmlFor="reviewer-comment">
                Reviewer comment <span>Optional</span>
              </label>
              <textarea
                id="reviewer-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add context for future reviewers…"
                rows={2}
              />
              {standardDescription !== "" && (
                <label className="reviewer-label" htmlFor="standard-desc">
                  Standard description
                </label>
              )}
              {standardDescription !== "" && (
                <input
                  id="standard-desc"
                  value={standardDescription}
                  onChange={(event) =>
                    setStandardDescription(event.target.value)
                  }
                  className="text-input"
                />
              )}
              <div className="decision-actions">
                <button
                  disabled={busy}
                  className="button button-danger-quiet"
                  onClick={() => void action("reject")}
                >
                  <X size={16} /> Reject match
                </button>
                <button
                  disabled={busy}
                  className="button button-outline"
                  onClick={() =>
                    setStandardDescription(
                      current.material_a.normalized_description,
                    )
                  }
                >
                  <MessageSquareText size={15} /> Modify description
                </button>
                {standardDescription && (
                  <button
                    disabled={busy}
                    className="button button-warm"
                    onClick={() => void action("modify")}
                  >
                    <Check size={16} /> Modify & approve
                  </button>
                )}
                <button
                  disabled={busy}
                  className="button button-primary"
                  onClick={() => void action("approve")}
                >
                  <Check size={16} /> Approve match
                </button>
              </div>
              <div className="decision-footnote">
                <Info size={14} /> Your decision is recorded for traceability.
                Source descriptions and legacy codes stay unchanged.
              </div>
            </section>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function MaterialCompare({
  material,
  label,
}: {
  material: ReviewItem["material_a"];
  label: string;
}) {
  return (
    <div className="panel compare-card">
      <div className="compare-label">{label}</div>
      <div className="compare-org">
        <span className="cpse-avatar">{(material.cpse_code ?? "C")[0]}</span>
        <span>
          <b>
            {material.cpse_name ??
              material.cpse_code ??
              `CPSE ${material.cpse_id}`}
          </b>
          <small>Original source</small>
        </span>
      </div>
      <div className="compare-code">{material.legacy_material_code}</div>
      <p>{material.original_description}</p>
      <div className="compare-attrs">
        <span>{humanize(material.grade)}</span>
        <span>{humanize(material.category)}</span>
        <span>{material.unit ?? "EA"}</span>
      </div>
      <Link to={`/materials/${material.id}`} className="text-link">
        View source record <ArrowRight size={13} />
      </Link>
    </div>
  );
}
function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-item">
      <span>{label}</span>
      <b>{Math.round(value * 100)}%</b>
      <div className="progress-track">
        <i style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}
