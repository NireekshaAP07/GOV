import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.main import app


@pytest.fixture
def client():
    engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session=sessionmaker(bind=engine,autoflush=False,expire_on_commit=False)
    def override_db():
        db=Session()
        try: yield db
        finally: db.close()
    app.dependency_overrides[get_db]=override_db
    with TestClient(app) as test_client: yield test_client
    app.dependency_overrides.clear(); Base.metadata.drop_all(engine); engine.dispose()


def test_openapi_health_search_and_approval_mapping(client):
    assert client.get("/openapi.json").status_code==200
    assert client.get("/health").json()["status"]=="ok"
    one=client.post("/materials?cpse_code=CPSE_A",json={"legacy_material_code":"BOLT-10021","original_description":"HEX BOLT M16X50 SS304"})
    two=client.post("/materials?cpse_code=CPSE_B",json={"legacy_material_code":"MAT-98231","original_description":"HEXAGONAL HEAD BOLT M16 x 50 STAINLESS STEEL 304"})
    assert one.status_code==201 and two.status_code==201
    assert client.get("/materials/search?q=M16%20bolt%20SS304").json()["results"]
    recommendations=client.post("/materials/recommend").json()["recommendations"]
    assert recommendations and recommendations[0]["final_score"]>=.8
    pending=client.get("/reviews/pending").json()
    item=next(x for x in pending if {x["material_a"]["id"],x["material_b"]["id"]}=={one.json()["id"],two.json()["id"]})
    approved=client.post(f"/reviews/{item['review_id']}/approve",json={"reviewer":"test"})
    assert approved.status_code==200 and approved.json()["national_code"]=="NMC-00000001"
    mapping=client.get(f"/mappings/{approved.json()['national_code']}").json()["mappings"]
    assert len(mapping)==2
    assert client.get("/analytics/dashboard").json()["approved_mappings"]==2


def test_review_rejection_is_recorded(client):
    a=client.post("/materials?cpse_code=R_A",json={"legacy_material_code":"A","original_description":"BEARING 6205"}).json()
    b=client.post("/materials?cpse_code=R_B",json={"legacy_material_code":"B","original_description":"BEARING 6205"}).json()
    client.post("/materials/recommend")
    review=next(x for x in client.get("/reviews/pending").json() if {x['material_a']['id'],x['material_b']['id']}=={a['id'],b['id']})
    response=client.post(f"/reviews/{review['review_id']}/reject",json={"reviewer":"reviewer","comments":"different procurement spec"})
    assert response.status_code==200 and response.json()["decision"]=="REJECT"
    assert client.get("/reviews/pending").json()==[]
