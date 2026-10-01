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

    MAX_UPLOAD_SIZE: int
    STORAGE_ROOT: str
    
    DEFAULT_USER: str
    DEFAULT_PASSWORD: str


settings = Settings()