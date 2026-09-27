from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, get_current_user_optional, hash_password, verify_password
from app.models.entities import User
from app.schemas.auth import RegisterInput, TokenOut, UserOut

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
    user = db.scalar(select(User).where(User.username == form.username))
    if not user or not user.is_active or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    return TokenOut(access_token=create_access_token(user.username, user.role), role=user.role)


@router.get("/me", response_model=UserOut)
def me(user: User | None = Depends(get_current_user)):
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Auth is disabled on this deployment (AUTH_ENABLED=false)")
    return user
