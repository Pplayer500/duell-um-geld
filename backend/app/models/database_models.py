"""
SQLAlchemy ORM Models for Game Database
"""
from sqlalchemy import Column, String, Integer, JSON, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum as PyEnum
from app.database import Base


class GameStateEnum(str, PyEnum):
    LOBBY = "lobby"
    QUESTION_ACTIVE = "question_active"
    QUESTION_ANSWERING = "question_answering"
    BETTING_ROUND_1 = "betting_round_1"
    BETTING_ROUND_2 = "betting_round_2"
    BETTING_ROUND_3 = "betting_round_3"
    ROUND_COMPLETE = "round_complete"
    GAME_ENDED = "game_ended"


class PlayerStatusEnum(str, PyEnum):
    ACTIVE = "active"
    FOLDED = "folded"
    ALL_IN = "all_in"
    ELIMINATED = "eliminated"
    WAITING = "waiting"


class GameDB(Base):
    """Game model"""
    __tablename__ = "games"

    game_id = Column(String(36), primary_key=True, unique=True, index=True)
    host_id = Column(String(36), ForeignKey("players_v2.player_id"), nullable=False)
    state = Column(String(50), default=GameStateEnum.LOBBY.value)
    
    # Game metadata
    current_question_index = Column(Integer, default=0)
    small_blind = Column(Integer, default=10)
    big_blind = Column(Integer, default=20)
    pot = Column(Integer, default=0)
    
    # Game state
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<GameDB {self.game_id[:8]}... (state={self.state})>"


class PlayerDB(Base):
    """Player model"""
    __tablename__ = "players_v2"

    player_id = Column(String(36), primary_key=True, unique=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    session_token = Column(String(500), unique=True, nullable=True, index=True)
    game_id = Column(String(36), ForeignKey("games.game_id"), nullable=True)
    
    # Player state in game
    status = Column(String(50), default=PlayerStatusEnum.ACTIVE.value)
    position = Column(Integer, nullable=True)  # Position at table
    current_bet = Column(Integer, default=0)
    
    # Chips (JSON for flexibility)
    chips_json = Column(JSON, default={
        "white": 0, "red": 0, "green": 0, 
        "blue": 0, "black": 0, "purple": 0, "orange": 0
    })
    
    # UI color
    color = Column(String(50), nullable=True)
    is_host = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<PlayerDB {self.name} ({self.player_id[:8]}...)>"


class AnswerDB(Base):
    """Answer to a question"""
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(String(36), ForeignKey("games.game_id"), nullable=False)
    player_id = Column(String(36), ForeignKey("players_v2.player_id"), nullable=False)
    
    question_index = Column(Integer, nullable=False)
    answer_value = Column(Integer, nullable=False)  # Player's numerical answer
    
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<AnswerDB game={self.game_id[:8]}... player={self.player_id[:8]}... q={self.question_index}>"


class SessionDB(Base):
    """Game session tracking"""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(String(36), ForeignKey("games.game_id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    
    # Round metadata
    small_blind = Column(Integer, default=10)
    big_blind = Column(Integer, default=20)
    pot = Column(Integer, default=0)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<SessionDB game={self.game_id[:8]}... round={self.round_number}>"


class GameRoundDB(Base):
    """Individual round details"""
    __tablename__ = "game_rounds"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(String(36), ForeignKey("games.game_id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    
    question_index = Column(Integer, nullable=False)
    correct_answer = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<GameRoundDB game={self.game_id[:8]}... round={self.round_number}>"
