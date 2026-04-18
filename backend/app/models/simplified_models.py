"""
Simplified SQLAlchemy models for Phase 1 
"""
from sqlalchemy import Column, String, Integer, JSON, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from app.database import Base


class PlayerDB(Base):
    """Simplified Player model for Phase 1"""
    __tablename__ = "players_v2"

    player_id = Column(String(36), primary_key=True, unique=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    session_token = Column(String(500), unique=True, nullable=True, index=True)
    is_host = Column(Boolean, default=False)
    
    # Chips (JSON for flexibility)
    chips = Column(JSON, default={
        "white": 0, "red": 0, "green": 0, 
        "blue": 0, "black": 0, "purple": 0, "orange": 0
    })
    
    # UI color
    color = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<PlayerDB {self.name} ({self.player_id[:8]}...)>"
