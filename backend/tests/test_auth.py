import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings
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


@pytest.fixture
def auth_enabled():
    original = settings.auth_enabled
    settings.auth_enabled = True
    yield
    settings.auth_enabled = original


def test_auth_disabled_by_default_everything_still_works(client):
    """The whole point of the toggle: with AUTH_ENABLED unset, nothing changes."""
    assert settings.auth_enabled is False
    a = client.post("/materials?cpse_code=NOAUTH_A", json={"legacy_material_code": "N1", "original_description": "GATE VALVE 150MM"})
    assert a.status_code == 201
    assert client.post("/materials/recommend").status_code == 200


def test_first_registered_user_becomes_admin_without_a_token(client, auth_enabled):
    resp = client.post("/auth/register", json={"username": "founder", "password": "correct-horse-battery"})
    assert resp.status_code == 201
    assert resp.json()["role"] == "ADMIN"


def test_second_registration_requires_admin_token_once_auth_is_enabled(client, auth_enabled):
    client.post("/auth/register", json={"username": "founder", "password": "correct-horse-battery"})
    # No token at all -> rejected.
    anon = client.post("/auth/register", json={"username": "someone", "password": "correct-horse-battery"})
    assert anon.status_code == 401

    login = client.post("/auth/login", data={"username": "founder", "password": "correct-horse-battery"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    assert login.json()["role"] == "ADMIN"

    created = client.post("/auth/register", json={"username": "reviewer1", "password": "correct-horse-battery", "role": "REVIEWER"},
                          headers={"Authorization": f"Bearer {token}"})
    assert created.status_code == 201 and created.json()["role"] == "REVIEWER"


def test_wrong_password_is_rejected(client, auth_enabled):
    client.post("/auth/register", json={"username": "founder", "password": "correct-horse-battery"})
    bad = client.post("/auth/login", data={"username": "founder", "password": "wrong-password"})
    assert bad.status_code == 401


def test_mutating_endpoints_require_a_role_once_auth_is_enabled(client, auth_enabled):
    client.post("/auth/register", json={"username": "founder", "password": "correct-horse-battery"})
    token = client.post("/auth/login", data={"username": "founder", "password": "correct-horse-battery"}).json()["access_token"]

    # No token -> blocked from creating a material.
    denied = client.post("/materials?cpse_code=AUTH_A", json={"legacy_material_code": "A1", "original_description": "GATE VALVE 150MM"})
    assert denied.status_code == 401

    # With a valid ADMIN token -> allowed.
    allowed = client.post("/materials?cpse_code=AUTH_A", json={"legacy_material_code": "A1", "original_description": "GATE VALVE 150MM"},
                          headers={"Authorization": f"Bearer {token}"})
    assert allowed.status_code == 201


def test_review_decision_records_the_authenticated_identity_not_a_free_text_claim(client, auth_enabled):
    """
    Once auth is enabled, the reviewer name in the audit trail must come from
    the verified token, not a client-supplied 'reviewer' field -- otherwise
    anyone could approve a mapping and attribute it to someone else.
    """
    client.post("/auth/register", json={"username": "founder", "password": "correct-horse-battery"})
    token = client.post("/auth/login", data={"username": "founder", "password": "correct-horse-battery"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    a = client.post("/materials?cpse_code=ID_A", json={"legacy_material_code": "A1", "original_description": "DEEP GROOVE BALL BEARING 6205"}, headers=headers).json()
    b = client.post("/materials?cpse_code=ID_B", json={"legacy_material_code": "B1", "original_description": "DEEP GROOVE BALL BEARING 6205"}, headers=headers).json()
    client.post("/materials/recommend", headers=headers)
    review = next(x for x in client.get("/reviews/pending").json() if {x["material_a"]["id"], x["material_b"]["id"]} == {a["id"], b["id"]})

    # Client tries to claim a different reviewer identity in the body -- must be ignored.
    client.post(f"/reviews/{review['review_id']}/approve", json={"reviewer": "someone-else-entirely"}, headers=headers)

    audit = client.get("/audit", params={"entity_type": "MaterialMatch"}).json()["items"]
    assert any(e["user"] == "founder" for e in audit)
    assert not any(e["user"] == "someone-else-entirely" for e in audit)
