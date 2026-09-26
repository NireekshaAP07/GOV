# National Material Master frontend

A React, TypeScript and Vite workspace for the **National Unified Material Master Framework**. The interface includes the national overview, material explorer and detail, CSV/Excel import, duplicate candidates, human match review, approved national materials, mappings, procurement opportunities, analytics and governance guidance.

## Start locally

Requirements: Node.js 20+ and npm. Start the existing backend in another terminal first:

```bash
cd ../backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Start the PostgreSQL service declared by the backend compose file
docker compose up -d db
alembic upgrade head
uvicorn app.main:app --reload
```

For a quick SQLite run, set `DATABASE_URL=sqlite:///./material_master.db` in `backend/.env` instead of the PostgreSQL URL. To populate the synthetic backend demo catalog, run `python scripts/seed_demo.py`.

Then start the frontend:

```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`. In development, `/api` is proxied to `http://localhost:8000`, so browser requests are same-origin and do not need backend CORS changes. Set `VITE_API_BASE_URL` to another reachable API base when needed. A production deployment must serve the frontend and proxy its API under the same origin, or configure CORS at the deployment edge; the current backend does not include CORS middleware.

## Commands

- `npm run dev` starts the development server.
- `npm run typecheck` checks TypeScript.
- `npm run build` type-checks and creates `dist/`.
- `npm run preview` previews the production build.

## Backend integration

The frontend uses the backend's actual routes: `GET /analytics/dashboard`, `GET /materials/search`, `GET /materials/{id}`, `POST /materials/import`, `POST /materials/recommend`, `GET /reviews/pending`, `POST /reviews/{id}/approve|reject|modify`, `GET /national-materials`, `GET /national-materials/{id}`, `GET /mappings/{national_code}`, `GET /analytics/clusters` and `GET /analytics/procurement-opportunities`.

The backend currently accepts CSV/XLS/XLSX imports only. The import screen explains that JSON/XML ingestion is not available. Material browsing is backed by `/materials/search` because no unfiltered list endpoint exists. Audit write records exist in the backend, but it has no audit-read endpoint, authentication, national-material version-history endpoint, or CPSE directory endpoint; the governance page documents these gaps instead of inventing live data.

## Demo fallback

When a backend request fails, screens use synthetic SIH demonstration records and the app displays a **Demo workspace** banner. Demo records include the three example bolt codes and an SS304/SS316 conflict. Demo approvals and CSV imports update in-memory demo state; reconnect to the backend for persistent records. Do not present demo figures as live government data.

## Technology

React, TypeScript, Vite, Tailwind CSS, React Router, Recharts and Lucide React. The interface is desktop-first and adapts to tablet and mobile widths, with keyboard focus styles and reduced-motion support.
