import { useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  FileSpreadsheet,
  FileUp,
  Info,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { PageTitle } from "../components/common";

const steps = ["Upload", "Validate", "Normalize", "Extract", "Match", "Review"];
export default function ImportData() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cpse, setCpse] = useState("BHEL");
  const [cpseName, setCpseName] = useState("Bharat Heavy Electricals");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const [error, setError] = useState("");
  const choose = (candidate?: File) => {
    if (!candidate) return;
    setError("");
    if (!/\.(csv|xlsx|xls)$/i.test(candidate.name)) {
      setError(
        "The current backend accepts CSV and Excel files. JSON and XML import are not available yet.",
      );
      return;
    }
    setFile(candidate);
    setResult(null);
    setProgress(0);
  };
  const importFile = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setProgress(1);
    try {
      const response = await api.importMaterials(file, cpse, cpseName);
      setResult(response);
      setProgress(3);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The file could not be imported",
      );
    } finally {
      setBusy(false);
    }
  };
  const findMatches = async () => {
    setBusy(true);
    setProgress(4);
    try {
      await api.recommend();
      setProgress(5);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not prepare recommendations",
      );
    } finally {
      setBusy(false);
    }
  };
  const download = () => {
    const csv =
      "legacy_material_code,original_description,unit,category,grade\nBOLT-10021,HEX BOLT M16X50 SS304,EA,FASTENER,SS304\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "material-import-sample.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageTitle
        eyebrow="DATA INGESTION"
        title="Bring your material data together"
        description="Upload source records and prepare them for comparison while preserving the original CPSE details."
        actions={
          <button className="button button-outline" onClick={download}>
            <ArrowDownToLine size={16} /> Download sample dataset
          </button>
        }
      />
      <div className="import-layout">
        <div className="import-main">
          <section className="panel import-panel">
            <div className="import-panel-heading">
              <div className="section-icon sage">
                <FileUp size={18} />
              </div>
              <div>
                <h2>Upload a material file</h2>
                <p>
                  One file at a time. We'll report row issues clearly so nothing
                  is silently dropped.
                </p>
              </div>
            </div>
            <div className="import-form-row">
              <label className="field-label">
                CPSE code
                <input
                  value={cpse}
                  onChange={(event) =>
                    setCpse(event.target.value.toUpperCase())
                  }
                  placeholder="e.g. BHEL"
                />
              </label>
              <label className="field-label">
                Organization name
                <input
                  value={cpseName}
                  onChange={(event) => setCpseName(event.target.value)}
                  placeholder="e.g. Bharat Heavy Electricals"
                />
              </label>
            </div>
            <button
              className={`drop-zone ${file ? "has-file" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                choose(event.dataTransfer.files[0]);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                hidden
                onChange={(event) => choose(event.target.files?.[0])}
              />
              {file ? (
                <>
                  <div className="upload-file-icon">
                    <FileSpreadsheet size={22} />
                  </div>
                  <b>{file.name}</b>
                  <span>
                    {(file.size / 1024).toFixed(1)} KB · Ready to validate
                  </span>
                  <span className="replace-file">
                    <RefreshCw size={13} /> Choose another file
                  </span>
                </>
              ) : (
                <>
                  <div className="upload-cloud">
                    <UploadCloud size={24} />
                  </div>
                  <b>Drag & drop your file here</b>
                  <span>
                    or <em>Browse files</em>
                  </span>
                  <small>
                    CSV or Excel · Backend import supports .csv, .xlsx and .xls
                  </small>
                </>
              )}
            </button>
            {error && <div className="inline-error">{error}</div>}
            {file && (
              <div className="import-actions">
                <button
                  className="button button-primary"
                  onClick={() => void importFile()}
                  disabled={busy || !cpse.trim()}
                >
                  {busy ? (
                    <>
                      <span className="mini-spinner" /> Validating file…
                    </>
                  ) : (
                    <>
                      <Check size={15} /> Upload & validate
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
          <section className="panel pipeline-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">WHAT HAPPENS NEXT</span>
                <h2>A clear path from source to review</h2>
                <p>
                  Each stage has a distinct purpose. No recommendation becomes
                  authoritative automatically.
                </p>
              </div>
              <Info size={17} className="muted" />
            </div>
            <div className="stepper">
              {steps.map((step, index) => (
                <div
                  className={`step ${index < progress ? "complete" : index === progress ? "current" : ""}`}
                  key={step}
                >
                  <div className="step-dot">
                    {index < progress ? <Check size={14} /> : index + 1}
                  </div>
                  <span>{step}</span>
                  {index < steps.length - 1 && <i />}
                </div>
              ))}
            </div>
            {result && (
              <div className="import-result">
                <div className="result-success">
                  <Check size={17} />
                  <b>{result.imported} source records imported</b>
                  <span>
                    Original CPSE codes and descriptions were preserved.
                  </span>
                </div>
                {result.errors.length > 0 && (
                  <div className="row-errors">
                    <b>{result.errors.length} rows need attention</b>
                    {result.errors.slice(0, 5).map((row) => (
                      <span key={`${row.row}-${row.error}`}>
                        Row {row.row}: {row.error}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  className="button button-soft"
                  onClick={() => void findMatches()}
                  disabled={busy}
                >
                  <RefreshCw size={15} /> Find match suggestions{" "}
                  <ArrowRight size={14} />
                </button>
                {progress >= 5 && (
                  <span className="pipeline-complete">
                    Suggestions are available in{" "}
                    <Link to="/reviews">AI Match Review</Link>.
                  </span>
                )}
              </div>
            )}
          </section>
        </div>
        <aside className="import-aside">
          <div className="panel import-help">
            <span className="eyebrow">BEFORE YOU UPLOAD</span>
            <h3>Keep a familiar file structure</h3>
            <p>
              We use the source code and description to create each preserved
              material record.
            </p>
            <div className="required-column">
              <Check size={14} />
              <div>
                <b>legacy_material_code</b>
                <span>Your CPSE's original material code</span>
              </div>
            </div>
            <div className="required-column">
              <Check size={14} />
              <div>
                <b>original_description</b>
                <span>The source description as stored today</span>
              </div>
            </div>
            <div className="optional-heading">Useful optional columns</div>
            <div className="optional-pills">
              <span>unit</span>
              <span>category</span>
              <span>material</span>
              <span>grade</span>
              <span>manufacturer</span>
            </div>
            <div className="supported-note">
              <Info size={14} />
              <span>
                Current backend import supports <b>CSV and Excel</b>. JSON/XML
                ingestion needs a backend endpoint.
              </span>
            </div>
          </div>
          <div className="panel source-note">
            <div className="source-note-icon">
              <FileSpreadsheet size={17} />
            </div>
            <div>
              <b>Original data stays traceable</b>
              <p>
                Normalization adds a comparable view. It does not replace the
                description your CPSE provided.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
