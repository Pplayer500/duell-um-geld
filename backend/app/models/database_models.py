"""
SQLAlchemy ORM models for database persistence
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Enum, ForeignKey, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum as PyEnum
from app.database import Base


class GameStateEnum(str, PyEnum):
    """Game states"""
    LOBBY = "lobby"
    QUESTION_ACTIVE = "question_active"
    QUESTION_ANSWERING = "question_answering"
    BETTING_ROUND_1 = "betting_round_1"
    BETTING_ROUND_2 = "betting_round_2"
    BETTING_ROUND_3 = "betting_round_3"
    ROUND_COMPLETE = "round_complete"
    GAME_ENDED = "game_ended"


class PlayerStatusEnum(str, PyEnum):
    """Player statuses"""
    ACTIVE = "active"
    FOLDED = "folded"
    ALL_IN = "all_in"
    ELIMINATED = "eliminated"
    WAITING = "waiting"


class GameDB(Base):
    """Game table"""
    __tablename__ = "games"

    game_id = Column(String(36), primary_key=True, unique=True, index=True)
    host_id = Column(String(36), ForeignKey("players.player_id"), nullable=False)
    state = Column(Enum(GameStateEnum), default=GameStateEnum.LOBBY, nullable=False)
    small_blind_player_id = Column(String(36), nullable=True)
    big_blind_player_id = Column(String(36), nullable=True)
    next_to_act_id = Column(String(36), nullable=True)
    current_pot = Column(Integer, default=0)
    current_question_index = Column(Integer, default=0)
    small_blind_amount = Column(Integer, default=10)
    big_blind_amount = Column(Integer, default=20)
    max_rounds = Column(Integer, default=20)
    raise_percent = Column(Integer, default=100)
    
    current_betting_round = Column(Integer, default=0)
    folded_players = Column(JSON, default=[])  # List of player_ids
    all_in_players = Column(JSON, default=[])  # List of player_ids
    eliminated_players = Column(JSON, default=[])  # List of player_ids
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships - specify foreign_keys explicitly to avoid ambiguity
    players = relationship(
        "PlayerDB",
        back_populates="game",
        cascade="all, delete-orphan",
        foreign_keys="[PlayerDB.game_id]"
    )
    answers = relationship(
        "AnswerDB",
        back_populates="game",
        cascade="all, delete-orphan",
        foreign_keys="[AnswerDB.game_id]"
    )


class PlayerDB(Base):
    """Player table"""
    __tablename__ = "players"

    player_id = Column(String(36), primary_key=True, unique=True, index=True)
    game_id = Column(String(36), ForeignKey("games.game_id"), nullable=True)
    name = Column(String(100), nullable=False)
    position = Column(Integer, nullable=False)
    status = Column(Enum(PlayerStatusEnum), default=PlayerStatusEnum.ACTIVE)
    current_bet = Column(Integer, default=0)
    password_hash = Column(String(255), nullable=True)  # For host authentication
    session_token = Column(String(500), unique=True, nullable=True, index=True)
    
    # Chips (JSON format for flexibility)
    chips_json = Column(JSON, default={
        "white": 0, "red": 0, "green": 0, 
        "blue": 0, "black": 0, "purple": 0, "orange": 0
    })
    
    # UI
    color = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    game = relationship("GameDB", back_populates="players")
    answers = relationship("AnswerDB", back_populates="player")


class AnswerDB(Base):
    """Question answers table"""
    __tablename__ = "answers"

    answer_id = Column(String(36), primary_key=True, unique=True, index=True)
    game_id = Column(String(36), ForeignKey("games.game_id"), nullable=False)
    player_id = Column(String(36), ForeignKey("players.player_id"), nullable=False)
    question_index = Column(Integer, nullable=False)
    answer_value = Column(Float, nullable=False)
    correct_answer = Column(Float, nullable=True)
    is_correct = Column(Boolean, default=False)
    chips_won = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    game = relationship("GameDB", back_populates="answers")
    player = relationship("PlayerDB", back_populates="answers")


class GameRoundDB(Base):
    """Game round history"""
    __tablename__ = "game_rounds"

    round_id = Column(String(36), primary_key=True, unique=True, index=True)
    game_id = Column(String(36), ForeignKey("games.game_id"), nullable=False, index=True)
    round_number = Column(Integer, nullable=False)
    question_index = Column(Integer, nullable=False)
    small_blind = Column(Integer, nullable=False)
    big_blind = Column(Integer, nullable=False)
    final_pot = Column(Integer, default=0)
    winner_id = Column(String(36), nullable=True)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    round_data = Column(JSON)  # Full round state for logs


class SessionDB(Base):
    """User sessions for Redis fallback"""
    __tablename__ = "sessions"

    session_id = Column(String(500), primary_key=True, unique=True, index=True)
    player_id = Column(String(36), ForeignKey("players.player_id"), nullable=False, index=True)
    game_id = Column(String(36), ForeignKey("games.game_id"), nullable=True)
    is_host = Column(Boolean, default=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
