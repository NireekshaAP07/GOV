from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.core.logging import configure_logging
from app.models import *  # noqa: F403
from app.api.routes import health, materials, matching, national_materials, mappings, reviews, analytics, directory, auth as auth_routes

configure_logging()
app=FastAPI(title="National Unified Material Master Framework",version="0.1.0",description="AI-assisted national material standardization MVP")
# Restricted to configured origins (CORS_ALLOW_ORIGINS in .env) rather than "*",
# so a browser page on another origin cannot call this API using a signed-in
# user's cookies/credentials. Set this to your real frontend origin(s) in
# production; the default covers local Vite dev only.
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_allow_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(health.router,tags=["health"])
for router in (materials.router,matching.router,national_materials.router,mappings.router,reviews.router,analytics.router,directory.router,auth_routes.router): app.include_router(router)


@app.on_event("startup")
def startup():
    # Convenient SQLite local start; PostgreSQL schema should be managed with Alembic.
    if engine.dialect.name == "sqlite": Base.metadata.create_all(bind=engine)
