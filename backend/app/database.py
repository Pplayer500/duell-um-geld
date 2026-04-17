"""
Database configuration - SQLite for local testing
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import logging

logger = logging.getLogger(__name__)

# Hardcode SQLite for now (local testing)
DATABASE_URL = "sqlite:///./game.db"

# Create engine
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}
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
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database initialized")


def close_db():
    """Close database"""
    engine.dispose()



