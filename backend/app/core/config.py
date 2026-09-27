from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./material_master.db"
    embedding_model: str | None = None
    matching_weights: dict[str, float] = {
        "semantic": .25, "attributes": .30, "specification": .25,
        "category": .10, "unit": .05, "procurement": .05,
    }
    confidence_thresholds: dict[str, float] = {"strong": .95, "review": .80, "investigate": .60}
    log_level: str = "INFO"

    # --- Authentication (Section F) ---
    # Off by default so the existing demo/frontend keeps working with zero
    # changes. Set AUTH_ENABLED=true (and a real JWT_SECRET) before exposing
    # the API beyond a trusted local/demo environment.
    auth_enabled: bool = False
    jwt_secret: str = "change-me-in-.env-before-enabling-auth"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    refresh_token_expire_days: int = 14
    password_reset_expire_minutes: int = 30
    login_max_attempts: int = 5
    login_lockout_minutes: int = 15
    cors_allow_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    max_upload_bytes: int = 10 * 1024 * 1024  # 10 MB

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
