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
    AUTH_COOKIE_NAME: str = Field(default="therapist_os_session")
    AUTH_SESSION_HOURS: int = Field(default=24)
    AUTH_REMEMBER_DAYS: int = Field(default=30)
    ADMIN_EMAIL: str = Field(default="")
    ADMIN_PASSWORD: str = Field(default="")
    ADMIN_NAME: str = Field(default="Malique")
    USER_TIMEZONE: str = Field(default="Europe/London")
    USER_LATITUDE: float = Field(default=51.5074)
    USER_LONGITUDE: float = Field(default=-0.1278)
    SEED_DEMO_DATA: bool = Field(default=True)
    AUTO_RUN_MIGRATIONS: bool = Field(default=False)
    DATA_SOURCE_ENCRYPTION_KEY: str = ""
    OLLAMA_BASE_URL: str = Field(default="http://host.docker.internal:11434")
    LOCAL_QWEN_MODEL: str = Field(default="qwen3.5:35b")
    LOCAL_CHAT_MODEL: str = Field(default="")
    OLLAMA_REQUEST_TIMEOUT_SECONDS: int = Field(default=45)
    OLLAMA_KEEP_ALIVE: str = Field(default="8h")
    OLLAMA_PREWARM_ON_STARTUP: bool = Field(default=True)
    OLLAMA_NUM_CTX: int = Field(default=8192)
    OLLAMA_THINK: bool = Field(default=False)
    GARMIN_MIN_SYNC_INTERVAL_MINUTES: int = Field(default=360)
    GARMIN_RATE_LIMIT_BACKOFF_MINUTES: int = Field(default=1440)
    GARMIN_SYNC_HOUR: int = Field(default=4)
    GARMIN_SYNC_MINUTE: int = Field(default=15)
    SPOTIFY_SYNC_INTERVAL_MINUTES: int = Field(default=5)

    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GOOGLE_AI_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
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
    THERAPIST_DEFAULT_MODEL: str = "qwen2.5:3b"
    THERAPIST_DEFAULT_TTS_PROVIDER: str = "kokoro"
    THERAPIST_DEFAULT_TTS_VOICE: str = "af_heart"
    PIPER_BINARY: str = "piper"
    PIPER_VOICE_DIR: str = "/models/piper"
    PIPER_VOICE_MODEL_URL: str = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx"
    PIPER_VOICE_CONFIG_URL: str = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json"
    KOKORO_MODEL_DIR: str = "/models/kokoro"
    KOKORO_MODEL_URL: str = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx"
    KOKORO_VOICES_URL: str = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"
    NTFY_TOPIC: str = ""
    NTFY_SERVER: str = "https://ntfy.sh"
    BACKUP_DIR: str = "/backups"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
