"""
Authentication core for the National Unified Material Master Framework.

Design notes (read before enabling in a shared/hosted environment):
- Auth is OFF by default (settings.auth_enabled = False) so the existing demo
  and frontend keep working without a login screen. Flip AUTH_ENABLED=true in
  .env (and set a real JWT_SECRET) to require it.
- When enabled, state-changing endpoints (import, create material, trigger
  matching, and every review decision) require a valid bearer token; read
  endpoints (search, lists, analytics, audit) stay open so dashboards can be
  viewed without a login. Tighten that further before a public deployment.
- Passwords are hashed with bcrypt directly (not passlib, which has a known
  compatibility break with bcrypt>=4.1).
- Access tokens are short-lived JWTs (HS256, default 8h). Refresh tokens are
  opaque random strings, stored only as a SHA-256 hash, rotated on every use.
- Password reset is self-service (POST /auth/forgot-password /
  /auth/reset-password) but there is no email service in this MVP -- the
  reset token is returned directly in the API response rather than emailed.
  Fine for a local/demo deployment; replace with real email delivery before
  a public one. See API.md "Known auth limitations".
- Login attempts are rate-limited per-username, in-memory. This is NOT
  multi-process safe (a multi-worker deployment needs a shared store like
  Redis instead) -- adequate for a single-process local/demo deployment.
"""
import hashlib
import secrets
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.entities import PasswordResetToken, RefreshToken, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(username: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    # jti makes each issued token unique even if two are minted within the
    # same second (exp only has second precision) -- otherwise two logins in
    # quick succession would produce byte-identical JWTs.
    payload = {"sub": username, "role": role, "exp": expire, "jti": secrets.token_hex(8)}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})


def _hash_opaque_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _aware(dt: datetime) -> datetime:
    """SQLite drops tzinfo on round-trip, so a value read back from the DB
    can be naive even though it was stored as UTC-aware. Normalize before
    comparing against a fresh (aware) datetime.now(timezone.utc)."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def issue_refresh_token(db: Session, user: User) -> str:
    raw = secrets.token_urlsafe(48)
    db.add(RefreshToken(user_id=user.id, token_hash=_hash_opaque_token(raw),
                        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)))
    return raw


def redeem_refresh_token(db: Session, raw: str) -> User:
    """Validates and revokes the given refresh token; caller issues a new one (rotation)."""
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == _hash_opaque_token(raw)))
    now = datetime.now(timezone.utc)
    if not record or record.revoked_at is not None or _aware(record.expires_at) < now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token is invalid, expired, or already used")
    record.revoked_at = now
    user = db.get(User, record.user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


def issue_password_reset_token(db: Session, user: User) -> str:
    raw = secrets.token_urlsafe(32)
    db.add(PasswordResetToken(user_id=user.id, token_hash=_hash_opaque_token(raw),
                              expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_expire_minutes)))
    return raw


def redeem_password_reset_token(db: Session, raw: str) -> User:
    record = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == _hash_opaque_token(raw)))
    now = datetime.now(timezone.utc)
    if not record or record.used_at is not None or _aware(record.expires_at) < now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reset token is invalid, expired, or already used")
    record.used_at = now
    user = db.get(User, record.user_id)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User not found")
    return user


class _LoginRateLimiter:
    """Simple in-memory sliding-window limiter, keyed by username (case-insensitive)."""
    def __init__(self):
        self._attempts: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, username: str):
        key = username.lower()
        window = timedelta(minutes=settings.login_lockout_minutes)
        now = datetime.now(timezone.utc)
        with self._lock:
            attempts = self._attempts[key]
            while attempts and now - attempts[0] > window:
                attempts.popleft()
            if len(attempts) >= settings.login_max_attempts:
                raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                    f"Too many failed login attempts. Try again in {settings.login_lockout_minutes} minutes.")

    def record_failure(self, username: str):
        with self._lock:
            self._attempts[username.lower()].append(datetime.now(timezone.utc))

    def record_success(self, username: str):
        with self._lock:
            self._attempts.pop(username.lower(), None)


login_rate_limiter = _LoginRateLimiter()


def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User | None:
    """
    Returns the authenticated User, or None when auth is disabled (the
    default), so every route that depends on this works identically in both
    modes without an if/else at the call site.
    """
    if not settings.auth_enabled:
        return None
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required", headers={"WWW-Authenticate": "Bearer"})
    payload = _decode_token(token)
    user = db.scalar(select(User).where(User.username == payload.get("sub")))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive", headers={"WWW-Authenticate": "Bearer"})
    return user


def get_current_user_optional(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User | None:
    """
    Like get_current_user, but never raises for a missing token -- it returns
    None instead. Used only by /auth/register, which must remain callable
    with no token at all for the very first (bootstrap) user, while still
    validating a token if one *is* provided (an invalid/expired token here
    still raises, so a bad token can't be silently ignored).
    """
    if not settings.auth_enabled or not token:
        return None
    payload = _decode_token(token)
    user = db.scalar(select(User).where(User.username == payload.get("sub")))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive", headers={"WWW-Authenticate": "Bearer"})
    return user


def require_role(*roles: str):
    """
    Dependency factory: require_role("ADMIN", "REVIEWER"). When auth is
    disabled this is a no-op (returns None), matching get_current_user.
    """
    def dependency(user: User | None = Depends(get_current_user)) -> User | None:
        if not settings.auth_enabled:
            return None
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires role: {' or '.join(roles)}")
        return user
    return dependency


def reviewer_identity(user: User | None, body_reviewer: str | None) -> str | None:
    """
    The name recorded on a review decision / audit entry. When auth is
    enabled, this is always the authenticated username (a client cannot claim
    to be someone else) rather than a free-text field in the request body.
    When auth is disabled, the body field is trusted as before.
    """
    return user.username if user else body_reviewer
