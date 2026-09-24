from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    
    DATABASE_URL: str
    SECRET_KEY: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    API_STR: str
    API_TITLE: str
    API_DESCRIPTION: str
    API_VERSION: str
    


settings = Settings()