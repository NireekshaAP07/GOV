import { useEffect, useState } from "react";
import { ArrowRight, GitCompareArrows, Info, Sparkles } from "lucide-react";
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
      item.match.final_score >= 0.8 &&
      !Object.keys(item.match.conflicting_features ?? {}).length,
  );
  return (
    <>
      <PageTitle
        eyebrow="CANDIDATE GROUPS"
        title="Duplicate Detection"
        description="Potentially equivalent records are grouped for a human to review before a shared identity is approved."
        actions={
          <span className="approval-note">
            <Info size={15} /> Suggestions are not merged automatically
          </span>
        }
      />
      <div className="cluster-explainer">
        <div className="cluster-explainer-icon">
          <GitCompareArrows size={18} />
        </div>
        <div>
          <b>Similarity helps us find a starting point.</b>
          <span>
            Technical conflicts stay visible, and each source code remains
            attached to its own record.
          </span>
        </div>
        <Link to="/reviews" className="text-link">
          Open review queue <ArrowRight size={14} />
        </Link>
      </div>
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : likely.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={GitCompareArrows}
            title="No candidate groups yet"
            body="After materials are imported, the matching service can suggest records for review."
            action={
              <Link to="/import" className="button button-primary">
                Import materials
              </Link>
            }
          />
        </div>
      ) : (
        <div className="cluster-grid">
          {likely.map((item) => (
            <article className="panel cluster-card" key={item.review_id}>
              <div className="cluster-card-top">
                <span className="cluster-number">
                  MATCH CANDIDATE #{item.match.id ?? item.review_id}
                </span>
                <ConfidenceBadge value={item.match.final_score} />
              </div>
              <h2>{item.material_a.normalized_description}</h2>
              <div className="cluster-count">
                <GitCompareArrows size={14} />
                <b>2 source records</b>
                <span>Potential equivalents</span>
              </div>
              <div className="cluster-members">
                <div>
                  <span className="cpse-avatar">
                    {(item.material_a.cpse_code ?? "C")[0]}
                  </span>
                  <span>
                    <b>
                      {item.material_a.cpse_code ??
                        `CPSE ${item.material_a.cpse_id}`}
                    </b>
                    <small>
                      {item.material_a.legacy_material_code} ·{" "}
                      {item.material_a.original_description}
                    </small>
                  </span>
                </div>
                <div>
                  <span className="cpse-avatar">
                    {(item.material_b.cpse_code ?? "C")[0]}
                  </span>
                  <span>
                    <b>
                      {item.material_b.cpse_code ??
                        `CPSE ${item.material_b.cpse_id}`}
                    </b>
                    <small>
                      {item.material_b.legacy_material_code} ·{" "}
                      {item.material_b.original_description}
                    </small>
                  </span>
                </div>
              </div>
              <div className="cluster-card-bottom">
                <StatusBadge status="PENDING REVIEW" />
                <span>
                  <Sparkles size={13} /> AI-assisted suggestion
                </span>
                <Link
                  to={`/reviews?reviewId=${item.review_id}`}
                  className="button button-soft"
                >
                  Review cluster <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
