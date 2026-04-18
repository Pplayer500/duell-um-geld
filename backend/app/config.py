from pydantic_settings import BaseSettings
from typing import Optional, List
from pydantic import field_validator


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
    
    # CORS - comma-separated string from env, converted to list
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Convert various formats to comma-separated string"""
        try:
            if isinstance(v, list):
                # If somehow a list comes in, convert to string
                return ','.join([str(x).strip() for x in v if x])
            if isinstance(v, str):
                # Already a string, just validate it's not empty
                return v.strip() or "http://localhost:5173,http://localhost:3000"
            # Fallback for any other type
            return "http://localhost:5173,http://localhost:3000"
        except Exception:
            # Any error, use defaults
            return "http://localhost:5173,http://localhost:3000"
    
    def get_cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list for FastAPI"""
        try:
            return [origin.strip() for origin in self.CORS_ORIGINS.split(',') if origin.strip()]
        except Exception:
            return ["http://localhost:5173", "http://localhost:3000"]
    
    # Game settings
    MAX_PLAYERS_PER_GAME: int = 100
    MIN_PLAYERS_TO_START: int = 2
    SESSION_TIMEOUT_MINUTES: int = 30
    DISCONNECT_GRACE_PERIOD: int = 30  # seconds
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Host Authentication
    HOST_PASSWORD: str = "Passwort"  # From original Streamlit code
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
