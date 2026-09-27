from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (create_access_token, get_current_user, get_current_user_optional, hash_password,
                               issue_password_reset_token, issue_refresh_token, login_rate_limiter,
                               redeem_password_reset_token, redeem_refresh_token, verify_password)
from app.models.entities import User
from app.schemas.auth import ForgotPasswordInput, ForgotPasswordOut, RefreshInput, RegisterInput, ResetPasswordInput, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_ROLES = {"ADMIN", "REVIEWER"}


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterInput, db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user_optional)):
    """
    Bootstrap rule: the very first user ever created becomes ADMIN
    automatically and needs no token (there is nobody to authenticate as
    yet, and auth may still be disabled at that point). Every registration
    after that, once auth is enabled, requires an authenticated ADMIN.
    """
    user_count = db.scalar(select(func.count(User.id))) or 0
    is_bootstrap = user_count == 0
    if not is_bootstrap and settings.auth_enabled:
        if current_user is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required", headers={"WWW-Authenticate": "Bearer"})
        if current_user.role != "ADMIN":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an ADMIN can register new users")
    if db.scalar(select(User).where(User.username == body.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already exists")
    role = "ADMIN" if is_bootstrap else (body.role.upper() if body.role else "REVIEWER")
    if role not in ALLOWED_ROLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"role must be one of {sorted(ALLOWED_ROLES)}")
    user = User(username=body.username, hashed_password=hash_password(body.password), role=role, full_name=body.full_name)
    db.add(user); db.commit(); db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    login_rate_limiter.check(form.username)
    user = db.scalar(select(User).where(User.username == form.username))
    if not user or not user.is_active or not verify_password(form.password, user.hashed_password):
        login_rate_limiter.record_failure(form.username)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    login_rate_limiter.record_success(form.username)
    refresh_token = issue_refresh_token(db, user)
    db.commit()
    return TokenOut(access_token=create_access_token(user.username, user.role), role=user.role, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenOut)
def refresh(body: RefreshInput, db: Session = Depends(get_db)):
    """Exchanges a still-valid refresh token for a new access token, rotating the refresh token (old one is revoked)."""
    user = redeem_refresh_token(db, body.refresh_token)
    new_refresh = issue_refresh_token(db, user)
    db.commit()
    return TokenOut(access_token=create_access_token(user.username, user.role), role=user.role, refresh_token=new_refresh)


@router.post("/forgot-password", response_model=ForgotPasswordOut)
def forgot_password(body: ForgotPasswordInput, db: Session = Depends(get_db)):
    """
    Always returns 200 with a generic message, whether or not the username
    exists, so this endpoint can't be used to enumerate valid usernames. The
    reset token itself is only included in the response when the user exists
    -- and, since this MVP has no email service, it is returned directly
    here rather than emailed. Replace with real email delivery (and drop
    reset_token from the response) before a public deployment.
    """
    user = db.scalar(select(User).where(User.username == body.username))
    if not user or not user.is_active:
        return ForgotPasswordOut(detail="If that account exists, a reset token has been issued.")
    token = issue_password_reset_token(db, user)
    db.commit()
    return ForgotPasswordOut(reset_token=token, detail="Reset token issued (returned directly here; a real deployment would email it instead).")


@router.post("/reset-password", response_model=UserOut)
def reset_password(body: ResetPasswordInput, db: Session = Depends(get_db)):
    user = redeem_password_reset_token(db, body.reset_token)
    user.hashed_password = hash_password(body.new_password)
    db.commit(); db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def me(user: User | None = Depends(get_current_user)):
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Auth is disabled on this deployment (AUTH_ENABLED=false)")
    return user
