import { useEffect, useState } from "react";
import { ArrowRight, Landmark, Search as SearchIcon } from "lucide-react";
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
        eyebrow="APPROVED NATIONAL IDENTITIES"
        title="National Material Master"
        description="A stable national identity, linked back to the source records that informed it."
      />
      <div className="explorer-toolbar">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search national code, description or grade…"
        />
        <span className="toolbar-count">
          <Landmark size={15} />
          {filtered.length} national materials
        </span>
      </div>
      <div className="panel table-panel">
        {loading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No national materials yet"
            body="Approved material identities will appear here after a human review."
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>National code</th>
                  <th>Standard description</th>
                  <th>Category</th>
                  <th>Material</th>
                  <th>Grade</th>
                  <th>CPSE mappings</th>
                  <th>Version</th>
                  <th>Approval status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="code-link"
                        to={`/national-materials/${item.id}`}
                      >
                        {item.national_code}
                      </Link>
                    </td>
                    <td>
                      <Link
                        className="description-link"
                        to={`/national-materials/${item.id}`}
                      >
                        {item.standard_description}
                      </Link>
                    </td>
                    <td>{humanize(item.category)}</td>
                    <td>{humanize(item.material)}</td>
                    <td>
                      <span className="grade-tag">{item.grade ?? "—"}</span>
                    </td>
                    <td>
                      <span className="mapping-count">
                        {item.cpse_mappings ?? "—"} CPSEs
                      </span>
                    </td>
                    <td>v{item.version}</td>
                    <td>
                      <StatusBadge status={item.approval_status} />
                    </td>
                    <td>
                      <Link
                        className="row-arrow"
                        to={`/national-materials/${item.id}`}
                        aria-label="Open national material"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        setMappings((await api.mappings(row.national_code)).mappings);
      })
      .finally(() => setLoading(false));
  }, [id]);
  if (loading) return <LoadingSkeleton rows={5} />;
  if (!item)
    return (
      <EmptyState
        title="National material not found"
        body="This national identity may no longer be available."
      />
    );
  return (
    <>
      <PageTitle
        eyebrow="NATIONAL MATERIAL MASTER / RECORD"
        title={item.national_code}
        description={item.standard_description}
        actions={<StatusBadge status={item.approval_status} />}
      />
      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon sage">
                <Landmark size={18} />
              </div>
              <div>
                <h2>Standard attributes</h2>
                <p>Version {item.version} · Persistent national identity</p>
              </div>
            </div>
            <div className="attribute-grid">
              {[
                ["Category", humanize(item.category)],
                ["Material", humanize(item.material)],
                ["Grade", item.grade ?? "—"],
                ...Object.entries(item.technical_attributes ?? {}).map(
                  ([key, value]) => [humanize(key), String(value)],
                ),
              ].map(([label, value]) => (
                <div className="info-field" key={label}>
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </section>
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon clay">
                <Landmark size={18} />
              </div>
              <div>
                <h2>CPSE mappings</h2>
                <p>
                  Original source codes linked to this approved national
                  material.
                </p>
              </div>
            </div>
            {mappings.length ? (
              <div className="mapping-lineage">
                {mappings.map((mapping) => (
                  <div
                    className="mapping-record"
                    key={`${mapping.cpse_code}-${mapping.legacy_material_code}`}
                  >
                    <div className="mapping-source">
                      <span className="cpse-avatar">
                        {mapping.cpse_code[0]}
                      </span>
                      <div>
                        <b>{mapping.cpse_name}</b>
                        <span>{mapping.cpse_code}</span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="muted" />
                    <div>
                      <b className="mono">{mapping.legacy_material_code}</b>
                      <span>{mapping.original_description}</span>
                    </div>
                    <ConfidenceBadge value={mapping.confidence} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No source mappings found"
                body="The backend has not returned CPSE mappings for this national code."
              />
            )}
          </section>
          <section className="panel detail-panel">
            <div className="section-heading">
              <div className="section-icon sand">
                <Landmark size={18} />
              </div>
              <div>
                <h2>Approval lineage</h2>
                <p>Traceable national identity lifecycle.</p>
              </div>
            </div>
            <div className="lineage-horizontal">
              <span>Original source records</span>
              <i />
              <span>AI recommendation</span>
              <i />
              <span>Human approval</span>
              <i />
              <b>{item.national_code}</b>
            </div>
            <p className="muted small-copy">
              The current backend exposes mapping details but does not provide a
              version history or audit-read endpoint.
            </p>
          </section>
        </div>
        <aside className="detail-aside">
          <div className="panel lineage-panel">
            <div className="eyebrow">IDENTITY</div>
            <h3>{item.national_code}</h3>
            <p>{item.standard_description}</p>
            <div className="lineage-foot">
              <StatusBadge status={item.approval_status} />
              <span>Version {item.version}</span>
            </div>
          </div>
          <div className="panel detail-link-panel">
            <h3>Source lineage</h3>
            <p>
              {mappings.length} original source record
              {mappings.length === 1 ? "" : "s"} linked. Legacy codes are
              preserved.
            </p>
            <Link to="/mappings" className="text-link">
              Open mapping explorer <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
