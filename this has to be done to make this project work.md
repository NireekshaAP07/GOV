# What Still Needs to Be Done to Complete This Project

This guide describes how to run the current SIH 2026 MVP and what remains to make the National Unified Material Master Framework ready for a complete, reliable demonstration. The frontend is a separate React application and uses the existing backend API. Keep the backend as the source of truth; do not duplicate its matching or approval logic in the frontend.

## Current project state

- `backend/` contains the API, database models, migrations, deterministic material matching, review workflow, and analytics endpoints.
- `frontend/` contains the React, TypeScript, Vite and Tailwind user interface, including the dashboard, import flow, material search/review, national master, and procurement/analytics views.
- The frontend uses the backend when it is available. Its clearly labeled demo fallback uses synthetic in-memory data and does not persist decisions.
- Matching is currently deterministic and offline, using rules, extracted attributes, and lexical similarity. Do not describe it as an embedding or generative-AI model.
- The backend does not currently provide authentication, an unfiltered/paginated materials directory, an audit-read endpoint, a CPSE directory, or national-material version history. The frontend identifies unavailable capabilities and/or uses demo presentation for some of them.
- Import currently supports CSV and Excel files. JSON and XML import are not implemented.

See `backend/API.md`, `backend/AI_MATCHING.md`, `backend/DATA_MODEL.md`, and `backend/ARCHITECTURE.md` for the authoritative API, matching, schema, and workflow details.

## Run it locally

Use two terminals from the repository root.

### 1. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

For the PostgreSQL setup, start the database and apply migrations:

```bash
docker compose up -d
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

If you do not have Docker/PostgreSQL available, use the SQLite option documented in `backend/README.md`: set `DATABASE_URL=sqlite:///./material_master.db` in `backend/.env`, apply migrations, and optionally load the synthetic seed dataset with `python scripts/seed_demo.py`.

Check `http://localhost:8000/health` and open the API docs at `http://localhost:8000/docs`.

### 2. Start the frontend

In another terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). In development, Vite proxies `/api` to `http://localhost:8000`. Set `VITE_API_BASE_URL` in `frontend/.env` only if your backend is hosted at another base URL; follow `frontend/README.md` for the supported value format.

If the API cannot be reached, the UI can be explored in clearly marked demo mode. Restarting or refreshing demo mode may discard in-memory actions.

## Completion checklist

### A. Establish a repeatable working baseline

- [ ] Follow the local startup steps above on a clean checkout and record any missing prerequisites.
- [ ] Confirm the backend health endpoint, API docs, database connection, and migrations work with the chosen local database.
- [ ] Confirm the frontend loads with the backend online and displays live API data; separately confirm demo mode is visibly labeled when the API is offline.
- [ ] Keep generated databases, virtual environments, `node_modules`, and secrets out of source control. Use `.env.example` for safe configuration examples.

### B. Complete and verify the end-to-end material workflow

- [ ] Import a representative CSV/XLSX file for a CPSE and show validation errors in a form a user can correct.
- [ ] Confirm imported source codes and descriptions remain traceable and are not overwritten by normalized values.
- [ ] Search records, inspect a candidate match, and verify the match evidence and any conflicting attributes are visible to the reviewer.
- [ ] Exercise the human review decisions supported by the API: approve, reject, modify, and escalate. Confirm each decision has the correct resulting status and persists after refresh.
- [ ] After approval, confirm the national material and CPSE mappings appear in the relevant screens and analytics update from backend responses.
- [ ] Show that a specification conflict (for example SS304 vs SS316, or M16 x 50 vs M16 x 100) is surfaced and is not presented as an unquestioned equivalence.
- [ ] Make API failures, empty responses, and validation failures understandable, with retry or next-step guidance where appropriate.

Actual backend routes and payloads are documented in `backend/API.md`. The frontend service layer must follow those actual schemas. In particular, do not assume that the example routes in the original product brief all exist.

### C. Close the known API and product gaps

Implement these only when needed for the agreed MVP scope, keeping API contracts documented and adding backend migrations only when data requirements call for them:

