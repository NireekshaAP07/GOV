import json
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


def test_json_import_bare_array(client):
    payload = json.dumps([
        {"legacy_material_code": "J1", "original_description": "HEX BOLT M16X50 SS304"},
        {"legacy_material_code": "J2", "original_description": "GATE VALVE 150MM"},
    ]).encode("utf-8")
    resp = client.post("/materials/import?cpse_code=JSON_A", files={"file": ("materials.json", payload, "application/json")})
    assert resp.status_code == 200
    assert resp.json()["imported"] == 2


def test_json_import_wrapped_object(client):
    payload = json.dumps({"materials": [{"legacy_material_code": "J3", "original_description": "COPPER CABLE 4 CORE"}]}).encode("utf-8")
    resp = client.post("/materials/import?cpse_code=JSON_B", files={"file": ("materials.json", payload, "application/json")})
    assert resp.status_code == 200
    assert resp.json()["imported"] == 1


def test_json_import_rejects_non_array_payload(client):
    payload = json.dumps({"not": "a list of materials"}).encode("utf-8")
    resp = client.post("/materials/import?cpse_code=JSON_C", files={"file": ("materials.json", payload, "application/json")})
    assert resp.status_code == 422


def test_xml_import(client):
    xml = b"""<?xml version="1.0"?>
<materials>
  <material>
    <legacy_material_code>X1</legacy_material_code>
    <original_description>DEEP GROOVE BALL BEARING 6205</original_description>
  </material>
  <material>
    <legacy_material_code>X2</legacy_material_code>
    <original_description>MOTOR 415V 3 PHASE</original_description>
  </material>
</materials>"""
    resp = client.post("/materials/import?cpse_code=XML_A", files={"file": ("materials.xml", xml, "application/xml")})
    assert resp.status_code == 200
    assert resp.json()["imported"] == 2


def test_xml_import_with_malformed_xml_gives_422_not_500(client):
    resp = client.post("/materials/import?cpse_code=XML_B", files={"file": ("materials.xml", b"<not><valid", "application/xml")})
    assert resp.status_code == 422


def test_unsupported_extension_still_rejected(client):
    resp = client.post("/materials/import?cpse_code=BAD_A", files={"file": ("materials.txt", b"whatever", "text/plain")})
    assert resp.status_code == 415


def test_json_import_shares_validation_with_csv_import(client):
    """Malformed rows (missing required fields) should land in `errors`, same as CSV/XLSX, not silently vanish or 500."""
    payload = json.dumps([
        {"legacy_material_code": "J4", "original_description": "VALID ROW"},
        {"legacy_material_code": "", "original_description": "MISSING CODE"},
    ]).encode("utf-8")
    resp = client.post("/materials/import?cpse_code=JSON_D", files={"file": ("materials.json", payload, "application/json")})
    body = resp.json()
    assert body["imported"] == 1
    assert len(body["errors"]) == 1
