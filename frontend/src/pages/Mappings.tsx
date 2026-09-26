import { useEffect, useState } from "react";
import { ArrowRight, GitCompareArrows } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import {
  EmptyState,
  LoadingSkeleton,
  PageTitle,
  SearchField,
  StatusBadge,
} from "../components/common";
import type { NationalMaterial } from "../types";

export default function Mappings() {
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
    `${item.national_code} ${item.standard_description}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="SOURCE-TO-NATIONAL LINEAGE"
        title="CPSE Mappings"
        description="Explore how original codes connect to approved national material identities."
      />
      <div className="explorer-toolbar">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search an NMC or source code…"
        />
        <span className="toolbar-count">
          <GitCompareArrows size={15} />
          {filtered.length} mapped identities
        </span>
      </div>
      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={GitCompareArrows}
            title="No approved mappings yet"
            body="Source-to-national links become available after a reviewer approves a match."
          />
        </div>
      ) : (
        <div className="mapping-cards">
          {filtered.map((item) => (
            <article className="panel mapping-card" key={item.id}>
              <div className="mapping-card-top">
                <div className="national-code-mark">{item.national_code}</div>
                <StatusBadge status={item.approval_status} />
              </div>
              <h2>{item.standard_description}</h2>
              <div className="mapping-card-meta">
                <span>{item.cpse_mappings ?? "—"} source organizations</span>
                <span>Version {item.version}</span>
              </div>
              <div className="mapping-flow">
                <div>
                  <small>NATIONAL IDENTITY</small>
                  <b>{item.national_code}</b>
                </div>
                <ArrowRight size={16} />
                <div>
                  <small>ORIGINAL SOURCE CODES</small>
                  <b>{item.cpse_mappings ?? "View mappings"}</b>
                </div>
              </div>
              <Link className="text-link" to={`/national-materials/${item.id}`}>
                View mapping lineage <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
