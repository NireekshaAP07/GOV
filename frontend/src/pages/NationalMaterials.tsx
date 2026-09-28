import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  GitCompareArrows,
  History,
  Landmark,
  Layers,
  Search as SearchIcon,
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
  SearchField,
  StatusBadge,
} from "../components/common";
import { humanize } from "./Materials";
import type { NationalMaterial } from "../types";

export default function NationalMaterials() {
  const [items, setItems] = useState<NationalMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .nationalMaterials()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((item) =>
    `${item.national_code} ${item.standard_description} ${item.grade ?? ""}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <>
      <PageTitle
        eyebrow="CENTRALIZED MASTER REPOSITORY"
        title="National Material Master (NMC)"
        description="Authoritative, unified material records approved across CPSE enterprises. Each National Material Code maps to all participating legacy codes."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/mappings" className="button button-outline">
              <GitCompareArrows size={15} /> Source-to-NMC Mappings
            </Link>
            <Link to="/reviews" className="button button-primary">
              <ShieldCheck size={15} /> Review Queue
            </Link>
          </div>
        }
      />

      {/* Explorer Search Toolbar */}
      <div className="explorer-toolbar">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search by National Material Code (NMC), description, grade or category…"
        />
        <div className="toolbar-count">
          <Landmark size={16} style={{ color: "var(--brand-primary)" }} />
          <span>
            <b>{filtered.length}</b> verified national identities
          </span>
        </div>
      </div>

      {/* Master Data Table */}
      <div className="panel table-panel">
        <div className="table-topline">
          <div>
            <b>Approved National Material Catalog</b>
            <span>
              Each NMC identity preserves bidirectional lineage to every original CPSE legacy material record.
            </span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Showing {filtered.length} national codes
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No national materials found"
            body="Approved national material identities appear here after a human reviewer certifies a match."
            action={
              <Link to="/reviews" className="button button-primary">
                Open Review Queue
              </Link>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>National Code (NMC)</th>
                  <th>Standard Unified Description</th>
                  <th>Category</th>
                  <th>Material</th>
                  <th>Grade</th>
                  <th>CPSE Mappings</th>
                  <th>Catalog Version</th>
                  <th>Approval Status</th>
                  <th style={{ textAlign: "right" }}>Specification</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="code-link"
                        to={`/national-materials/${item.id}`}
                        style={{ fontSize: "13px", fontWeight: 700 }}
                      >
                        {item.national_code}
                      </Link>
                    </td>
                    <td>
                      <Link
                        className="description-link"
                        to={`/national-materials/${item.id}`}
                        style={{ maxWidth: "340px" }}
                      >
                        {item.standard_description}
                      </Link>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{humanize(item.category)}</span>
                    </td>
                    <td>{humanize(item.material)}</td>
                    <td>
                      <span className="grade-tag">{item.grade ?? "—"}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "3px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-subtle)",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        <Boxes size={13} style={{ color: "var(--brand-primary)" }} />
                        {item.cpse_mappings ?? "—"} CPSEs
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                        v{item.version}.0
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={item.approval_status} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        className="row-arrow"
                        to={`/national-materials/${item.id}`}
                        aria-label={`Open national material ${item.national_code}`}
                        title="View specification & lineage"
                      >
                        <ArrowRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Callout */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "18px", color: "var(--text-muted)", fontSize: "11.5px" }}>
        <Sparkles size={14} style={{ color: "var(--brand-primary)" }} />
        <span>
          National Material Codes establish a single source of truth across all CPSE procurement systems without disrupting local legacy ERP operations.
        </span>
      </div>
    </>
  );
}

export function NationalDetail() {
  const { id } = useParams();
  const [item, setItem] = useState<NationalMaterial | null>(null);
  const [mappings, setMappings] = useState<
    Array<{
      cpse_code: string;
      cpse_name: string;
      legacy_material_code: string;
      original_description: string;
      confidence: number;
      status: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getNational(Number(id))
      .then(async (row) => {
        setItem(row);
        try {
          const mappingRes = await api.mappings(row.national_code);
          setMappings(mappingRes.mappings);
        } catch {
          setMappings([]);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton rows={6} />;

  if (!item) {
    return (
      <EmptyState
        title="National material specification not found"
        body="This national code may have been archived or re-indexed."
        action={
          <Link to="/national-materials" className="button button-primary">
            <ArrowLeft size={14} /> Back to National Master
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageTitle
        eyebrow="OFFICIAL NATIONAL IDENTITY"
        title={item.national_code}
        description={item.standard_description}
        actions={
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link to="/national-materials" className="button button-outline">
              <ArrowLeft size={14} /> Back to Registry
            </Link>
            <StatusBadge status={item.approval_status} />
          </div>
        }
      />

      <div className="detail-layout">
        {/* Main Column */}
        <div className="detail-main">
          {/* Standard Specifications */}
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon emerald">
                <Landmark size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="eyebrow">STANDARDIZED SPECIFICATION</span>
                <h2>Unified Engineering Parameters</h2>
                <p>Governed attributes binding all mapped CPSE source materials under version {item.version}.0.</p>
              </div>
            </div>

            <div className="attribute-grid">
              <div className="info-field">
                <span>Category</span>
                <b>{humanize(item.category)}</b>
              </div>
              <div className="info-field">
                <span>Material Classification</span>
                <b>{humanize(item.material)}</b>
              </div>
              <div className="info-field">
                <span>Material Grade</span>
                <b className="mono">{item.grade ?? "—"}</b>
              </div>
              <div className="info-field">
                <span>National Code</span>
                <b className="mono" style={{ color: "var(--brand-primary)" }}>{item.national_code}</b>
              </div>

              {Object.entries(item.technical_attributes ?? {}).map(([key, value]) => (
                <div className="info-field" key={key}>
                  <span>{humanize(key)}</span>
                  <b className="mono">{String(value)}</b>
                </div>
              ))}
            </div>
          </section>

          {/* Mapped CPSE Records Table */}
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon blue">
                <GitCompareArrows size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="eyebrow">SOURCE TRACEABILITY</span>
                <h2>Mapped CPSE Legacy Records ({mappings.length})</h2>
                <p>
                  Original enterprise material codes mapped to this single national identity.
                </p>
              </div>
            </div>

            {mappings.length ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {mappings.map((mapping) => (
                  <div
                    className="mapping-record"
                    key={`${mapping.cpse_code}-${mapping.legacy_material_code}`}
                  >
                    <div className="mapping-source">
                      <span className="cpse-avatar">{mapping.cpse_code[0]}</span>
                      <div>
                        <b>{mapping.cpse_name || mapping.cpse_code}</b>
                        <span>{mapping.cpse_code} Enterprise</span>
                      </div>
                    </div>

                    <ArrowRight size={15} style={{ color: "var(--text-muted)" }} />

                    <div>
                      <b className="mono" style={{ color: "var(--brand-primary)" }}>
                        {mapping.legacy_material_code}
                      </b>
                      <span style={{ display: "block", color: "var(--text-muted)", fontSize: "11px", marginTop: "2px" }}>
                        {mapping.original_description}
                      </span>
                    </div>

                    <ConfidenceBadge value={mapping.confidence} showLabel />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No CPSE source mappings loaded"
                body="Live mappings for this national code are not returned by the backend."
              />
            )}
          </section>

          {/* Lifecycle & Lineage */}
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon amber">
                <History size={20} />
              </div>
              <div>
                <span className="eyebrow">GOVERNANCE & LIFECYCLE</span>
                <h2>Unified Lineage Pipeline</h2>
                <p>Complete lifecycle from raw CPSE ingestion to certified National Master registration.</p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                padding: "14px 18px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                CPSE Source Records Ingestion
              </span>
              <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                AI Deterministic Matching
              </span>
              <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                Human Review & Certification
              </span>
              <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
              <b style={{ fontSize: "12px", color: "var(--brand-primary)", fontFamily: "var(--font-mono)" }}>
                {item.national_code} (Active)
              </b>
            </div>
          </section>
        </div>

        {/* Aside Sidebar */}
        <aside className="detail-aside">
          <div className="panel lineage-panel">
            <span className="eyebrow">MASTER IDENTITY SUMMARY</span>
            <h3 style={{ fontSize: "16px", margin: "6px 0 2px" }}>{item.national_code}</h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
              {item.standard_description}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Approval Status:</span>
                <StatusBadge status={item.approval_status} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Catalog Version:</span>
                <b style={{ fontFamily: "var(--font-mono)" }}>v{item.version}.0</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Mapped CPSEs:</span>
                <b>{mappings.length} Enterprises</b>
              </div>
            </div>

            <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)" }}>
              <Link to="/mappings" className="button button-soft" style={{ width: "100%", justifyContent: "center" }}>
                <Layers size={14} /> View in Mapping Explorer
              </Link>
            </div>
          </div>

          <div className="panel" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <ShieldCheck size={16} style={{ color: "var(--brand-primary)" }} />
              <strong style={{ fontSize: "13px" }}>Governance Note</strong>
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Any modifications to this National Material Master identity will create a revisioned v{item.version + 1}.0 record, preserving historical audit logs.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
