import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.main import app


@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_specification_conflict_is_surfaced_not_hidden(client):
    """
    Regression test for a real bug: /materials/recommend used to only create a
    review when final_score >= the 'investigate' threshold. A genuine spec
    conflict (SS304 vs SS316) is deliberately scored just *below* that
    threshold by score_pair(), so it was silently dropped and a reviewer never
    saw it. This pins the fix: conflicting pairs must always be surfaced.
    """
    a = client.post("/materials?cpse_code=CONF_A", json={"legacy_material_code": "A1", "original_description": "HEX BOLT M16X50 SS304"}).json()
    b = client.post("/materials?cpse_code=CONF_B", json={"legacy_material_code": "B1", "original_description": "HEX BOLT M16X50 SS316"}).json()

    recommendations = client.post("/materials/recommend").json()["recommendations"]
    pair = next(x for x in recommendations if {x["material_a"], x["material_b"]} == {a["id"], b["id"]})

    assert pair["classification"] == "NON_MATCH"
    assert pair["conflicting_features"].get("grade") == {"a": "SS304", "b": "SS316"}

    pending = client.get("/reviews/pending").json()
    review = next(x for x in pending if {x["material_a"]["id"], x["material_b"]["id"]} == {a["id"], b["id"]})
    assert review["match"]["conflicting_features"]

    # A reviewer must be able to explicitly reject a surfaced conflict, and that
    # decision must be audited rather than silently approved as an equivalence.
    rejection = client.post(f"/reviews/{review['review_id']}/reject", json={"reviewer": "qa", "comments": "different alloy grade"})
    assert rejection.status_code == 200 and rejection.json()["decision"] == "REJECT"
    assert client.get("/analytics/dashboard").json()["approved_mappings"] == 0

    audit = client.get("/audit", params={"entity_type": "MaterialMatch"}).json()["items"]
    assert any(e["action"] == "REJECT" and e["user"] == "qa" for e in audit)


def test_cpse_directory_lists_created_organizations(client):
    client.post("/materials?cpse_code=DIR_A&cpse_name=Directory Test Org", json={"legacy_material_code": "X", "original_description": "GATE VALVE 150MM"})
    codes = {row["code"] for row in client.get("/cpse").json()}
    assert "DIR_A" in codes


def test_materials_list_is_paginated_and_filterable(client):
    for i in range(3):
        client.post("/materials?cpse_code=PAGE_A", json={"legacy_material_code": f"P{i}", "original_description": "COPPER CABLE 4 CORE 2.5 SQMM"})
    page = client.get("/materials", params={"cpse": "PAGE_A", "page": 1, "page_size": 2}).json()
    assert page["total"] == 3 and len(page["items"]) == 2 and page["total_pages"] == 2


def test_national_material_history_flags_it_is_current_state_only(client):
    a = client.post("/materials?cpse_code=HIST_A", json={"legacy_material_code": "H1", "original_description": "DEEP GROOVE BALL BEARING 6205"}).json()
    b = client.post("/materials?cpse_code=HIST_B", json={"legacy_material_code": "H2", "original_description": "DEEP GROOVE BALL BEARING 6205"}).json()
    client.post("/materials/recommend")
    review = next(x for x in client.get("/reviews/pending").json() if {x["material_a"]["id"], x["material_b"]["id"]} == {a["id"], b["id"]})
    approved = client.post(f"/reviews/{review['review_id']}/approve", json={"reviewer": "qa"})
    history = client.get(f"/national-materials/{approved.json()['national_code']}/history").json()
    assert history["full_version_history_available"] is False
    assert len(history["mappings"]) == 2
