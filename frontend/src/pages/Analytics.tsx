import { useEffect, useState } from "react";
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
import { ArrowRight, BarChart3, Download, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { EmptyState, LoadingSkeleton, PageTitle } from "../components/common";
import type { DashboardData } from "../types";

export default function Analytics() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <LoadingSkeleton rows={5} />;
  if (!data) return <EmptyState title="Analytics are unavailable" />;
  const cpses = Object.entries(data.materials_by_cpse).map(([name, total]) => ({
    name,
    total,
  }));
  const categories = Object.entries(data.materials_by_category).map(
    ([name, value], i) => ({
      name,
      value,
      color: ["#718c7d", "#d99476", "#c9b790", "#a9b7ac", "#dedbd1"][i % 5],
    }),
  );
  const confidence = [
    {
      name: "Strong suggestions",
      value: data.confidence_distribution.strong,
      color: "#718c7d",
    },
    {
      name: "Human review",
      value: data.confidence_distribution.review,
      color: "#d99476",
    },
    {
      name: "Manual investigation",
      value: data.confidence_distribution.investigate,
      color: "#c9b790",
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="NATIONAL MATERIAL INTELLIGENCE"
        title="Analytics"
        description="A clear view of material coverage, review confidence and catalog standardization."
        actions={
          <button
            className="button button-outline"
            onClick={() => window.print()}
          >
            <Download size={15} /> Export view
          </button>
        }
      />
      <div className="analytics-callout">
        <Info size={16} />
        <span>
          Metrics reflect the records and recommendations returned by the
          current backend. Confidence counts include suggestions awaiting human
          review.
        </span>
      </div>
      {cpses.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="Analytics will build as data arrives"
            body="Import material records to see CPSE coverage and matching confidence."
          />
        </div>
      ) : (
        <>
          <div className="analytics-kpis">
            <div>
              <span>Total source records</span>
              <b>{data.total_cpse_materials.toLocaleString("en-IN")}</b>
            </div>
            <div>
              <span>National identities</span>
              <b>{data.total_national_materials.toLocaleString("en-IN")}</b>
            </div>
            <div>
              <span>Pending human review</span>
              <b>{data.pending_reviews.toLocaleString("en-IN")}</b>
            </div>
            <div>
              <span>Mapping coverage</span>
              <b>{(data.mapping_coverage * 100).toFixed(1)}%</b>
            </div>
          </div>
          <div className="analytics-grid">
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">SOURCE CATALOG</span>
                  <h2>Materials by CPSE</h2>
                </div>
              </div>
              <div className="chart-wrap analytics-bar">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cpses}
                    margin={{ top: 10, right: 10, bottom: 0, left: -18 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="#eceae2"
                      strokeDasharray="3 5"
                    />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar
                      dataKey="total"
                      fill="#789083"
                      radius={[7, 7, 0, 0]}
                      barSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">STANDARDIZATION</span>
                  <h2>Materials by category</h2>
                </div>
              </div>
              <div className="category-chart">
                <div className="category-donut">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories}
                        dataKey="value"
                        innerRadius={54}
                        outerRadius={78}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {categories.map((row) => (
                          <Cell key={row.name} fill={row.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="category-legend">
                  {categories.map((row) => (
                    <div key={row.name}>
                      <span>
                        <i style={{ background: row.color }} />
                        {row.name}
                      </span>
                      <b>{row.value.toLocaleString("en-IN")}</b>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section className="panel chart-panel confidence-chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">MATCH REVIEW</span>
                  <h2>Confidence distribution</h2>
                  <p>Human decision remains part of every approval.</p>
                </div>
                <Link className="text-link" to="/reviews">
                  Open queue <ArrowRight size={14} />
                </Link>
              </div>
              <div className="confidence-chart-list">
                {confidence.map((row) => {
                  const max = Math.max(...confidence.map((r) => r.value), 1);
                  return (
                    <div key={row.name}>
                      <span>{row.name}</span>
                      <b>{row.value.toLocaleString("en-IN")}</b>
                      <i>
                        <em
                          style={{
                            width: `${(row.value / max) * 100}%`,
                            background: row.color,
                          }}
                        />
                      </i>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="panel analytics-note">
              <span className="section-icon clay">
                <BarChart3 size={18} />
              </span>
              <h2>Traceable by design</h2>
              <p>
                Source records, review decisions and mappings remain connected
                so coverage metrics can be followed back to their origin.
              </p>
              <Link to="/mappings" className="text-link">
                Explore mapping lineage <ArrowRight size={14} />
              </Link>
            </section>
          </div>
        </>
      )}
    </>
  );
}
