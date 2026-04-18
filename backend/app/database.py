"""
Database configuration - SQLite for local testing, PostgreSQL for production
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
import logging
import os

logger = logging.getLogger(__name__)

# Use SQLite by default for local dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./game.db")

# For local development, force SQLite if DATABASE_URL is not explicitly a real PostgreSQL URL
if "postgresql" not in DATABASE_URL or "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL:
    DATABASE_URL = "sqlite:///./game.db"

logger.info(f"📦 Using database: {DATABASE_URL.split('@')[0] if '@' in DATABASE_URL else 'SQLite'}")

# Create engine
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args
)

# Session factory
SessionLocal = sessionmaker(
    engine,
    expire_on_commit=False,
    autoflush=False
)

# SQLAlchemy base
Base = declarative_base()


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database"""
    # Import models HERE to ensure Base is set up
    from app.models.simplified_models import PlayerDB
    
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database initialized")


def close_db():
    """Close database"""
    engine.dispose()





