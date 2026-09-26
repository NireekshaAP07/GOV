import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  FileText,
  LockKeyhole,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageTitle } from "../components/common";
import { demoActivity } from "../data/demo";

export function Audit() {
  return (
    <>
      <PageTitle
        eyebrow="TRACEABILITY & ACCOUNTABILITY"
        title="Audit & Governance"
        description="Review decisions should be understandable and source material should remain traceable."
      />
      <div className="governance-notice">
        <ShieldCheck size={18} />
        <div>
          <b>
            Audit history is planned but not exposed by the current backend.
          </b>
          <span>
            The events below are synthetic examples for the SIH demonstration,
            not live audit records.
          </span>
        </div>
      </div>
      <div className="panel audit-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">SYNTHETIC DEMO ACTIVITY</span>
            <h2>Recent material master events</h2>
            <p>Sample lineage across ingestion, matching and human approval.</p>
          </div>
        </div>
        <div className="audit-timeline">
          {demoActivity.map((item, index) => (
            <div className="audit-event" key={item.title}>
              <span className={`audit-dot ${item.tone}`} />
              <div>
                <time>{item.time}</time>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                {index === 0 && (
                  <Link to="/national-materials/1" className="text-link">
                    View resulting national material <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="governance-cards">
        <div className="panel">
          <ShieldCheck size={19} />
          <b>Human approval</b>
          <span>
            Recommendations remain suggestions until a reviewer decides.
          </span>
        </div>
        <div className="panel">
          <FileText size={19} />
          <b>Source preservation</b>
          <span>Original CPSE codes and descriptions are retained.</span>
        </div>
        <div className="panel">
          <LockKeyhole size={19} />
          <b>API authentication</b>
          <span>
            No authentication mechanism is currently configured in the backend.
          </span>
        </div>
      </div>
    </>
  );
}

export function SettingsPage() {
  return (
    <>
      <PageTitle
        eyebrow="YOUR WORKSPACE"
        title="Settings"
        description="A few useful details about this SIH demonstration environment."
      />
      <div className="settings-grid">
        <section className="panel detail-panel">
          <div className="section-heading">
            <div className="section-icon sage">
              <Settings size={18} />
            </div>
            <div>
              <h2>Connection</h2>
              <p>Frontend API configuration</p>
            </div>
          </div>
          <div className="settings-row">
            <span>API base URL</span>
            <code>
              {import.meta.env.VITE_API_BASE_URL ||
                "/api (Vite proxy → localhost:8000)"}
            </code>
          </div>
          <div className="settings-row">
            <span>Current mode</span>
            <code>
              Backend-connected when available; labeled synthetic data fallback
            </code>
          </div>
          <div className="settings-row">
            <span>Authentication</span>
            <code>Not configured in the current backend</code>
          </div>
        </section>
        <section className="panel detail-panel">
          <div className="section-heading">
            <div className="section-icon clay">
              <BookOpen size={18} />
            </div>
            <div>
              <h2>About this prototype</h2>
              <p>National Unified Material Master Framework</p>
            </div>
          </div>
          <p className="settings-about">
            A friendly workspace to help CPSE teams compare source material
            records, review AI-assisted matches and create traceable national
            identities.
          </p>
          <Link to="/help" className="text-link">
            Read the integration notes <ArrowRight size={14} />
          </Link>
        </section>
      </div>
    </>
  );
}

export function HelpPage() {
  return (
    <>
      <PageTitle
        eyebrow="HELP & GUIDANCE"
        title="A clearer path to shared material identities"
        description="The workspace makes complex matching easier to follow while keeping people in control."
      />
      <div className="help-grid">
        {[
          [
            "01",
            "Import source records",
            "Upload a CPSE CSV or Excel file. Your original codes and descriptions stay attached.",
          ],
          [
            "02",
            "Understand the material",
            "Normalization and attribute extraction prepare a comparable technical fingerprint.",
          ],
          [
            "03",
            "Compare candidates",
            "Suggestions include the matching attributes, confidence and visible technical conflicts.",
          ],
          [
            "04",
            "Review with context",
            "A human reviewer can approve, reject or adjust a standard description.",
          ],
          [
            "05",
            "Create a national identity",
            "Approval creates an NMC and maps the source codes to that persistent identity.",
          ],
          [
            "06",
            "Follow the lineage",
            "Search national materials and mapping records to trace back to the original CPSE data.",
          ],
        ].map(([number, title, body]) => (
          <div className="panel help-card" key={number}>
            <span>{number}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </div>
        ))}
      </div>
      <div className="help-endnote">
        <CircleHelp size={17} />{" "}
        <span>
          CSV and Excel imports are supported by the current backend. JSON/XML
          import, authentication and live audit-history reads are not available
          in this version.
        </span>
      </div>
    </>
  );
}
