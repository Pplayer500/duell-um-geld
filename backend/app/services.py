"""
Game Service - Business logic for poker game (Synchronous)
Uses repositories to persist data
"""
from sqlalchemy.orm import Session
from app.repositories import GameRepository, PlayerRepository, AnswerRepository, SessionRepository
from app.config import settings
from app.models.database_models import GameStateEnum, PlayerStatusEnum
import logging

logger = logging.getLogger(__name__)


class GameService:
    """Handles all game business logic"""
    
    def __init__(self, db: Session):
        self.db = db
        self.games = GameRepository(db)
        self.players = PlayerRepository(db)
        self.answers = AnswerRepository(db)
        self.sessions = SessionRepository(db)
    
    # ==================== GAME CREATION ====================
    
    def create_game(self, host_id: str) -> str:
        """Create new game"""
        game_id = self.games.create_game(host_id)
        logger.info(f"✅ Game {game_id} created by host {host_id}")
        return game_id
    
    def start_game(self, game_id: str) -> tuple[bool, str]:
        """Start a game"""
        game = self.games.get_game(game_id)
        
        if not game:
            return False, "Game not found"
        
        # Get player count
        game_players = self.players.get_game_players(game_id)
        
        if len(game_players) < settings.MIN_PLAYERS_TO_START:
            return False, f"Need at least {settings.MIN_PLAYERS_TO_START} players to start"
        
        if len(game_players) > settings.MAX_PLAYERS_PER_GAME:
            return False, f"Too many players (max {settings.MAX_PLAYERS_PER_GAME})"
        
        # Update game state
        self.games.update_game_state(game_id, GameStateEnum.QUESTION_ACTIVE.value)
        logger.info(f"✅ Game {game_id} started with {len(game_players)} players")
        
        return True, "Game started"
    
    # ==================== PLAYER MANAGEMENT ====================
    
    def join_game(self, game_id: str, player_id: str, name: str) -> tuple[bool, str]:
        """Add player to game"""
        game = self.games.get_game(game_id)
        
        if not game:
            return False, "Game not found"
        
        if game.state != GameStateEnum.LOBBY.value:
            return False, "Game already started"
        
        # Get current player count
        game_players = self.players.get_game_players(game_id)
        
        if len(game_players) >= settings.MAX_PLAYERS_PER_GAME:
            return False, f"Game full (max {settings.MAX_PLAYERS_PER_GAME})"
        
        # Add player
        position = len(game_players) + 1
        success = self.players.add_player_to_game(game_id, player_id, name, position)
        
        if success:
            logger.info(f"✅ Player {name} ({player_id}) joined game {game_id}")
            return True, "Joined game"
        else:
            return False, "Could not join game"
    
    # ==================== BETTING & ACTIONS ====================
    
    def place_bet(self, game_id: str, player_id: str, amount: int) -> tuple[bool, str]:
        """Place a bet"""
        player = self.players.get_player(player_id)
        
        if not player or player.game_id != game_id:
            return False, "Player not in game"
        
        # Update player's current bet
        success = self.players.update_player_bet(player_id, amount)
        
        if success:
            logger.info(f"✅ Player {player_id} bet {amount}")
            return True, "Bet placed"
        else:
            return False, "Could not place bet"
    
    def fold(self, game_id: str, player_id: str) -> tuple[bool, str]:
        """Fold (player gives up)"""
        success = self.players.update_player_status(player_id, PlayerStatusEnum.FOLDED.value)
        
        if success:
            logger.info(f"✅ Player {player_id} folded")
            return True, "Folded"
        else:
            return False, "Could not fold"
    
    def go_all_in(self, game_id: str, player_id: str) -> tuple[bool, str]:
        """Go all-in"""
        success = self.players.update_player_status(player_id, PlayerStatusEnum.ALL_IN.value)
        
        if success:
            logger.info(f"✅ Player {player_id} went all-in")
            return True, "All-in"
        else:
            return False, "Could not go all-in"
    
    # ==================== QUESTIONS & ANSWERS ====================
    
    def submit_answer(self, game_id: str, player_id: str, question_index: int, answer: float) -> tuple[bool, str]:
        """Submit answer to a question"""
        player = self.players.get_player(player_id)
        
        if not player or player.game_id != game_id:
            return False, "Player not in game"
        
        success = self.answers.save_answer(game_id, player_id, question_index, answer)
        
        if success:
            logger.info(f"✅ Player {player_id} answered question {question_index}")
            return True, "Answer saved"
        else:
            return False, "Could not save answer"
    
    # ==================== GAME STATE ====================
    
    def get_game_state(self, game_id: str) -> dict:
        """Get current game state"""
        game = self.games.get_game(game_id)
        
        if not game:
            return None
        
        game_players = self.players.get_game_players(game_id)
        
        return {
            "game_id": game.game_id,
            "state": game.state,
            "player_count": len(game_players),
            "started_at": game.started_at,
            "updated_at": game.started_at or game.created_at,
            "players": [
                {
                    "player_id": p.player_id,
                    "name": p.name,
                    "status": p.status,
                    "chips": p.chips_json,
                    "current_bet": p.current_bet
                }
                for p in game_players
            ]
        }
    
    def end_game(self, game_id: str) -> tuple[bool, str]:
        """End game"""
        success = self.games.end_game(game_id)
        
        if success:
            logger.info(f"✅ Game {game_id} ended")
            return True, "Game ended"
        else:
            return False, "Could not end game"
