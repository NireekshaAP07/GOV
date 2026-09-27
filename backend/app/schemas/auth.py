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
