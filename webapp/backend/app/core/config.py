from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str
    DB_ECHO: bool = False
    API_STR: str
    API_TITLE: str
    API_DESCRIPTION: str
    API_VERSION: str
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    SESSION_EXPIRE_MINUTES: int = 10080
    SESSION_COOKIE_NAME: str = "ase_session"
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_SAMESITE: str = "lax"
    CSRF_COOKIE_NAME: str = "ase_csrf"
    CSRF_HEADER_NAME: str = "X-CSRF-Token"

    MAX_UPLOAD_SIZE: int
    STORAGE_ROOT: str


settings = Settings()
