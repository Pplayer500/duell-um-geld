from pydantic import BaseModel
from typing import Dict, List, Optional
from enum import Enum
from datetime import datetime


class GameState(str, Enum):
    LOBBY = "lobby"
    QUESTION_ACTIVE = "question_active"
    QUESTION_ANSWERING = "question_answering"
    BETTING_ROUND_1 = "betting_round_1"
    BETTING_ROUND_2 = "betting_round_2"
    BETTING_ROUND_3 = "betting_round_3"
    ROUND_COMPLETE = "round_complete"
    GAME_ENDED = "game_ended"


class BettingRound(BaseModel):
    """Betting round info"""
    round_number: int  # 1, 2, or 3
    small_blind: int
    big_blind: int
    pot: int = 0
    current_highest_bet: int = 0


class Game(BaseModel):
    """Game state model"""
    game_id: str
    host_id: str
    state: GameState = GameState.LOBBY
    players: Dict[str, dict] = {}  # player_id -> player_data
    current_question_index: int = 0
    betting_round: BettingRound = None
    small_blind_player: Optional[str] = None
    big_blind_player: Optional[str] = None
    next_to_act: Optional[str] = None
    folded_players: List[str] = []
    all_in_players: List[str] = []
    eliminated_players: List[str] = []
    answers: Dict[int, Dict[str, float]] = {}  # question_id -> {player_id: answer}
    pot: Dict[str, int] = {}  # chip_color -> count
    created_at: datetime = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    
    def __init__(self, **data):
        super().__init__(**data)
        if self.created_at is None:
            self.created_at = datetime.now()
    
    class Config:
        use_enum_values = False
