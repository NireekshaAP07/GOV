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


def test_conflict_survives_at_scale_despite_many_higher_scoring_duplicates(client):
    """
    Regression test for a second, deeper bug found while verifying the fix
    above at realistic data volumes: candidates() only kept each material's
    top-8 highest-scoring pairs. A conflict is deliberately scored low, so
    once a material has 8+ near-identical true duplicates (common at scale),
    the conflicting pair got silently crowded out of the top-8 -- even though
    the route-level fix above was in place. This creates enough SS304
    duplicates to exceed that limit and confirms the SS316 conflict still
    surfaces, without also flooding the queue with a combinatorial explosion
    of repeats of the exact same conflict category.
    """
    for i in range(15):
        client.post("/materials?cpse_code=SCALE_A", json={"legacy_material_code": f"DUP{i}", "original_description": "HEX BOLT M16X50 SS304"})
    client.post("/materials?cpse_code=SCALE_B", json={"legacy_material_code": "CONFLICT1", "original_description": "HEX BOLT M16X50 SS316"})

    client.post("/materials/recommend")
    pending = client.get("/reviews/pending").json()
    conflicts = [r for r in pending if r["match"]["conflicting_features"]]
    assert len(conflicts) >= 1, "the SS316 conflict was crowded out by higher-scoring SS304 duplicates"
    # And it shouldn't be flooded with one row per SS304 duplicate either.
    assert len(conflicts) < 15


def test_cpse_directory_lists_created_organizations(client):
    client.post("/materials?cpse_code=DIR_A&cpse_name=Directory Test Org", json={"legacy_material_code": "X", "original_description": "GATE VALVE 150MM"})
    codes = {row["code"] for row in client.get("/cpse").json()}
    assert "DIR_A" in codes


def test_materials_list_is_paginated_and_filterable(client):
    for i in range(3):
        client.post("/materials?cpse_code=PAGE_A", json={"legacy_material_code": f"P{i}", "original_description": "COPPER CABLE 4 CORE 2.5 SQMM"})
    page = client.get("/materials", params={"cpse": "PAGE_A", "page": 1, "page_size": 2}).json()
    assert page["total"] == 3 and len(page["items"]) == 2 and page["total_pages"] == 2


def test_national_material_history_records_real_version_snapshots(client):
    """
    Previously this endpoint could only report current state
    (full_version_history_available was always False). Now every
    CREATE/APPROVE/MODIFY writes a NationalMaterialVersion snapshot, so a
    reviewer can see the actual sequence of changes, not just the latest one.
    """
    a = client.post("/materials?cpse_code=HIST_A", json={"legacy_material_code": "H1", "original_description": "DEEP GROOVE BALL BEARING 6205"}).json()
    b = client.post("/materials?cpse_code=HIST_B", json={"legacy_material_code": "H2", "original_description": "DEEP GROOVE BALL BEARING 6205"}).json()
    client.post("/materials/recommend")
    review = next(x for x in client.get("/reviews/pending").json() if {x["material_a"]["id"], x["material_b"]["id"]} == {a["id"], b["id"]})
    approved = client.post(f"/reviews/{review['review_id']}/approve", json={"reviewer": "qa"})
    history = client.get(f"/national-materials/{approved.json()['national_code']}/history").json()
    assert history["full_version_history_available"] is True
    assert len(history["mappings"]) == 2
    assert len(history["version_history"]) == 1
    assert history["version_history"][0]["change_reason"] == "CREATE"
    assert history["version_history"][0]["changed_by"] == "qa"
