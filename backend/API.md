# API reference

FastAPI publishes the full request and response schema at `/docs` and `/openapi.json`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | API and database check |
| POST | `/auth/register` | Create a user. The first user ever created becomes ADMIN with no token required; every registration after that requires an authenticated ADMIN (see "Authentication" below) |
| POST | `/auth/login` | Exchange username/password for a JWT + refresh token (form-encoded, `OAuth2PasswordRequestForm`: `username`, `password`). Rate-limited: `LOGIN_MAX_ATTEMPTS` failures within `LOGIN_LOCKOUT_MINUTES` returns 429 |
| POST | `/auth/refresh` | Exchange a still-valid refresh token for a new access token. The refresh token is rotated (single-use) |
| POST | `/auth/forgot-password` | Issue a password-reset token for a username. Always returns 200 with a generic message (never reveals whether the username exists); the token itself is only present in the response when the account exists |
| POST | `/auth/reset-password` | Redeem a reset token and set a new password. Single-use |
| GET | `/auth/me` | Current authenticated user |
| POST | `/materials/import?cpse_code=...` | CSV/XLSX ingestion. Requires ADMIN or REVIEWER once auth is enabled |
| POST | `/materials?cpse_code=...` | Create one source material. Requires ADMIN or REVIEWER once auth is enabled |
| GET | `/materials?page=&page_size=&cpse=&category=&material=&grade=` | Paginated/filterable browse of the full source-material corpus |
| GET | `/materials/{id}` | Read source material |
| GET | `/materials/search?q=...` | Fuzzy source/NMC/mapping search with filters |
| GET | `/cpse` | CPSE directory (codes and names known to the system) |
| GET | `/audit?entity_type=&entity_id=&page=&page_size=` | Read-only audit trail of review decisions |
| GET | `/national-materials/{national_code}/history` | Real, append-only version history (every CREATE/APPROVE/MODIFY, in order, with who and when) plus current mapping state |
| POST | `/materials/match` | Score a selected pair |
| POST | `/materials/recommend` | Generate and persist candidate reviews. Requires ADMIN or REVIEWER once auth is enabled |
| GET | `/national-materials/{id}` | Read NMC by database ID |
| GET | `/mappings/{national_code}` | List CPSE mappings for NMC |
| GET | `/reviews/pending` | Pending review context |
| POST | `/reviews/{id}/approve` | Approve, issue/reuse NMC, map both materials. Requires ADMIN or REVIEWER once auth is enabled |
| POST | `/reviews/{id}/reject` | Reject and audit recommendation. Requires ADMIN or REVIEWER once auth is enabled |
| POST | `/reviews/{id}/modify` | Approve with reviewer standard description. Requires ADMIN or REVIEWER once auth is enabled |
| POST | `/reviews/{id}/escalate` | Escalate and audit. Requires ADMIN or REVIEWER once auth is enabled |
| GET | `/analytics/dashboard` | Catalog and confidence statistics |
| GET | `/analytics/clusters` | Approved equivalent-material clusters, with full material records and each match edge's live review status (not just a bare id list) |
| GET | `/analytics/procurement-opportunities` | Cross-CPSE demand opportunities |

Import requires `legacy_material_code` and `original_description` columns. Common `material_code`, `code`, and `description` column aliases are accepted. Supported formats: CSV, XLSX/XLS, JSON (a bare array of objects, or `{"materials": [...]}`), and XML (`<materials><material>...</material></materials>`, one element per row with child tags as columns). Malformed rows are included in the response's `errors` array rather than silently discarded, the same way across all four formats. HTTP 409 marks duplicate upload or source code, 413 an upload over `MAX_UPLOAD_BYTES`, 415 unsupported file type, and 422 unreadable or invalid input.

`/materials/recommend` creates a pending review for any pair scoring at/above the "investigate" confidence threshold, **and always** for any pair the matcher flags with `conflicting_features` (e.g. same bolt family but SS304 vs SS316), even though such conflicts are deliberately scored below that threshold. This is intentional: a detected specification conflict must reach a human reviewer instead of being silently dropped as a non-match. This is enforced in two places, both load-bearing: the route only asked for pairs above threshold (fixed to also always ask for conflicts), and separately the internal candidate generator only keeps each material's top-8 highest-scoring pairs, which was *also* silently crowding a low-scoring conflict out once a corpus had 8+ higher-scoring true duplicates for the same material. Both are covered by regression tests in `tests/test_conflicts_and_directory.py`.

## Authentication

Off by default (`AUTH_ENABLED=false` in `.env`) so the existing frontend and demo flow work with zero changes and no login screen. To turn it on:

1. Set `AUTH_ENABLED=true` and a real `JWT_SECRET` in `.env`.
2. The **first** call to `POST /auth/register` needs no token and becomes `ADMIN` (bootstrap). Every registration after that requires an authenticated `ADMIN`.
3. `POST /auth/login` (form-encoded `username`/`password`) returns a JWT; send it as `Authorization: Bearer <token>`.
4. Two roles: `ADMIN`, `REVIEWER`. Both can import data and make review decisions; only `ADMIN` can register additional users.
5. `python scripts/seed_demo.py` also creates two demo accounts — `admin` / `Admin123!` and `reviewer` / `Reviewer123!` — inert unless `AUTH_ENABLED=true`.

**What's enforced**: import, material creation, triggering matching (`/materials/recommend`), and every review decision (approve/reject/modify/escalate). Once enabled, the reviewer name recorded in the audit trail is always the authenticated username — a request body's `reviewer` field is ignored, so a caller cannot attribute a decision to someone else.

**What's intentionally left open**: read endpoints (search, lists, analytics, audit, CPSE/materials directory) do not require a token, so dashboards remain viewable without a login. Tighten this further before a public deployment.

**Known limitations** (fine for a local/judged demo, not for a public deployment): no rate limiting beyond login itself, and password reset returns its token directly in the API response rather than emailing it (there is no email service in this MVP — see `POST /auth/forgot-password` above). A React login screen now exists (`frontend/src/pages/Login.tsx`) and the frontend attaches the token automatically and silently refreshes it on expiry, so `AUTH_ENABLED=true` is now fully demoable end-to-end, not backend-only.
