from pydantic import BaseModel, Field


class RegisterInput(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=72)
    full_name: str | None = None
    role: str = "REVIEWER"  # ADMIN | REVIEWER; ignored unless the caller is already an ADMIN (see route)


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    full_name: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    refresh_token: str | None = None


class RefreshInput(BaseModel):
    refresh_token: str


class ForgotPasswordInput(BaseModel):
    username: str


class ForgotPasswordOut(BaseModel):
    # No email service in this MVP -- see API.md "Known auth limitations".
    # In a real deployment this token would be emailed, never returned here.
    reset_token: str | None = None
    detail: str


class ResetPasswordInput(BaseModel):
    reset_token: str
    new_password: str = Field(min_length=8, max_length=72)
