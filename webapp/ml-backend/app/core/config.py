from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    API_STR: str = "/api"
    API_TITLE: str = "Manuscript AI ML API"
    API_DESCRIPTION: str = "Text segmentation (BLLA) and recognition (CATMuS Medieval) for the main backend."
    API_VERSION: str = "0.1.0"

    # Empty means kraken's bundled default BLLA segmentation model.
    SEGMENTATION_MODEL: str = ""
    RECOGNITION_MODEL: str = "/models/catmus-medieval.mlmodel"

    MAX_UPLOAD_SIZE: int = 52428800


settings = Settings()
