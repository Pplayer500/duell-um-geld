"""
Repository pattern for database access (Synchronous)
Separates business logic from database operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, update
from app.models.database_models import GameDB, PlayerDB, AnswerDB, SessionDB, GameRoundDB
from datetime import datetime, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)


class GameRepository:
    """Database operations for games"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_game(self, host_id: str) -> str:
        """Create new game"""
        game_id = str(uuid.uuid4())
        game = GameDB(
            game_id=game_id,
            host_id=host_id
        )
        self.db.add(game)
        self.db.commit()
        return game_id
    
    def get_game(self, game_id: str) -> GameDB:
        """Get game by ID"""
        stmt = select(GameDB).where(GameDB.game_id == game_id)
        result = self.db.execute(stmt)
        return result.scalars().first()
    
    def update_game_state(self, game_id: str, state: str) -> bool:
        """Update game state"""
        stmt = update(GameDB).where(GameDB.game_id == game_id).values(state=state)
        self.db.execute(stmt)
        self.db.commit()
        return True
    
    def add_player_to_game(self, game_id: str, player_id: str, name: str, position: int) -> bool:
        """Add player to game"""
        try:
            player = PlayerDB(
                player_id=player_id,
                game_id=game_id,
                name=name,
                position=position,
                chips_json={
                    "white": 20, "red": 16, "green": 10, 
                    "blue": 8, "black": 26, "purple": 0, "orange": 0
                }
            )
            self.db.add(player)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error adding player: {e}")
            self.db.rollback()
            return False
    
    def end_game(self, game_id: str) -> bool:
        """End game and set end timestamp"""
        stmt = update(GameDB).where(GameDB.game_id == game_id).values(
            state="game_ended",
            ended_at=datetime.now()
        )
        self.db.execute(stmt)
        self.db.commit()
        return True
    
    def get_all_games(self) -> list:
        """Get all games"""
        stmt = select(GameDB)
        result = self.db.execute(stmt)
        return result.scalars().all()


class PlayerRepository:
    """Database operations for players"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_player(self, player_id: str) -> PlayerDB:
        """Get player by ID"""
        stmt = select(PlayerDB).where(PlayerDB.player_id == player_id)
        result = self.db.execute(stmt)
        return result.scalars().first()
    
    def get_game_players(self, game_id: str):
        """Get all players in a game"""
        stmt = select(PlayerDB).where(PlayerDB.game_id == game_id)
        result = self.db.execute(stmt)
        return result.scalars().all()
    
    def update_player_chips(self, player_id: str, chips_json: dict) -> bool:
        """Update player's chip holdings"""
        stmt = update(PlayerDB).where(PlayerDB.player_id == player_id).values(chips_json=chips_json)
        self.db.execute(stmt)
        self.db.commit()
        return True
    
    def update_player_status(self, player_id: str, status: str) -> bool:
        """Update player status (active, folded, eliminated, etc)"""
        stmt = update(PlayerDB).where(PlayerDB.player_id == player_id).values(status=status)
        self.db.execute(stmt)
        self.db.commit()
        return True
    
    def update_player_bet(self, player_id: str, bet_amount: int) -> bool:
        """Update player's current bet"""
        stmt = update(PlayerDB).where(PlayerDB.player_id == player_id).values(current_bet=bet_amount)
        self.db.execute(stmt)
        self.db.commit()
        return True
    
    def remove_player(self, player_id: str) -> bool:
        """Remove player from database"""
        stmt = delete(PlayerDB).where(PlayerDB.player_id == player_id)
        self.db.execute(stmt)
        self.db.commit()
        return True


class AnswerRepository:
    """Database operations for answers"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def save_answer(self, game_id: str, player_id: str, question_index: int, answer: float) -> bool:
        """Save player's answer"""
        try:
            answer_obj = AnswerDB(
                answer_id=str(uuid.uuid4()),
                game_id=game_id,
                player_id=player_id,
                question_index=question_index,
                answer_value=answer
            )
            self.db.add(answer_obj)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error saving answer: {e}")
            self.db.rollback()
            return False
    
    def get_answers_for_question(self, game_id: str, question_index: int):
        """Get all answers for a question in a game"""
        stmt = select(AnswerDB).where(
            (AnswerDB.game_id == game_id) &
            (AnswerDB.question_index == question_index)
        )
        result = self.db.execute(stmt)
        return result.scalars().all()


class SessionRepository:
    """Database operations for sessions"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_session(self, player_id: str, game_id: str, is_host: bool, ip_address: str = None) -> str:
        """Create new session"""
        session_id = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(minutes=30)
        
        session = SessionDB(
            session_id=session_id,
            player_id=player_id,
            game_id=game_id,
            is_host=is_host,
            ip_address=ip_address,
            expires_at=expires_at
        )
        self.db.add(session)
        self.db.commit()
        return session_id
    
    def get_session(self, session_id: str) -> SessionDB:
        """Get session by ID"""
        stmt = select(SessionDB).where(
            (SessionDB.session_id == session_id) &
            (SessionDB.is_active == True) &
            (SessionDB.expires_at > datetime.now())
        )
        result = self.db.execute(stmt)
        return result.scalars().first()
    
    def invalidate_session(self, session_id: str) -> bool:
        """Mark session as inactive"""
        stmt = update(SessionDB).where(SessionDB.session_id == session_id).values(is_active=False)
        self.db.execute(stmt)
        self.db.commit()
        return True
