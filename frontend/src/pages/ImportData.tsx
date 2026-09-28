import { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  FileUp,
  Info,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { PageTitle } from "../components/common";
import { useToast } from "../context/ToastContext";

const pipelineSteps = [
  { id: "upload", label: "Upload", desc: "Select source file" },
  { id: "validate", label: "Validate", desc: "Check schema & headers" },
  { id: "normalize", label: "Normalize", desc: "Format units & terms" },
  { id: "extract", label: "Extract", desc: "Derive fingerprints" },
  { id: "match", label: "Match", desc: "Find equivalent candidates" },
  { id: "review", label: "Review", desc: "Queue for human approval" },
];

export default function ImportData() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [cpse, setCpse] = useState("BHEL");
  const [cpseName, setCpseName] = useState("Bharat Heavy Electricals Limited");
  const [busy, setBusy] = useState(false);
  const [matchingBusy, setMatchingBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const [error, setError] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);

  const choose = (candidate?: File) => {
    if (!candidate) return;
    setError("");
    if (!/\.(csv|xlsx|xls)$/i.test(candidate.name)) {
      setError(
        "Supported file types: CSV, Excel (.xlsx, .xls). JSON and XML imports require backend endpoint support.",
      );
      return;
    }
    setFile(candidate);
    setResult(null);
    setProgress(0);
    setMatchCount(null);
  };

  const importFile = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setProgress(1);

    try {
      const response = await api.importMaterials(file, cpse.trim(), cpseName.trim());
      setResult(response);
      setProgress(3);
      success(
        "File Ingested Successfully",
        `${response.imported} records normalized and saved under ${cpse}.`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "The file could not be imported";
      setError(msg);
      toastError("Import Failed", msg);
    } finally {
      setBusy(false);
    }
  };

  const findMatches = async () => {
    setMatchingBusy(true);
    setProgress(4);
    try {
      const rec = await api.recommend();
      setProgress(5);
      setMatchCount(rec.count);
      success(
        "Deterministic Matching Complete",
        `Generated ${rec.count} candidate pairs for human review.`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not prepare recommendations";
      setError(msg);
      toastError("Matching Error", msg);
    } finally {
      setMatchingBusy(false);
    }
  };

  const downloadSample = () => {
    const csv = [
      "legacy_material_code,original_description,unit,category,material,grade",
      "BOLT-10021,HEX BOLT M16X50 SS304,EA,FASTENER,STAINLESS_STEEL,SS304",
      "MAT-98231,HEXAGONAL HEAD BOLT M16 x 50 STAINLESS STEEL 304,EA,FASTENER,STAINLESS_STEEL,SS304",
      "772819,SS304 HEX HEAD BOLT M16 50MM,EA,FASTENER,STAINLESS_STEEL,SS304",
      "BEAR-6205,DEEP GROOVE BALL BEARING 6205,EA,BEARING,STEEL,6205",
      "MOTOR-415,INDUCTION MOTOR 415V 5KW,EA,ELECTRICAL,MOTOR,415V",
    ].join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "national-material-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageTitle
        eyebrow="ENTERPRISE DATA INGESTION PIPELINE"
        title="Import Material Records"
        description="Ingest CPSE material catalogs into the national master framework while preserving original enterprise codes and descriptions."
        actions={
          <button
            type="button"
            className="button button-outline"
            onClick={downloadSample}
          >
            <ArrowDownToLine size={15} /> Download CSV Template
          </button>
        }
      />

      <div className="import-layout">
        {/* Left Column: Input and Dropzone */}
        <div className="import-main">
          {/* Step 1: Enterprise Credentials & File Upload */}
          <section className="panel import-panel">
            <div className="section-heading">
              <div className="section-icon emerald">
                <FileUp size={20} />
              </div>
              <div>
                <span className="eyebrow">STEP 1 OF 2</span>
                <h2>Upload Enterprise Catalog File</h2>
                <p>
                  Upload CSV or Excel files. Schemas are validated row-by-row with full audit logging.
                </p>
              </div>
            </div>

            <div className="import-form-row">
              <label className="field-label">
                CPSE Enterprise Code
                <input
                  value={cpse}
                  onChange={(e) => setCpse(e.target.value.toUpperCase())}
                  placeholder="e.g. BHEL, NTPC, SAIL, ONGC, GAIL"
                  required
                />
              </label>
              <label className="field-label">
                Full Enterprise Legal Name
                <input
                  value={cpseName}
                  onChange={(e) => setCpseName(e.target.value)}
                  placeholder="e.g. Bharat Heavy Electricals Limited"
                  required
                />
              </label>
            </div>

            {/* Drag & Drop Area */}
            <button
              type="button"
              className={`drop-zone ${file ? "has-file" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                choose(e.dataTransfer.files[0]);
              }}
              aria-label="Upload file drop area"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                hidden
                onChange={(e) => choose(e.target.files?.[0])}
              />

              {file ? (
                <>
                  <div className="upload-file-icon">
                    <FileSpreadsheet size={26} />
                  </div>
                  <b>{file.name}</b>
                  <span>
                    {(file.size / 1024).toFixed(1)} KB · Ready to ingest into {cpse || "CPSE"}
                  </span>
                  <span className="replace-file" style={{ color: "var(--brand-primary)", marginTop: "10px", fontSize: "11px", fontWeight: 600 }}>
                    <RefreshCw size={13} style={{ display: "inline", marginRight: "4px" }} /> Choose a different file
                  </span>
                </>
              ) : (
                <>
                  <div className="upload-cloud">
                    <UploadCloud size={28} />
                  </div>
                  <b>Drag & drop your material spreadsheet here</b>
                  <span>
                    or <em>Browse Files</em> from your device
                  </span>
                  <small>Supported formats: CSV, Excel (.xlsx, .xls) · Up to 50MB per batch</small>
                </>
              )}
            </button>

            {error && (
              <div className="inline-error" style={{ marginTop: "16px" }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {file && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void importFile()}
                  disabled={busy || !cpse.trim()}
                >
                  {busy ? (
                    <>
                      <span className="mini-spinner" /> Validating & Ingesting…
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Upload & Validate Catalog
                    </>
                  )}
                </button>
              </div>
            )}
          </section>

          {/* Step 2: Ingestion & Matching Pipeline Progress */}
          <section className="panel pipeline-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">STEP 2 OF 2</span>
                <h2>Ingestion & AI Matching Lifecycle</h2>
                <p>
                  Records pass through deterministic attribute extraction before entering human review.
                </p>
              </div>
              <Info size={18} style={{ color: "var(--text-muted)" }} />
            </div>

            <div className="stepper">
              {pipelineSteps.map((step, index) => (
                <div
                  className={`step ${
                    index < progress
                      ? "complete"
                      : index === progress
                        ? "current"
                        : ""
                  }`}
                  key={step.id}
                >
                  <div className="step-dot">
                    {index < progress ? <Check size={14} /> : index + 1}
                  </div>
                  <span>{step.label}</span>
                  {index < pipelineSteps.length - 1 && <i />}
                </div>
              ))}
            </div>

            {/* Ingestion Results Card */}
            {result && (
              <div
                style={{
                  marginTop: "24px",
                  padding: "18px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--brand-light)",
                  border: "1px solid var(--brand-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--brand-primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <b style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                      {result.imported} Source Records Successfully Ingested
                    </b>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Associated with enterprise <strong>{cpse}</strong>. Raw descriptions and legacy codes remain immutable.
                    </div>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--accent-amber-light)",
                      border: "1px solid var(--accent-amber-border)",
                      fontSize: "12px",
                      color: "var(--accent-amber)",
                    }}
                  >
                    <b>{result.errors.length} rows required adjustments:</b>
                    <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                      {result.errors.slice(0, 4).map((row, i) => (
                        <li key={i}>
                          Row {row.row}: {row.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "4px" }}>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => void findMatches()}
                    disabled={matchingBusy}
                  >
                    {matchingBusy ? (
                      <>
                        <span className="mini-spinner" /> Finding candidate matches…
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Run Deterministic Matching Engine
                      </>
                    )}
                  </button>

                  <Link to="/materials" className="button button-outline">
                    View in Material Explorer
                  </Link>

                  {matchCount !== null && (
                    <Link
                      to="/reviews"
                      className="button button-soft"
                      style={{ marginLeft: "auto" }}
                    >
                      Inspect {matchCount} Match Suggestions in Review Queue <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Schema Instructions & Governance Info */}
        <aside className="import-aside">
          {/* Schema Requirements */}
          <div className="panel import-help">
            <span className="eyebrow">SCHEMA SPECIFICATION</span>
            <h3 style={{ fontSize: "15px", margin: "4px 0 10px" }}>Required Columns</h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.5 }}>
              To ensure full traceability, every row in your uploaded spreadsheet must include these two primary keys:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <FileCheck2 size={16} style={{ color: "var(--brand-primary)", marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <b style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-primary)" }}>
                    legacy_material_code
                  </b>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Your enterprise's internal material identifier (e.g. BOLT-10021).
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <FileCheck2 size={16} style={{ color: "var(--brand-primary)", marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <b style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-primary)" }}>
                    original_description
                  </b>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Unmodified engineering description from your ERP / SAP system.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <span className="optional-heading" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>
                Recommended Optional Columns:
              </span>
              <div className="optional-pills" style={{ marginTop: "8px" }}>
                <span>category</span>
                <span>material</span>
                <span>grade</span>
                <span>unit</span>
                <span>manufacturer</span>
                <span>model</span>
              </div>
            </div>

            <div className="supported-note" style={{ marginTop: "16px" }}>
              <Info size={15} style={{ flexShrink: 0 }} />
              <span>
                Files are processed locally through deterministic rule engines; no external proprietary APIs receive sensitive engineering metadata.
              </span>
            </div>
          </div>

          {/* Traceability Callout */}
          <div className="panel" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div className="stat-icon emerald" style={{ width: "32px", height: "32px" }}>
                <CheckCircle2 size={16} />
              </div>
              <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                Zero Data Loss Guarantee
              </strong>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Uploaded records remain permanently linked to their CPSE code. When a National Material Code (NMC) is approved, your legacy code remains active as a verified alias.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
