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
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
