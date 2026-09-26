import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleCheck,
  ClipboardCheck,
  FileUp,
  GitCompareArrows,
  Landmark,
  Layers3,
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
import { InlineError, LoadingSkeleton, PageTitle } from "../components/common";
import { useLoad } from "../components/common";
import type { DashboardData } from "../types";

const format = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export default function Overview() {
  const { data, loading, error } = useLoad<DashboardData>(() =>
    api.dashboard(),
  );
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
    { name: "Mapped", value: metrics.approved_mappings, color: "#6f8d7c" },
    { name: "Pending", value: metrics.pending_reviews, color: "#dca582" },
    { name: "Unmapped", value: metrics.unmapped_materials, color: "#e8e5dc" },
  ];
  const confidence = [
    {
      name: "Strong suggestions",
      value: metrics.confidence_distribution.strong,
      tone: "sage",
    },
    {
      name: "Human review",
      value: metrics.confidence_distribution.review,
      tone: "peach",
    },
    {
      name: "Manual investigation",
      value: metrics.confidence_distribution.investigate,
      tone: "sand",
    },
    {
      name: "No recommendation",
      value: Math.max(
        0,
        metrics.unmapped_materials -
          metrics.confidence_distribution.strong -
          metrics.confidence_distribution.review -
          metrics.confidence_distribution.investigate,
      ),
      tone: "neutral",
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow={new Intl.DateTimeFormat("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date())}
        title="Good morning, Nireeksha"
        description="Here's what's happening across your material master today."
        actions={
          <Link to="/import" className="button button-primary">
            <FileUp size={16} /> Import materials
          </Link>
        }
      />
      <div className="journey-strip">
        <div>
          <span className="journey-kicker">
            <Sparkles size={14} /> The national material journey
          </span>
          <strong>From separate records to shared confidence.</strong>
        </div>
        <div className="journey-steps">
          <span>Import</span>
          <i />
          <span>Understand</span>
          <i />
          <span>Compare</span>
          <i />
          <span>Review</span>
          <i />
          <span>Unify</span>
        </div>
      </div>
      {error && <InlineError message={error} />}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <>
          <section className="stats-grid" aria-label="Material master summary">
            <StatCard
              title="Total materials"
              value={format(metrics.total_cpse_materials)}
              subtitle={`Across ${Object.keys(metrics.materials_by_cpse).length || 5} CPSEs`}
              icon={Boxes}
              tone="sage"
              change="8.2%"
              direction="up"
            />
            <StatCard
              title="National materials"
              value={format(metrics.total_national_materials)}
              subtitle="Approved identities"
              icon={Landmark}
              tone="clay"
              change="4.6%"
              direction="up"
            />
            <StatCard
              title="Pending reviews"
              value={format(metrics.pending_reviews)}
              subtitle="Human decision needed"
              icon={ClipboardCheck}
              tone="peach"
              change="12 today"
              direction="flat"
            />
            <StatCard
              title="Duplicate clusters"
              value={format(metrics.duplicate_clusters)}
              subtitle="Across material records"
              icon={GitCompareArrows}
              tone="sand"
              change="View clusters"
              direction="down"
              link="/duplicates"
            />
            <StatCard
              title="Mapping coverage"
              value={`${(metrics.mapping_coverage * 100).toFixed(1)}%`}
              subtitle="Source codes mapped"
              icon={CircleCheck}
              tone="light"
              change="+2.1% this month"
              direction="up"
            />
          </section>
          <section className="dashboard-grid">
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">CATALOG OVERVIEW</span>
                  <h2>Materials by CPSE</h2>
                  <p>Source records currently represented in the master</p>
                </div>
                <button className="select-button">
                  This month <ArrowDownRight size={14} />
                </button>
              </div>
              <div className="chart-wrap bar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cpseData}
                    margin={{ top: 16, right: 12, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="#eceae2"
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#777e77", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#949890", fontSize: 11 }}
                      tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: "#f6f3eb" }}
                      contentStyle={{
                        border: "1px solid #e8e4db",
                        borderRadius: 12,
                        boxShadow: "0 8px 24px #39382a12",
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#789083"
                      radius={[7, 7, 0, 0]}
                      barSize={34}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="panel chart-panel coverage-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">STANDARDIZATION</span>
                  <h2>Mapping coverage</h2>
                  <p>Progress toward a shared national identity</p>
                </div>
                <button
                  className="icon-button subtle"
                  aria-label="Coverage details"
                >
                  <Layers3 size={17} />
                </button>
              </div>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={coverageData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={66}
                      outerRadius={91}
                      paddingAngle={3}
                      stroke="none"
                      cornerRadius={5}
                    >
                      {coverageData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #e8e4db",
                        borderRadius: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>
                    {(metrics.mapping_coverage * 100).toFixed(1)}%
                  </strong>
                  <span>mapped</span>
                </div>
              </div>
              <div className="legend-list">
                {coverageData.map((entry) => (
                  <div key={entry.name}>
                    <span>
                      <i style={{ background: entry.color }} />
                      {entry.name}
                    </span>
                    <b>{format(entry.value)}</b>
                  </div>
                ))}
              </div>
              <Link to="/mappings" className="text-link coverage-link">
                Explore mappings <ArrowRight size={14} />
              </Link>
            </div>
            <div className="panel confidence-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">RECOMMENDATION QUALITY</span>
                  <h2>Confidence distribution</h2>
                  <p>Review is always in a person's hands</p>
                </div>
                <Link to="/reviews" className="text-link">
                  View queue <ArrowRight size={14} />
                </Link>
              </div>
              <div className="confidence-rows">
                {confidence.map((entry) => {
                  const max = Math.max(
                    1,
                    ...confidence.map((item) => item.value),
                  );
                  return (
                    <div className="confidence-row" key={entry.name}>
                      <div>
                        <span>{entry.name}</span>
                        <b>{format(entry.value)}</b>
                      </div>
                      <div className="progress-track">
                        <span
                          className={`progress-fill ${entry.tone}`}
                          style={{
                            width: `${Math.max(2, (entry.value / max) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">SYNTHETIC ACTIVITY EXAMPLES</span>
                  <h2>A little progress, every day</h2>
                  <p>Sample events · live audit history is not available yet</p>
                </div>
                <Link to="/audit" className="text-link">
                  Full history <ArrowRight size={14} />
                </Link>
              </div>
              <div className="activity-list">
                {demoActivity.map((event, index) => (
                  <div className="activity-item" key={event.title}>
                    <div className={`activity-icon ${event.tone}`}>
                      {index === 0 ? (
                        <CircleCheck size={16} />
                      ) : index === 1 ? (
                        <GitCompareArrows size={16} />
                      ) : index === 2 ? (
                        <FileUp size={16} />
                      ) : (
                        <Landmark size={16} />
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
            </div>
          </section>
          <div className="callout-banner">
            <div className="callout-icon">
              <Sparkles size={19} />
            </div>
            <div>
              <b>Every recommendation keeps its source record.</b>
              <span>
                Original CPSE codes remain traceable through review, approval
                and mapping.
              </span>
            </div>
            <Link to="/reviews" className="button button-soft">
              Review suggestions <ArrowRight size={15} />
            </Link>
          </div>
        </>
      )}
    </>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  change,
  direction,
  link,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Boxes;
  tone: string;
  change: string;
  direction: string;
  link?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon ${tone}`}>
          <Icon size={18} />
        </div>
        <span className={`stat-change ${direction}`}>
          {direction === "up" ? (
            <ArrowUpRight size={13} />
          ) : direction === "down" ? (
            <ArrowDownRight size={13} />
          ) : null}
          {link ? <Link to={link}>{change}</Link> : change}
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  );
}
