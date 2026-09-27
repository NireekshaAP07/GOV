import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import login_rate_limiter
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
    login_rate_limiter._attempts.clear()  # tests share the module-level limiter; reset between runs


@pytest.fixture
def auth_enabled():
    original = settings.auth_enabled
    settings.auth_enabled = True
    yield
    settings.auth_enabled = original


def register_and_login(client):
    client.post("/auth/register", json={"username": "founder", "password": "correct-horse-battery"})
    return client.post("/auth/login", data={"username": "founder", "password": "correct-horse-battery"}).json()


def test_login_returns_a_refresh_token_alongside_the_access_token(client, auth_enabled):
    login = register_and_login(client)
    assert login["access_token"] and login["refresh_token"]


def test_refresh_token_issues_a_new_access_token_and_rotates(client, auth_enabled):
    login = register_and_login(client)
    refreshed = client.post("/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"] != login["access_token"]

    # The old refresh token was single-use (rotated) -- reusing it must fail.
    reused = client.post("/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert reused.status_code == 401


def test_refresh_with_garbage_token_is_rejected(client, auth_enabled):
    resp = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert resp.status_code == 401


def test_password_reset_flow(client, auth_enabled):
    register_and_login(client)
    forgot = client.post("/auth/forgot-password", json={"username": "founder"})
    assert forgot.status_code == 200
    reset_token = forgot.json()["reset_token"]
    assert reset_token

    reset = client.post("/auth/reset-password", json={"reset_token": reset_token, "new_password": "brand-new-password-123"})
    assert reset.status_code == 200

    # Old password no longer works, new one does.
    old_login = client.post("/auth/login", data={"username": "founder", "password": "correct-horse-battery"})
    assert old_login.status_code == 401
    new_login = client.post("/auth/login", data={"username": "founder", "password": "brand-new-password-123"})
    assert new_login.status_code == 200

    # The reset token is single-use.
    reused = client.post("/auth/reset-password", json={"reset_token": reset_token, "new_password": "yet-another-password"})
    assert reused.status_code == 400


def test_forgot_password_does_not_reveal_whether_username_exists(client, auth_enabled):
    resp = client.post("/auth/forgot-password", json={"username": "nobody-registered"})
    assert resp.status_code == 200
    assert resp.json()["reset_token"] is None  # generic response, no enumeration


def test_login_is_rate_limited_after_repeated_failures(client, auth_enabled):
    register_and_login(client)
    original_max = settings.login_max_attempts
    settings.login_max_attempts = 3
    try:
        for _ in range(3):
            fail = client.post("/auth/login", data={"username": "founder", "password": "wrong"})
            assert fail.status_code == 401
        locked = client.post("/auth/login", data={"username": "founder", "password": "wrong"})
        assert locked.status_code == 429
        # Even the CORRECT password is blocked while locked out.
        still_locked = client.post("/auth/login", data={"username": "founder", "password": "correct-horse-battery"})
        assert still_locked.status_code == 429
    finally:
        settings.login_max_attempts = original_max


def test_successful_login_clears_the_failure_count(client, auth_enabled):
    register_and_login(client)
    client.post("/auth/login", data={"username": "founder", "password": "wrong"})
    ok = client.post("/auth/login", data={"username": "founder", "password": "correct-horse-battery"})
    assert ok.status_code == 200
    assert len(login_rate_limiter._attempts.get("founder", [])) == 0
