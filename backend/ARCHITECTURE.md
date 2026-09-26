# Architecture

This is a modular monolith: FastAPI routes handle transport and validation, SQLAlchemy models persist the domain, and services own ingestion, normalization, extraction, fingerprints, matching and NMC creation. PostgreSQL is the target database. JSON fields hold variable technical fingerprints; no pgvector extension is required.

Data path: upload/entry → canonical Material row → deterministic normalized description → extracted attributes and fingerprint → blocked candidate pairs → hybrid score and conflict gate → pending Review → human decision → approved NationalMaterial and CPSE MaterialMapping → dashboard/search/procurement views.

The source CPSE code and description remain on each Material and mapping. Review approval is the only path that creates approved national identity through the API. `app/ai/` is the extension point for optional local embedding and extraction adapters; deterministic functionality stays available without it.
