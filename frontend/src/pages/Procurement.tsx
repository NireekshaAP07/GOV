import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Handshake,
  Info,
  PackageCheck,
  TrendingUp,
} from "lucide-react";
import { api } from "../services/api";
import {
  EmptyState,
  LoadingSkeleton,
  PageTitle,
  StatusBadge,
} from "../components/common";

type Opportunity = {
  material: string;
  material_ids: number[];
  participating_cpses: Record<string, number>;
  organization_count: number;
  combined_demand: number;
  historical_spend: number;
  supplier_overlap: string[];
  opportunity_flag: string;
};
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
export default function Procurement() {
  const [data, setData] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .procurement()
      .then((r) => setData(r.opportunities as Opportunity[]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <PageTitle
        eyebrow="COLLABORATIVE DEMAND SIGNALS"
        title="Procurement Opportunities"
        description="See where shared material identities reveal combined demand across CPSEs."
        actions={
          <span className="approval-note">
            <Info size={15} /> Potential opportunities, not savings claims
          </span>
        }
      />
      <div className="procurement-intro">
        <div className="procurement-intro-icon">
          <Handshake size={20} />
        </div>
        <div>
          <b>Identify potential demand consolidation.</b>
          <span>
            Signals are based on recorded quantities and historical spend. They
            do not promise savings or replace procurement review.
          </span>
        </div>
      </div>
      {loading ? (
        <LoadingSkeleton />
      ) : data.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={PackageCheck}
            title="No shared demand signals yet"
            body="Procurement opportunities appear when multiple CPSEs have records for comparable materials."
          />
        </div>
      ) : (
        <div className="opportunity-grid">
          {data.map((item, index) => (
            <article
              className="panel opportunity-card"
              key={`${item.material}-${index}`}
            >
              <div className="opportunity-top">
                <span className="eyebrow">
                  POTENTIAL CONSOLIDATION OPPORTUNITY
                </span>
                <span className="opportunity-icon">
                  <TrendingUp size={17} />
                </span>
              </div>
              <h2>{item.material}</h2>
              <div className="opportunity-demand">
                <div>
                  <span>Combined recorded demand</span>
                  <b>
                    {item.combined_demand.toLocaleString("en-IN")}{" "}
                    <small>units</small>
                  </b>
                </div>
                <div>
                  <span>Participating organizations</span>
                  <b>
                    {item.organization_count} <small>CPSEs</small>
                  </b>
                </div>
              </div>
              <div className="demand-orgs">
                {Object.entries(item.participating_cpses).map(
                  ([cpse, quantity]) => (
                    <div key={cpse}>
                      <span>
                        <i className="cpse-avatar">{cpse.slice(0, 1)}</i>
                        <b>{cpse}</b>
                      </span>
                      <strong>{quantity.toLocaleString("en-IN")} units</strong>
                    </div>
                  ),
                )}
              </div>
              <div className="opportunity-meta">
                <span>Historical recorded spend</span>
                <b>{money(item.historical_spend)}</b>
              </div>
              <div className="opportunity-bottom">
                <StatusBadge status="Potential opportunity" />
                <span>
                  {item.supplier_overlap?.length
                    ? `${item.supplier_overlap.length} shared supplier${item.supplier_overlap.length === 1 ? "" : "s"}`
                    : "Supplier overlap not available"}
                </span>
                <ArrowUpRight size={16} />
              </div>
              <p className="small-copy">
                Historical values are descriptive only. No savings estimate is
                inferred.
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
