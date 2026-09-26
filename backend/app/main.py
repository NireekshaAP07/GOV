from fastapi import FastAPI
from app.core.database import Base, engine
from app.core.logging import configure_logging
from app.models import *  # noqa: F403
from app.api.routes import health, materials, matching, national_materials, mappings, reviews, analytics

configure_logging()
app=FastAPI(title="National Unified Material Master Framework",version="0.1.0",description="AI-assisted national material standardization MVP")
app.include_router(health.router,tags=["health"])
for router in (materials.router,matching.router,national_materials.router,mappings.router,reviews.router,analytics.router): app.include_router(router)


@app.on_event("startup")
def startup():
    # Convenient SQLite local start; PostgreSQL schema should be managed with Alembic.
    if engine.dialect.name == "sqlite": Base.metadata.create_all(bind=engine)
