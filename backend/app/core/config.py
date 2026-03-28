from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str                # e.g. https://xxxx.supabase.co
    SUPABASE_ANON_KEY: str           # Publishable key — used server-side to proxy auth

    # Database (direct Postgres connection via asyncpg)
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host/db

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        if v and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # App
    APP_NAME: str = "Shunya Arcade"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()  # type: ignore[call-arg]
