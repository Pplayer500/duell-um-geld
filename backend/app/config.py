from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application Settings"""
    
    # API
    API_TITLE: str = "Duell um Geld - Game API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Real-time multiplayer poker game with questions"
    
    # Server
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    DEBUG: bool = True
    
    # Database - supports sqlite:// or postgresql://
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/duell_um_geld"
    REDIS_URL: str = "redis://localhost:6379"
    
    # CORS - for production, set to your domain
    CORS_ORIGINS: list = [
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://localhost",
        "http://127.0.0.1:5173"
    ]
    
    # Game settings
    MAX_PLAYERS_PER_GAME: int = 100
    MIN_PLAYERS_TO_START: int = 2
    SESSION_TIMEOUT_MINUTES: int = 30
    DISCONNECT_GRACE_PERIOD: int = 30  # seconds
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