- [ ] Add a paginated/filterable materials list endpoint if the Material Explorer must browse the full corpus rather than search results.
- [ ] Return complete duplicate-cluster records and their review status so the Duplicate Detection page can show live, actionable clusters.
- [ ] Add read endpoints for audit events, source-record lineage, approval history, and national-material version history if those frontend sections must be live rather than illustrative.
- [ ] Provide a CPSE directory endpoint or clearly document the accepted CPSE codes and labels.
- [ ] Decide whether JSON/XML import is actually required. If so, define schemas, validation rules, limits, and error responses before implementing it. Otherwise, clearly state CSV/XLSX support in the UI.
- [ ] Confirm procurement opportunity calculations, units, time ranges, and provenance with domain stakeholders; label results as potential consolidation opportunities, not guaranteed savings.
- [ ] Document any remaining frontend fallback data and make sure it can never be mistaken for persisted backend data.

### D. Validate matching quality and governance

- [ ] Gather representative, approved CPSE descriptions, abbreviations, units, and attribute values for testing.
- [ ] Review extraction coverage for the material families in the demo. Extend normalization/extraction rules with domain review and regression cases when needed.
- [ ] Verify thresholds and conflict rules against labeled examples, including near-duplicates that must not merge. Track false-positive and false-negative examples.
- [ ] Keep a human approval step for mappings. Show confidence and evidence as decision support, not as a guarantee of correctness.
- [ ] Preserve original values, reviewer identity, decision, timestamp, comments, and version/lineage for every approved change as the backend governance model is completed.
- [ ] Treat any future semantic model as an optional, separately evaluated matching adapter; it is not part of the current deterministic implementation.

### E. Add verification for the agreed release scope

- [ ] Backend tests: import validation, normalization, matching and conflict cases, all review decisions, mappings, analytics, and failure paths.
- [ ] Database integration: run migrations and workflow tests against the database engine used for the demo/deployment (not only SQLite).
- [ ] Frontend checks: `npm run typecheck` and `npm run build` from `frontend/`.
- [ ] Manual browser walkthrough: dashboard → import → explorer/detail → duplicate/review → approval → national master/mappings → analytics.
- [ ] Check keyboard navigation, visible focus, form labels, contrast, responsive sidebar behavior, and horizontally scrollable tables at laptop/tablet widths.
- [ ] Verify no demo values appear as live data when API calls succeed, and no successful-looking approval is shown if the API rejects the request.

### F. Prepare the SIH demonstration and deployment

- [ ] Create a small, clearly synthetic CSV/XLSX sample with the three bolt descriptions from the brief and at least one deliberate conflicting specification.
- [ ] Reset/seed the demo database using the documented seed workflow so the walkthrough starts from a known state.
- [ ] Rehearse import, AI-assisted recommendation, evidence review, human approval, mapping visibility, and analytics. Explain that the match is a recommendation and approval is human-controlled.
- [ ] Use synthetic data only unless the organization has approved the use of real CPSE records.
- [ ] Before exposing the prototype beyond a trusted local/demo environment, define authentication and roles, protect secrets, restrict CORS, validate upload size and content, use HTTPS, and configure database backups and migration/rollback procedures. The current MVP does not provide production authentication or operational hardening.
- [ ] Document the actual deployment URLs, environment variables, startup commands, and recovery/reset procedure for the demo environment.

## Suggested definition of done

The MVP is ready to present when a reviewer can start both applications from the README, import a sample file, understand why records were suggested as a match, see conflicts, make a human review decision, find the resulting national code and source mappings, and distinguish live backend data from synthetic demo data. The review and mapping survive a page refresh when the backend is connected, and the walkthrough has been checked against the documented API contracts.

## Handy references

- Frontend setup and commands: `frontend/README.md`
- Backend setup: `backend/README.md`
- Actual API routes and schemas: `backend/API.md`
- Matching behavior and limits: `backend/AI_MATCHING.md`
- Data model: `backend/DATA_MODEL.md`
- Architecture and workflow: `backend/ARCHITECTURE.md`
