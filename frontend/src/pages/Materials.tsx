import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  ExternalLink,
  Filter,
  Landmark,
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
  const queryTerms = applied.toLowerCase().split(/\s+/).filter(Boolean);
  const nationalResults = national
    .filter((item) =>
      queryTerms.some((term) =>
        `${item.national_code} ${item.standard_description} ${item.grade ?? ""}`
          .toLowerCase()
          .includes(term),
      ),
    )
    .slice(0, 5);
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
  return (
    <>
      <PageTitle
        eyebrow="SOURCE RECORDS"
        title="Material Explorer"
        description="Find and trace original material records across participating CPSEs."
        actions={
          <Link to="/import" className="button button-primary">
            <Boxes size={16} /> Add materials
          </Link>
        }
      />
      <div className="explorer-toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          onSubmit={() => {
            setApplied(query);
            setParams(query ? { q: query } : {});
          }}
          placeholder="Search by material code, description, category or specification…"
        />
        <div className="toolbar-count">
          <SlidersHorizontal size={15} />
          {materials.length} records
        </div>
      </div>
      <div className="filters-row">
        <span className="filters-label">
          <Filter size={14} /> Filter by
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
          label="Mapping status"
          value={filters.mapping_status}
          options={["APPROVED", "PENDING", "UNMAPPED"]}
          onChange={(v) => update("mapping_status", v)}
        />
        <button
          className="button button-quiet"
          onClick={() =>
            setFilters({
              cpse: "",
              category: "",
              material: "",
              grade: "",
              unit: "",
              confidence: "",
              mapping_status: "",
            })
          }
        >
          Clear
        </button>
      </div>
      {error && <div className="inline-error">{error}</div>}
      <div className="panel table-panel">
        <div className="table-topline">
          <div>
            <b>Material records</b>
            <span>
              Original codes and descriptions stay attached to every source
              record.
            </span>
          </div>
          <button className="button button-quiet">
            <ExternalLink size={14} /> Export
          </button>
        </div>
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : materials.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No matching materials"
            body="Try another code or description, or clear a filter to broaden your search."
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CPSE</th>
                  <th>Legacy code</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Material</th>
                  <th>Grade</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th />
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
                        {material.cpse_code ?? `CPSE ${material.cpse_id}`}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="code-link"
                        to={`/materials/${material.id}`}
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
                      <small className="normalized-cell">
                        {material.normalized_description}
                      </small>
                    </td>
                    <td>{humanize(material.category)}</td>
                    <td>{humanize(material.material)}</td>
                    <td>
                      <span className="grade-tag">{material.grade ?? "—"}</span>
                    </td>
                    <td>{material.unit ?? "EA"}</td>
                    <td>
                      <StatusBadge
                        status={
                          material.mapping?.status ??
                          (material.national_material
                            ? "APPROVED"
                            : "PENDING REVIEW")
                        }
                      />
                      {material.national_material && (
                        <Link
                          className="national-inline-link"
                          to="/national-materials"
                        >
                          {material.national_material.national_code}
                        </Link>
                      )}
                    </td>
                    <td>
                      <ConfidenceBadge
                        value={
                          material.mapping?.confidence ?? material.similarity
                        }
                      />
                    </td>
                    <td>
                      <Link
                        className="row-arrow"
                        to={`/materials/${material.id}`}
                        aria-label={`Open ${material.legacy_material_code}`}
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
      {nationalResults.length > 0 && (
        <section className="panel national-search-panel">
          <div className="national-search-heading">
            <div>
              <span className="eyebrow">NATIONAL MATERIALS</span>
              <h2>Related approved identities</h2>
              <p>
                National results are shown separately from original CPSE
                records.
              </p>
            </div>
            <Landmark size={18} />
          </div>
          <div className="national-search-list">
            {nationalResults.map((item) => (
              <Link key={item.id} to={`/national-materials/${item.id}`}>
                <span>
                  <b>{item.national_code}</b>
                  <small>{item.standard_description}</small>
                </span>
                <StatusBadge status={item.approval_status} />
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="table-footnote">
        <Sparkles size={14} /> Material suggestions are AI-assisted; source
        records remain unchanged.{" "}
        <span>Results are limited to records returned by backend search.</span>
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
