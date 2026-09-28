import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  GitCompareArrows,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import {
  ConfidenceBadge,
  EmptyState,
  LoadingSkeleton,
  PageTitle,
  StatusBadge,
} from "../components/common";
import type { ReviewItem } from "../types";
import { humanize } from "./Materials";

export default function Duplicates() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .reviews()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const likely = items.filter(
    (item) =>
      item.match.final_score >= 0.75 &&
      !Object.keys(item.match.conflicting_features ?? {}).length,
  );

  const conflicting = items.filter(
    (item) => Object.keys(item.match.conflicting_features ?? {}).length > 0,
  );

  return (
    <>
      <PageTitle
        eyebrow="CROSS-ENTERPRISE INTELLIGENCE"
        title="Duplicate Detection & Equivalence"
        description="Deterministic similarity algorithms identify equivalent materials across CPSEs, grouping candidate records for human review."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <span className="approval-note">
              <ShieldCheck size={16} /> Human Decision Required Prior to Merge
            </span>
            <Link to="/reviews" className="button button-primary">
              <Sparkles size={15} /> Open Review Queue
            </Link>
          </div>
        }
      />

      {/* Explainer Banner */}
      <div className="cluster-explainer">
        <div className="cluster-explainer-icon">
          <GitCompareArrows size={20} />
        </div>
        <div>
          <b>Non-Destructive Material Deduplication</b>
          <span>
            Equivalent records are mapped to a single National Material Code (NMC) without modifying or deleting original CPSE legacy codes. Traceability is guaranteed.
          </span>
        </div>
        <Link to="/reviews" className="button button-soft" style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
          Pending Queue ({items.length}) <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : items.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={GitCompareArrows}
            title="No duplicate clusters detected"
            body="Once materials from multiple CPSEs are ingested, similarity clustering will identify candidate groups."
            action={
              <Link to="/import" className="button button-primary">
                + Import Materials
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* Confirmed / Strong Candidate Clusters */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Layers size={17} style={{ color: "var(--brand-primary)" }} />
              <h2 style={{ fontSize: "16px", margin: 0 }}>
                High-Confidence Equivalent Clusters ({likely.length})
              </h2>
            </div>

            <div className="cluster-grid">
              {likely.map((item) => {
                const attrs = Object.entries(item.match.matching_features ?? {});
                return (
                  <article className="panel cluster-card" key={item.review_id}>
                    <div className="cluster-card-top">
                      <span className="cluster-number">
                        CLUSTER #{String(item.match.id ?? item.review_id).padStart(3, "0")}
                      </span>
                      <ConfidenceBadge value={item.match.final_score} showLabel />
                    </div>

                    <h2>{item.material_a.normalized_description}</h2>

                    <div className="cluster-count">
                      <Boxes size={14} />
                      <b>2 Potentially Equivalent CPSE Records</b>
                      <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
                        Score: {Math.round(item.match.final_score * 100)}%
                      </span>
                    </div>

                    {/* Member Records */}
                    <div className="cluster-members">
                      <div>
                        <span className="cpse-avatar">
                          {(item.material_a.cpse_code ?? "C")[0]}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <b>{item.material_a.cpse_code ?? `CPSE ${item.material_a.cpse_id}`}</b>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--brand-primary)" }}>
                              {item.material_a.legacy_material_code}
                            </span>
                          </div>
                          <small title={item.material_a.original_description}>
                            {item.material_a.original_description}
                          </small>
                        </div>
                        <span className="grade-tag">{item.material_a.grade ?? "SS304"}</span>
                      </div>

                      <div>
                        <span className="cpse-avatar">
                          {(item.material_b.cpse_code ?? "C")[0]}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <b>{item.material_b.cpse_code ?? `CPSE ${item.material_b.cpse_id}`}</b>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--brand-primary)" }}>
                              {item.material_b.legacy_material_code}
                            </span>
                          </div>
                          <small title={item.material_b.original_description}>
                            {item.material_b.original_description}
                          </small>
                        </div>
                        <span className="grade-tag">{item.material_b.grade ?? "SS304"}</span>
                      </div>
                    </div>

                    {/* Common Technical Attributes */}
                    <div style={{ marginTop: "14px" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                        Agreed Technical Attributes:
                      </span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                        {attrs.map(([key, val]) => (
                          <span
                            key={key}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 8px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--brand-light)",
                              color: "var(--brand-text)",
                              fontSize: "11px",
                              border: "1px solid var(--brand-border)",
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>{humanize(key)}:</span>
                            <b style={{ fontFamily: "var(--font-mono)" }}>
                              {Array.isArray(val) ? String(val[0]) : String(val)}
                            </b>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="cluster-card-bottom">
                      <StatusBadge status="PENDING REVIEW" />
                      <Link
                        to={`/reviews?reviewId=${item.review_id}`}
                        className="button button-primary"
                        style={{ fontSize: "12px", height: "32px", padding: "0 12px" }}
                      >
                        Review in AI Match Queue <ArrowRight size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Conflicting Clusters / Investigating */}
          {conflicting.length > 0 && (
            <div style={{ marginTop: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <AlertTriangle size={18} style={{ color: "var(--accent-amber)" }} />
                <h2 style={{ fontSize: "16px", margin: 0 }}>
                  Clusters With Specification Conflicts ({conflicting.length})
                </h2>
              </div>

              <div className="cluster-grid">
                {conflicting.map((item) => (
                  <article
                    className="panel cluster-card"
                    key={item.review_id}
                    style={{ borderColor: "var(--accent-amber-border)" }}
                  >
                    <div className="cluster-card-top">
                      <span className="cluster-number" style={{ color: "var(--accent-amber)" }}>
                        CONFLICT #{String(item.match.id ?? item.review_id).padStart(3, "0")}
                      </span>
                      <StatusBadge status="CONFLICT DETECTED" />
                    </div>

                    <h2>{item.material_a.normalized_description}</h2>

                    <div style={{ padding: "10px 12px", background: "var(--accent-amber-light)", borderRadius: "var(--radius-md)", margin: "8px 0" }}>
                      <b style={{ fontSize: "12px", color: "var(--accent-amber)", display: "block" }}>
                        Critical Attribute Mismatch
                      </b>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", display: "block" }}>
                        {item.match.explanation}
                      </span>
                    </div>

                    <div className="cluster-members">
                      <div>
                        <span className="cpse-avatar">
                          {(item.material_a.cpse_code ?? "C")[0]}
                        </span>
                        <div>
                          <b>{item.material_a.cpse_code} · {item.material_a.legacy_material_code}</b>
                          <small>{item.material_a.original_description}</small>
                        </div>
                        <span className="grade-tag">{item.material_a.grade ?? "—"}</span>
                      </div>
                      <div>
                        <span className="cpse-avatar">
                          {(item.material_b.cpse_code ?? "C")[0]}
                        </span>
                        <div>
                          <b>{item.material_b.cpse_code} · {item.material_b.legacy_material_code}</b>
                          <small>{item.material_b.original_description}</small>
                        </div>
                        <span className="grade-tag">{item.material_b.grade ?? "—"}</span>
                      </div>
                    </div>

                    <div className="cluster-card-bottom">
                      <ConfidenceBadge value={item.match.final_score} showLabel />
                      <Link
                        to={`/reviews?reviewId=${item.review_id}`}
                        className="button button-outline"
                        style={{ fontSize: "12px", height: "32px", padding: "0 12px" }}
                      >
                        Inspect Conflict <ArrowRight size={14} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
