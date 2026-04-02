from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Therapist OS API"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = Field(default="development")
    LOG_LEVEL: str = Field(default="INFO")
    API_SECRET_KEY: str = Field(default="dev-secret-key")
    DATABASE_URL: str = Field(default="sqlite:///./therapist_os.db")
    FRONTEND_URL: str = Field(default="http://localhost:3000")
    TRUSTED_HOSTS: str = Field(default="localhost,127.0.0.1,testserver")
    USER_TIMEZONE: str = Field(default="Europe/London")
    USER_LATITUDE: float = Field(default=51.5074)
    USER_LONGITUDE: float = Field(default=-0.1278)
    SEED_DEMO_DATA: bool = Field(default=True)
    AUTO_RUN_MIGRATIONS: bool = Field(default=False)

    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GOOGLE_AI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    GARMIN_EMAIL: str = ""
    GARMIN_PASSWORD: str = ""
    TRUELAYER_CLIENT_ID: str = ""
    TRUELAYER_CLIENT_SECRET: str = ""
    TRUELAYER_ACCESS_TOKEN: str = ""
    TRUELAYER_REFRESH_TOKEN: str = ""
    SPOTIFY_CLIENT_ID: str = ""
    SPOTIFY_CLIENT_SECRET: str = ""
    SPOTIFY_REFRESH_TOKEN: str = ""
    OWNTRACKS_SECRET: str = ""

    WHISPER_MODEL: str = "base.en"
    NTFY_TOPIC: str = ""
    NTFY_SERVER: str = "https://ntfy.sh"
    BACKUP_DIR: str = "/backups"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
