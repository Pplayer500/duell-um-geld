from pydantic import BaseModel
from typing import Dict, Optional
from enum import Enum
from datetime import datetime


class PlayerStatus(str, Enum):
    ACTIVE = "active"
    FOLDED = "folded"
    ALL_IN = "all_in"
    ELIMINATED = "eliminated"
    WAITING = "waiting"


class PlayerChips(BaseModel):
    """Player's chip holdings"""
    player_id: str
    white: int = 0      # Value: 1
    red: int = 0        # Value: 5
    green: int = 0      # Value: 10
    blue: int = 0       # Value: 25
    black: int = 0      # Value: 100
    purple: int = 0     # Value: 500
    orange: int = 0     # Value: 1000
    
    def total_value(self) -> int:
        """Calculate total chip value"""
        return (
            self.white * 1 +
            self.red * 5 +
            self.green * 10 +
            self.blue * 25 +
            self.black * 100 +
            self.purple * 500 +
            self.orange * 1000
        )
    
    def to_dict(self) -> Dict[str, int]:
        """Convert to dictionary for JSON serialization"""
        return {
            "white": self.white,
            "red": self.red,
            "green": self.green,
            "blue": self.blue,
            "black": self.black,
            "purple": self.purple,
            "orange": self.orange
        }


class Player(BaseModel):
    """Player model"""
    player_id: str
    name: str
    position: int
    status: PlayerStatus = PlayerStatus.ACTIVE
    chips: PlayerChips
    current_bet: int = 0
    answer: Optional[float] = None
    session_token: str = ""
    created_at: datetime = None
    last_seen: datetime = None
    color: Optional[str] = None  # UI Color
    
    def __init__(self, **data):
        super().__init__(**data)
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.last_seen is None:
            self.last_seen = datetime.now()
    
    class Config:
        use_enum_values = False
