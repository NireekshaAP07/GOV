import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleCheck,
  ClipboardCheck,
  FileUp,
  GitCompareArrows,
  Landmark,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { demoActivity } from "../data/demo";
import {
  InlineError,
  LoadingSkeleton,
  MetricCard,
  NationalJourney,
  PageTitle,
  useLoad,
} from "../components/common";
import type { DashboardData } from "../types";
import { useTheme } from "../context/ThemeContext";

const format = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export default function Overview() {
  const { data, loading, error } = useLoad<DashboardData>(() => api.dashboard());
  const { resolvedTheme } = useTheme();

  const metrics = data ?? {
    total_cpse_materials: 0,
    total_national_materials: 0,
    pending_reviews: 0,
    duplicate_clusters: 0,
    mapping_coverage: 0,
    duplicates_detected: 0,
    approved_mappings: 0,
    unmapped_materials: 0,
    materials_by_cpse: {},
    materials_by_category: {},
    confidence_distribution: { strong: 0, review: 0, investigate: 0 },
  };

  const cpseData = Object.entries(metrics.materials_by_cpse).map(
    ([name, total]) => ({ name, total }),
  );

  const coverageData = [
    {
      name: "Mapped (NMC Approved)",
      value: metrics.approved_mappings || 1,
      color: resolvedTheme === "dark" ? "#10b981" : "#047857",
    },
    {
      name: "Pending Review",
      value: metrics.pending_reviews || 1,
      color: resolvedTheme === "dark" ? "#fbbf24" : "#d97706",
    },
    {
      name: "Unmapped Records",
      value: metrics.unmapped_materials || 1,
      color: resolvedTheme === "dark" ? "#334155" : "#cbd5e1",
    },
  ];

  const confidence = [
    {
      name: "Strong Match (>=95%)",
      value: metrics.confidence_distribution.strong,
      tone: "emerald",
      desc: "Deterministic rule agreement across attributes",
    },
    {
      name: "Human Review (80-94%)",
      value: metrics.confidence_distribution.review,
      tone: "amber",
      desc: "Semantic match with minor attribute variance",
    },
    {
      name: "Manual Investigation (<80%)",
      value: metrics.confidence_distribution.investigate,
      tone: "purple",
      desc: "Conflicting specs or incomplete descriptions",
    },
  ];

  const maxConfidence = Math.max(1, ...confidence.map((item) => item.value));

  const isDark = resolvedTheme === "dark";
  const gridStroke = isDark ? "#1e293b" : "#e2e8f0";
  const textFill = isDark ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark ? "#111827" : "#ffffff";
  const tooltipBorder = isDark ? "#334155" : "#cbd5e1";

  return (
    <>
      <PageTitle
        eyebrow="NATIONAL CPSE STANDARDIZATION PLATFORM"
        title="Material Master Command Center"
        description="Unified material governance, cross-CPSE deduplication and human-supervised national code allocation."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/reviews" className="button button-outline">
              <ClipboardCheck size={16} /> Review Queue ({metrics.pending_reviews})
            </Link>
            <Link to="/import" className="button button-primary">
              <FileUp size={16} /> + Import Materials
            </Link>
          </div>
        }
      />

      {/* Interactive National Journey Stepper */}
      <NationalJourney />

      {error && <InlineError message={error} />}

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <>
          {/* Top 5 KPI Metrics */}
          <section className="stats-grid" aria-label="Key Performance Indicators">
            <MetricCard
              title="Total CPSE Records"
              value={format(metrics.total_cpse_materials)}
              subtitle={`Across ${Object.keys(metrics.materials_by_cpse).length || 5} Central Public Enterprises`}
              icon={Boxes}
              tone="emerald"
              change="+8.2% Q3"
              direction="up"
            />
            <MetricCard
              title="National Materials"
              value={format(metrics.total_national_materials)}
              subtitle="Allocated NMC Codes"
              icon={Landmark}
              tone="cyan"
              change="+4.6% YTD"
              direction="up"
              link="/national-materials"
            />
            <MetricCard
              title="Pending Reviews"
              value={format(metrics.pending_reviews)}
              subtitle="Human decision required"
              icon={ClipboardCheck}
              tone="amber"
              change="Action needed"
              direction="flat"
              link="/reviews"
            />
            <MetricCard
              title="Duplicate Clusters"
              value={format(metrics.duplicate_clusters)}
              subtitle="Cross-enterprise candidate groups"
              icon={GitCompareArrows}
              tone="purple"
              change="Explore"
              direction="down"
              link="/duplicates"
            />
            <MetricCard
              title="Mapping Coverage"
              value={`${(metrics.mapping_coverage * 100).toFixed(1)}%`}
              subtitle="Source codes unified to NMC"
              icon={CircleCheck}
              tone="blue"
              change="+2.4% this mo"
              direction="up"
              link="/mappings"
            />
          </section>

          {/* Main Visualizations Grid */}
          <section className="dashboard-grid">
            {/* Materials by CPSE Bar Chart */}
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">ENTERPRISE INGESTION</span>
                  <h2>Materials by CPSE</h2>
                  <p>Distribution of source records ingested from participating enterprises</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-subtle)",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Active Repositories
                  </span>
                </div>
              </div>

              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cpseData}
                    margin={{ top: 16, right: 12, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke={gridStroke}
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: textFill, fontSize: 12, fontWeight: 500 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: textFill, fontSize: 11 }}
                      tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: "10px",
                        boxShadow: "var(--shadow-lg)",
                        color: isDark ? "#f8fafc" : "#0f172a",
                        fontSize: "12px",
                      }}
                      formatter={(val: number) => [`${format(val)} records`, "Total"]}
                    />
                    <Bar
                      dataKey="total"
                      fill={isDark ? "#10b981" : "#047857"}
                      radius={[6, 6, 0, 0]}
                      barSize={38}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mapping Coverage Donut */}
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">STANDARDIZATION PROGRESS</span>
                  <h2>Mapping Coverage</h2>
                  <p>Unified catalog completion vs pending legacy backlog</p>
                </div>
                <Link to="/mappings" className="topbar-icon-btn" title="View detailed mappings">
                  <Layers3 size={17} />
                </Link>
              </div>

              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={coverageData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="none"
                      cornerRadius={4}
                    >
                      {coverageData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: "10px",
                        boxShadow: "var(--shadow-lg)",
                        fontSize: "12px",
                      }}
                      formatter={(val: number) => [format(val), "Count"]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="donut-center">
                  <strong>{(metrics.mapping_coverage * 100).toFixed(1)}%</strong>
                  <span>Standardized</span>
                </div>
              </div>

              <div className="legend-list">
                {coverageData.map((entry) => (
                  <div key={entry.name} className="legend-item">
                    <span className="legend-label">
                      <i className="legend-dot" style={{ background: entry.color }} />
                      <span>{entry.name}</span>
                    </span>
                    <b style={{ fontFamily: "var(--font-mono)" }}>{format(entry.value)}</b>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                <Link to="/mappings" className="button button-quiet" style={{ width: "100%", justifyContent: "center" }}>
                  Explore CPSE Mappings <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* AI Confidence Distribution */}
            <div className="panel confidence-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">INTELLIGENCE ACCURACY</span>
                  <h2>Confidence Tier Distribution</h2>
                  <p>AI suggestions categorized by attribute similarity and domain rules</p>
                </div>
                <Link to="/reviews" className="button button-soft" style={{ fontSize: "11px", height: "30px", padding: "0 10px" }}>
                  Open Queue <ArrowRight size={13} />
                </Link>
              </div>

              <div className="confidence-rows">
                {confidence.map((entry) => (
                  <div key={entry.name}>
                    <div className="confidence-row-header">
                      <div>
                        <strong style={{ fontSize: "12.5px", color: "var(--text-primary)" }}>{entry.name}</strong>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{entry.desc}</div>
                      </div>
                      <b style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>{format(entry.value)}</b>
                    </div>
                    <div className="progress-track" style={{ marginTop: "6px" }}>
                      <span
                        className={`progress-fill ${entry.tone}`}
                        style={{
                          width: `${Math.max(3, (entry.value / maxConfidence) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "20px", padding: "12px", background: "var(--bg-subtle)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={18} style={{ color: "var(--brand-primary)", flexShrink: 0 }} />
                <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                  Zero auto-commit policy: every suggestion requires verified reviewer sign-off before allocating an NMC code.
                </span>
              </div>
            </div>

            {/* Recent Standardization Events */}
            <div className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">AUDIT & LINEAGE</span>
                  <h2>Recent Standardization Events</h2>
                  <p>Recent human review decisions, batch imports and national code allocations</p>
                </div>
                <Link to="/audit" className="button button-quiet" style={{ fontSize: "11px", height: "30px", padding: "0 10px" }}>
                  Full History <ArrowRight size={13} />
                </Link>
              </div>

              <div className="activity-list">
                {demoActivity.map((event, index) => (
                  <div className="activity-item" key={event.title}>
                    <div className={`activity-icon ${index === 0 ? "emerald" : index === 1 ? "amber" : "blue"}`}>
                      {index === 0 ? (
                        <CheckCircle2 size={16} />
                      ) : index === 1 ? (
                        <GitCompareArrows size={16} />
                      ) : (
                        <FileUp size={16} />
                      )}
                    </div>
                    <div className="activity-copy">
                      <b>{event.title}</b>
                      <span>{event.detail}</span>
                    </div>
                    <time>{event.time}</time>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                <Link to="/audit" className="button button-quiet" style={{ width: "100%", justifyContent: "center" }}>
                  View Complete Lineage & Audit Log <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>

          {/* Traceability Callout Banner */}
          <div className="callout-banner">
            <div className="callout-icon">
              <Sparkles size={22} />
            </div>
            <div className="callout-body">
              <b>Source Record Preservation Guarantee</b>
              <span>
                Standardization never mutates original enterprise records. CPSE material codes, legacy descriptions, and local specifications remain 100% immutable and fully traceable through every stage.
              </span>
            </div>
            <Link to="/reviews" className="button button-primary">
              Review Suggestions <ArrowRight size={15} />
            </Link>
          </div>
        </>
      )}
    </>
  );
}
