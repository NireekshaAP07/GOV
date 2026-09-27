# API reference

FastAPI publishes the full request and response schema at `/docs` and `/openapi.json`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | API and database check |
| POST | `/materials/import?cpse_code=...` | CSV/XLSX ingestion |
| POST | `/materials?cpse_code=...` | Create one source material |
| GET | `/materials?page=&page_size=&cpse=&category=&material=&grade=` | Paginated/filterable browse of the full source-material corpus |
| GET | `/materials/{id}` | Read source material |
| GET | `/materials/search?q=...` | Fuzzy source/NMC/mapping search with filters |
| GET | `/cpse` | CPSE directory (codes and names known to the system) |
| GET | `/audit?entity_type=&entity_id=&page=&page_size=` | Read-only audit trail of review decisions |
| GET | `/national-materials/{national_code}/history` | Current version/approval state for a national material and its CPSE mappings. **Not** a full per-version snapshot history yet — see the endpoint's note on what a dedicated history table would add. |
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

`/materials/recommend` creates a pending review for any pair scoring at/above the "investigate" confidence threshold, **and always** for any pair the matcher flags with `conflicting_features` (e.g. same bolt family but SS304 vs SS316), even though such conflicts are deliberately scored below that threshold. This is intentional: a detected specification conflict must reach a human reviewer instead of being silently dropped as a non-match.
