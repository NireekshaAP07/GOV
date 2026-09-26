# National Unified Material Master Framework

Backend MVP for standardizing material catalogs across CPSEs while preserving every source code and description. This is a modular FastAPI application; it contains no frontend and needs no paid AI service. Matching uses deterministic normalization, attribute extraction, RapidFuzz token similarity, and hard technical conflict checks. Sentence Transformers can be added later behind the AI adapter boundary; they are not needed to run this MVP.

## Requirements and setup

Python 3.11+ and PostgreSQL 14+ are recommended. From `backend/`:

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Set `DATABASE_URL` in `.env`. A local PostgreSQL database can be started with `docker compose up -d db`. For quick development without PostgreSQL, the default SQLite URL creates its schema on startup.

Apply migrations and start the API:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

Interactive Swagger is at `http://localhost:8000/docs`; OpenAPI JSON is at `/openapi.json`. `GET /health` also checks database connectivity.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

## Demo data and tests

```bash
python scripts/seed_demo.py
pytest
```

The seed creates 500 material records for five synthetic CPSEs, procurement records, and pending review recommendations. It includes the three requested bolt naming variants and technical negative cases. Re-running it does not duplicate material source records.

## Main workflow

1. `POST /materials/import?cpse_code=...` accepts a CSV or Excel workbook with `legacy_material_code` and `original_description` columns. Row errors are returned; source code, text and filename digest are preserved.
2. Import normalizes text, extracts attributes and stores a JSON material fingerprint.
3. `POST /materials/recommend` creates candidate matches and pending human reviews. `POST /materials/match` evaluates a selected pair.
4. `GET /reviews/pending` exposes material descriptions, matching/conflicting features and recommendation.
5. `POST /reviews/{id}/approve` creates a persistent NMC, creates/updates mappings, and writes an audit log. Reject and modify actions are also audited.
6. Search, analytics, mapping lookup and procurement opportunity endpoints expose the resulting records.

Similarity never overrides a conflicting grade, size, voltage, current, power, pressure, temperature, model or standard. Scores are recommendations only. An approval is required to create an authoritative national code.

## Example API calls

```bash
curl http://localhost:8000/health
curl -F file=@materials.csv 'http://localhost:8000/materials/import?cpse_code=BHEL&cpse_name=BHEL'
curl -X POST http://localhost:8000/materials/recommend
curl 'http://localhost:8000/materials/search?q=M16%20bolt%20SS304'
curl http://localhost:8000/analytics/dashboard
```

See [API.md](API.md), [ARCHITECTURE.md](ARCHITECTURE.md), [AI_MATCHING.md](AI_MATCHING.md) and [DATA_MODEL.md](DATA_MODEL.md) for details.
