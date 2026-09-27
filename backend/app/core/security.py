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
- Tokens are short-lived JWTs (HS256). There is no refresh-token flow or
  password reset yet — see backend/API.md "Known auth limitations".
"""
from datetime import datetime, timedelta, timezone
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.entities import User

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
    payload = {"sub": username, "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})


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
