# API reference

FastAPI publishes the full request and response schema at `/docs` and `/openapi.json`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | API and database check |
| POST | `/materials/import?cpse_code=...` | CSV/XLSX ingestion |
| POST | `/materials?cpse_code=...` | Create one source material |
| GET | `/materials/{id}` | Read source material |
| GET | `/materials/search?q=...` | Fuzzy source/NMC/mapping search with filters |
| POST | `/materials/match` | Score a selected pair |
| POST | `/materials/recommend` | Generate and persist candidate reviews |
| GET | `/national-materials/{id}` | Read NMC by database ID |
| GET | `/mappings/{national_code}` | List CPSE mappings for NMC |
| GET | `/reviews/pending` | Pending review context |
| POST | `/reviews/{id}/approve` | Approve, issue/reuse NMC, map both materials |
| POST | `/reviews/{id}/reject` | Reject and audit recommendation |
| POST | `/reviews/{id}/modify` | Approve with reviewer standard description |
| POST | `/reviews/{id}/escalate` | Escalate and audit |
| GET | `/analytics/dashboard` | Catalog and confidence statistics |
| GET | `/analytics/clusters` | Approved equivalent-material clusters |
| GET | `/analytics/procurement-opportunities` | Cross-CPSE demand opportunities |

Import requires `legacy_material_code` and `original_description` columns. Common `material_code`, `code`, and `description` column aliases are accepted. Malformed rows are included in the response's `errors` array rather than silently discarded. HTTP 409 marks duplicate upload or source code, 415 unsupported file type, and 422 unreadable or invalid input.
