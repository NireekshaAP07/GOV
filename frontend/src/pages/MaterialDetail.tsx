import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Fingerprint,
  History,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import {
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
  if (loading) return <LoadingSkeleton rows={5} />;
  if (!item)
    return (
      <EmptyState
        title="Material record unavailable"
        body="This source record may have been removed or is outside the current search results."
        action={
          <Link className="button button-soft" to="/materials">
            <ArrowLeft size={15} /> Back to materials
          </Link>
        }
      />
    );
  const attrs = Object.entries(item.fingerprint ?? {}).filter(
    ([key, value]) => !["unit"].includes(key) && value != null,
  );
  return (
    <>
      <PageTitle
        eyebrow="MATERIAL EXPLORER / SOURCE RECORD"
        title={item.normalized_description || item.original_description}
        description={
          <>
            {item.legacy_material_code} <span className="separator-dot">·</span>{" "}
            {item.cpse_code ?? `CPSE ${item.cpse_id}`}
          </>
        }
        actions={
          <Link to="/materials" className="button button-soft">
            <ArrowLeft size={15} /> Back to explorer
          </Link>
        }
      />
      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon clay">
                <BookOpenCheck size={18} />
              </div>
              <div>
                <h2>Original record</h2>
                <p>Source information is preserved as provided by the CPSE.</p>
              </div>
              <StatusBadge status={item.mapping?.status ?? "UNMAPPED"} />
            </div>
            <div className="record-grid">
              <Info
                label="CPSE"
                value={
                  item.cpse_name ?? item.cpse_code ?? `CPSE ${item.cpse_id}`
                }
              />
              <Info
                label="Legacy material code"
                value={item.legacy_material_code}
                mono
              />
              <Info
                label="Original description"
                value={item.original_description}
                wide
              />
              <Info label="Source unit" value={item.unit ?? "EA"} />
            </div>
          </section>
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon sage">
                <Fingerprint size={18} />
              </div>
              <div>
                <h2>Standardized representation</h2>
                <p>
                  Attributes extracted from the description and source fields.
                </p>
              </div>
            </div>
            <div className="attribute-grid">
              {[
                [
                  "Category",
                  humanize(
                    item.category ?? String(item.fingerprint.category ?? ""),
                  ),
                ],
                [
                  "Material",
                  humanize(
                    item.material ?? String(item.fingerprint.material ?? ""),
                  ),
                ],
                ["Grade", item.grade ?? String(item.fingerprint.grade ?? "—")],
                ["Diameter", String(item.fingerprint.diameter ?? "—")],
                ["Length", String(item.fingerprint.length ?? "—")],
                [
                  "Head type",
                  humanize(String(item.fingerprint.head_type ?? "")),
                ],
                ["Unit", item.unit ?? String(item.fingerprint.unit ?? "EA")],
              ].map(([label, value]) => (
                <Info label={label} value={value} />
              ))}
            </div>
          </section>
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon sand">
                <Fingerprint size={18} />
              </div>
              <div>
                <h2>Material fingerprint</h2>
                <p>A readable view of the technical facts used in matching.</p>
              </div>
            </div>
            <div className="fingerprint-chips">
              {attrs.map(([key, value]) => (
                <span className="fingerprint-chip" key={key}>
                  <small>{humanize(key)}</small>
                  <b>{String(value)}</b>
                </span>
              ))}
            </div>
          </section>
        </div>
        <aside className="detail-aside">
          <div className="panel lineage-panel">
            <div className="eyebrow">RECORD LINEAGE</div>
            <h3>From source to shared identity</h3>
            <div className="lineage-step">
              <span className="lineage-dot source">
                <BookOpenCheck size={14} />
              </span>
              <div>
                <b>Original record</b>
                <span>{item.legacy_material_code}</span>
              </div>
            </div>
            <div className="lineage-step">
              <span className="lineage-dot ai">
                <Fingerprint size={14} />
              </span>
              <div>
                <b>AI analysis</b>
                <span>Attributes and description compared</span>
              </div>
            </div>
            <div className="lineage-step">
              <span
                className={`lineage-dot ${item.national_material ? "done" : "review"}`}
              >
                <ShieldCheck size={14} />
              </span>
              <div>
                <b>
                  {item.national_material
                    ? "Mapped to national material"
                    : "Human review"}
                </b>
                <span>
                  {item.national_material?.national_code ??
                    "Approval required before mapping"}
                </span>
              </div>
            </div>
            <div className="lineage-foot">
              <History size={14} /> Traceable source history
            </div>
          </div>
          <div className="panel detail-link-panel">
            <h3>Related records</h3>
            <p>
              Search for similar source records or view the national master.
            </p>
            <Link
              to={`/materials?q=${encodeURIComponent(item.grade ?? item.legacy_material_code)}`}
              className="text-link"
            >
              Find similar materials <ArrowRight size={14} />
            </Link>
            {item.national_material && (
              <Link to="/national-materials" className="text-link">
                {item.national_material.national_code} <Link2 size={14} />
              </Link>
            )}
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
