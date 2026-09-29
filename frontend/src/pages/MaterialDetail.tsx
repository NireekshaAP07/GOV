import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Cpu,
  Fingerprint,
  History,
  Landmark,
  Link2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import {
  ConfidenceBadge,
  EmptyState,
  LoadingSkeleton,
  PageTitle,
  StatusBadge,
} from "../components/common";
import { humanize } from "./Materials";
import type { Material } from "../types";

export default function MaterialDetail() {
  const { id } = useParams();
  const [item, setItem] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMaterial(Number(id))
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton rows={6} />;

  if (!item) {
    return (
      <EmptyState
        title="Material record unavailable"
        body="This source record may have been removed or is outside the current index."
        action={
          <Link className="button button-soft" to="/materials">
            <ArrowLeft size={15} /> Back to Material Explorer
          </Link>
        }
      />
    );
  }

  const attrs = Object.entries(item.fingerprint ?? {}).filter(
    ([key, value]) => !["unit"].includes(key) && value != null,
  );

  return (
    <>
      <PageTitle
        eyebrow={`SOURCE RECORD · ${item.cpse_code ?? `CPSE ${item.cpse_id}`}`}
        title={item.normalized_description || item.original_description}
        description={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)" }}>
            <span>Code: <b>{item.legacy_material_code}</b></span>
            <span>·</span>
            <span>Organization: <b>{item.cpse_name ?? item.cpse_code}</b></span>
          </span>
        }
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/materials" className="button button-outline">
              <ArrowLeft size={15} /> Back to Explorer
            </Link>
            {item.national_material && (
              <Link to={`/national-materials`} className="button button-primary">
                <Landmark size={15} /> View National Code ({item.national_material.national_code})
              </Link>
            )}
          </div>
        }
      />

      <div className="detail-layout">
        {/* Main Column */}
        <div className="detail-main">
          {/* Preserved Original Record */}
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon amber">
                <BookOpenCheck size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="eyebrow" style={{ color: "var(--accent-amber)" }}>
                  ORIGINAL ENTERPRISE METADATA
                </span>
                <h2>Preserved Source Record</h2>
                <p>Immutable raw material record exactly as stored inside the CPSE catalog.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <StatusBadge status={item.mapping?.status ?? (item.national_material ? "APPROVED" : "UNMAPPED")} />
                <ConfidenceBadge value={item.mapping?.confidence ?? item.similarity} showLabel />
              </div>
            </div>

            <div className="record-grid">
              <Info
                label="Enterprise / CPSE"
                value={item.cpse_name ?? item.cpse_code ?? `CPSE ${item.cpse_id}`}
              />
              <Info
                label="Legacy Material Code"
                value={item.legacy_material_code}
                mono
              />
              <Info
                label="Original Description (Raw)"
                value={item.original_description}
                wide
              />
              <Info label="Source Unit of Measure" value={item.unit ?? "EA"} mono />
              <Info
                label="Normalized Representation"
                value={item.normalized_description}
                wide
              />
            </div>
          </section>

          {/* Standardized Extracted Specifications */}
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon emerald">
                <Cpu size={20} />
              </div>
              <div>
                <span className="eyebrow">STANDARDIZED SPECIFICATIONS</span>
                <h2>Technical Specification Matrix</h2>
                <p>Parsed and normalized technical dimensions derived from the material description.</p>
              </div>
            </div>

            <div className="attribute-grid">
              <Info label="Category" value={humanize(item.category ?? String(item.fingerprint?.category ?? ""))} />
              <Info label="Material" value={humanize(item.material ?? String(item.fingerprint?.material ?? ""))} />
              <Info label="Material Grade" value={item.grade ?? String(item.fingerprint?.grade ?? "—")} mono />
              <Info label="Diameter / Thread" value={String(item.fingerprint?.diameter ?? "—")} mono />
              <Info label="Length / Dimensions" value={String(item.fingerprint?.length ?? "—")} mono />
              <Info label="Head Type / Style" value={humanize(String(item.fingerprint?.head_type ?? "—"))} />
              <Info label="Unit of Measurement" value={item.unit ?? String(item.fingerprint?.unit ?? "EA")} mono />
            </div>
          </section>

          {/* Fingerprint Chips Grid */}
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon blue">
                <Fingerprint size={20} />
              </div>
              <div>
                <span className="eyebrow">MATCHING TOKENS</span>
                <h2>Material Fingerprint</h2>
                <p>Deterministic signature used for cross-enterprise duplicate detection and clustering.</p>
              </div>
            </div>

            <div className="fingerprint-chips">
              {attrs.length === 0 ? (
                <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                  No extra attributes extracted for this material.
                </span>
              ) : (
                attrs.map(([key, value]) => (
                  <div className="fingerprint-chip" key={key}>
                    <small>{humanize(key)}</small>
                    <b>{String(value)}</b>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Aside Sidebar */}
        <aside className="detail-aside">
          {/* Record Lineage Card */}
          <div className="panel lineage-panel">
            <span className="eyebrow">GOVERNANCE & AUDIT</span>
            <h3 style={{ fontSize: "15px", margin: "4px 0 12px" }}>Lifecycle Lineage</h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Complete traceability path from local CPSE database to national master registry.
            </p>

            <div className="lineage-step">
              <span className="lineage-dot source">
                <BookOpenCheck size={16} />
              </span>
              <div>
                <b>1. Source Ingestion</b>
                <span>{item.cpse_code} · {item.legacy_material_code}</span>
              </div>
            </div>

            <div className="lineage-step">
              <span className="lineage-dot ai">
                <Sparkles size={16} />
              </span>
              <div>
                <b>2. AI Normalization</b>
                <span>Attributes extracted & fingerprinted</span>
              </div>
            </div>

            <div className="lineage-step">
              <span className={`lineage-dot ${item.national_material ? "done" : "review"}`}>
                <ShieldCheck size={16} />
              </span>
              <div>
                <b>{item.national_material ? "3. National Code Mapped" : "3. Review Pending"}</b>
                <span>
                  {item.national_material
                    ? item.national_material.national_code
                    : "Awaiting human reviewer decision"}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: "16px",
                paddingTop: "14px",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <History size={14} style={{ color: "var(--brand-primary)" }} />
              <span>Full audit history logged and preserved</span>
            </div>
          </div>

          {/* Related Actions Panel */}
          <div className="panel detail-panel">
            <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>Explore Related Records</h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.5 }}>
              Query the national database for materials sharing the same grade, category or dimensions.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                to={`/materials?q=${encodeURIComponent(item.grade ?? item.legacy_material_code)}`}
                className="button button-outline"
                style={{ justifyContent: "flex-start", fontSize: "12px" }}
              >
                Find similar materials <ArrowRight size={14} style={{ marginLeft: "auto" }} />
              </Link>

              {item.national_material && (
                <Link
                  to="/national-materials"
                  className="button button-soft"
                  style={{ justifyContent: "flex-start", fontSize: "12px" }}
                >
                  <Link2 size={14} /> National Master ({item.national_material.national_code})
                </Link>
              )}

              <Link
                to="/duplicates"
                className="button button-quiet"
                style={{ justifyContent: "flex-start", fontSize: "12px" }}
              >
                Check Duplicate Clusters <ArrowRight size={14} style={{ marginLeft: "auto" }} />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function Info({
  label,
  value,
  wide,
  mono,
}: {
  label: string;
  value: string;
  wide?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={`info-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <b className={mono ? "mono" : ""}>{value || "—"}</b>
    </div>
  );
}
