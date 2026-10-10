import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "AI Project Intelligence & Risk Advisor"
    VERSION: str = "1.0.0"
    API_PORT: int = int(os.getenv("PORT", "8001"))
    HOST: str = "0.0.0.0"
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./backend/storage/chroma_db")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
