import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Download,
  Filter,
  Landmark,
  RotateCcw,
  Search as SearchIcon,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import {
  ConfidenceBadge,
  EmptyState,
  LoadingSkeleton,
  PageTitle,
  SearchField,
  SelectField,
  StatusBadge,
} from "../components/common";
import type { Material, NationalMaterial } from "../types";

export default function Materials() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "bolt");
  const [applied, setApplied] = useState(params.get("q") || "bolt");
  const [filters, setFilters] = useState({
    cpse: "",
    category: "",
    material: "",
    grade: "",
    unit: "",
    confidence: "",
    mapping_status: "",
  });

  const [materials, setMaterials] = useState<Material[]>([]);
  const [national, setNational] = useState<NationalMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const runSearch = async (term = applied) => {
    setLoading(true);
    setError("");
    try {
      const results = await api.searchMaterials(term, filters);
      setMaterials(results);
      try {
        setNational(await api.nationalMaterials());
      } catch {
        setNational([]);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Search could not be completed",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runSearch(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, filters]);

  useEffect(() => {
    const incoming = params.get("q");
    if (incoming != null) {
      setQuery(incoming);
      setApplied(incoming);
    }
  }, [params]);

  const update = (key: keyof typeof filters, value: string) =>
    setFilters((old) => ({ ...old, [key]: value }));

  const clearFilters = () =>
    setFilters({
      cpse: "",
      category: "",
      material: "",
      grade: "",
      unit: "",
      confidence: "",
      mapping_status: "",
    });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const queryTerms = applied.toLowerCase().split(/\s+/).filter(Boolean);
  const nationalResults = national
    .filter((item) =>
      queryTerms.some((term) =>
        `${item.national_code} ${item.standard_description} ${item.grade ?? ""}`
          .toLowerCase()
          .includes(term),
      ),
    )
    .slice(0, 4);

  const filterOptions = useMemo(
    () => ({
      cpse: [
        ...new Set(
          materials.map((m) => m.cpse_code).filter(Boolean) as string[],
        ),
      ],
      category: [
        ...new Set(
          materials.map((m) => m.category).filter(Boolean) as string[],
        ),
      ],
      material: [
        ...new Set(
          materials.map((m) => m.material).filter(Boolean) as string[],
        ),
      ],
      grade: [
        ...new Set(materials.map((m) => m.grade).filter(Boolean) as string[]),
      ],
      unit: [
        ...new Set(materials.map((m) => m.unit).filter(Boolean) as string[]),
      ],
    }),
    [materials],
  );

  const exportCsv = () => {
    const headers = [
      "CPSE Code",
      "Legacy Code",
      "Original Description",
      "Normalized Description",
      "Category",
      "Material",
      "Grade",
      "Unit",
      "Status",
      "Confidence",
    ];
    const rows = materials.map((m) => [
      m.cpse_code ?? `CPSE ${m.cpse_id}`,
      m.legacy_material_code,
      `"${m.original_description.replaceAll('"', '""')}"`,
      `"${m.normalized_description.replaceAll('"', '""')}"`,
      m.category ?? "",
      m.material ?? "",
      m.grade ?? "",
      m.unit ?? "EA",
      m.mapping?.status ?? (m.national_material ? "APPROVED" : "UNMAPPED"),
      `${Math.round((m.mapping?.confidence ?? m.similarity ?? 0) * 100)}%`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `material-master-export-${applied || "all"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <PageTitle
        eyebrow="ENTERPRISE CATALOG EXPLORER"
        title="Material Intelligence Explorer"
        description="Search, trace and inspect original CPSE material records alongside normalized technical specifications."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="button button-outline"
              onClick={exportCsv}
              disabled={materials.length === 0}
            >
              <Download size={15} /> Export Dataset
            </button>
            <Link to="/import" className="button button-primary">
              <Boxes size={16} /> + Ingest Records
            </Link>
          </div>
        }
      />

      {/* Search Toolbar */}
      <div className="explorer-toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          onSubmit={() => {
            setApplied(query);
            setParams(query ? { q: query } : {});
          }}
          placeholder="Search by legacy code, description, specification, material or grade…"
        />
        <div className="toolbar-count">
          <SlidersHorizontal size={16} style={{ color: "var(--brand-primary)" }} />
          <span>
            <b>{materials.length}</b> records found
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filters-row">
        <span className="filters-label">
          <Filter size={14} /> Filters:
        </span>
        <SelectField
          label="CPSE"
          value={filters.cpse}
          options={filterOptions.cpse}
          onChange={(v) => update("cpse", v)}
        />
        <SelectField
          label="Category"
          value={filters.category}
          options={filterOptions.category}
          onChange={(v) => update("category", v)}
        />
        <SelectField
          label="Material"
          value={filters.material}
          options={filterOptions.material}
          onChange={(v) => update("material", v)}
        />
        <SelectField
          label="Grade"
          value={filters.grade}
          options={filterOptions.grade}
          onChange={(v) => update("grade", v)}
        />
        <SelectField
          label="Unit"
          value={filters.unit}
          options={filterOptions.unit}
          onChange={(v) => update("unit", v)}
        />
        <SelectField
          label="Confidence"
          value={filters.confidence}
          options={["95%", "80%", "60%"]}
          onChange={(v) => update("confidence", v)}
        />
        <SelectField
          label="Status"
          value={filters.mapping_status}
          options={["APPROVED", "PENDING", "UNMAPPED"]}
          onChange={(v) => update("mapping_status", v)}
        />

        {hasActiveFilters && (
          <button
            type="button"
            className="button button-quiet"
            onClick={clearFilters}
            style={{ fontSize: "11px", height: "34px", padding: "0 10px" }}
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        )}
      </div>

      {error && <div className="inline-error">{error}</div>}

      {/* Main Enterprise Data Table */}
      <div className="panel table-panel">
        <div className="table-topline">
          <div>
            <b>Source Material Master Records</b>
            <span>
              Original enterprise material codes and descriptions remain attached to each record.
            </span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Showing {materials.length} matching rows
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : materials.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No matching material records"
            body="Try expanding your search query or clear filters to see more results."
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  className="button button-outline"
                  onClick={clearFilters}
                >
                  <RotateCcw size={14} /> Clear all filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Enterprise (CPSE)</th>
                  <th>Legacy Code</th>
                  <th>Original Description</th>
                  <th>Standardized Description</th>
                  <th>Category</th>
                  <th>Material & Grade</th>
                  <th>Unit</th>
                  <th>Standardization Status</th>
                  <th>Confidence</th>
                  <th style={{ textAlign: "right" }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.id}>
                    <td>
                      <span className="cpse-cell">
                        <span className="cpse-avatar">
                          {(material.cpse_code ?? "C").slice(0, 1)}
                        </span>
                        <span>
                          <b>{material.cpse_code ?? `CPSE ${material.cpse_id}`}</b>
                        </span>
                      </span>
                    </td>
                    <td>
                      <Link
                        className="code-link"
                        to={`/materials/${material.id}`}
                        title="View source record details"
                      >
                        {material.legacy_material_code}
                      </Link>
                    </td>
                    <td>
                      <Link
                        className="description-link"
                        to={`/materials/${material.id}`}
                      >
                        {material.original_description}
                      </Link>
                    </td>
                    <td>
                      <span className="normalized-cell" style={{ color: "var(--text-secondary)" }}>
                        {material.normalized_description}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{humanize(material.category)}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{humanize(material.material)}</span>
                        {material.grade && <span className="grade-tag">{material.grade}</span>}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{material.unit ?? "EA"}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <StatusBadge
                          status={
                            material.mapping?.status ??
                            (material.national_material ? "APPROVED" : "PENDING REVIEW")
                          }
                        />
                        {material.national_material && (
                          <Link
                            to="/national-materials"
                            style={{
                              fontSize: "10.5px",
                              fontFamily: "var(--font-mono)",
                              color: "var(--brand-primary)",
                              fontWeight: 600,
                            }}
                          >
                            {material.national_material.national_code}
                          </Link>
                        )}
                      </div>
                    </td>
                    <td>
                      <ConfidenceBadge
                        value={material.mapping?.confidence ?? material.similarity}
                        showLabel
                      />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        className="row-arrow"
                        to={`/materials/${material.id}`}
                        aria-label={`Open details for ${material.legacy_material_code}`}
                        title="Open record specification"
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

      {/* Related National Master Identities */}
      {nationalResults.length > 0 && (
        <section
          className="panel"
          style={{
            marginTop: "20px",
            padding: "20px 24px",
            background: "linear-gradient(135deg, var(--bg-surface), var(--brand-light))",
            border: "1px solid var(--brand-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <span className="eyebrow">
                <Landmark size={14} /> APPROVED MASTER IDENTITIES
              </span>
              <h2 style={{ fontSize: "16px", marginTop: "2px" }}>
                Related National Material Codes (NMC)
              </h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Approved unified records sharing specifications with current query.
              </p>
            </div>
            <Link to="/national-materials" className="button button-soft" style={{ fontSize: "12px" }}>
              Explore Master <ArrowRight size={14} />
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "12px",
            }}
          >
            {nationalResults.map((item) => (
              <Link
                key={item.id}
                to={`/national-materials/${item.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div>
                  <b style={{ fontFamily: "var(--font-mono)", color: "var(--brand-primary)", fontSize: "12.5px" }}>
                    {item.national_code}
                  </b>
                  <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {item.standard_description}
                  </div>
                </div>
                <ArrowRight size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Information Footnote */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", color: "var(--text-muted)", fontSize: "11.5px" }}>
        <Sparkles size={14} style={{ color: "var(--brand-primary)" }} />
        <span>
          AI matching suggests candidate alignments; source records, legacy material codes and original descriptions are permanently preserved.
        </span>
      </div>
    </>
  );
}

export function humanize(value?: string | null) {
  return value
    ? value
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "—";
}
