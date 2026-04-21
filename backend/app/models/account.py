"""
Pydantic models for Account Management
"""
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class RoleEnum(str, Enum):
    PLAYER = "player"
    HOST = "host"
    MAIN_HOST = "main_host"


class PlayerAccountResponse(BaseModel):
    """Response model for player account"""
    player_id: str
    name: str
    username: Optional[str]
    role: str
    awards: int
    first_login_completed: bool
    is_online: bool
    created_at: str
    
    class Config:
        from_attributes = True


class CreatePlayerRequest(BaseModel):
    """Create new player account"""
    name: str
    role: str = "player"  # "player" or "host"
    password: Optional[str] = None  # For hosts: individual password
    

class UpdatePlayerUsernameRequest(BaseModel):
    """Update player username"""
    username: str


class SetPlayerPasswordRequest(BaseModel):
    """Set password for all players"""
    password: str


class CreateHostRequest(BaseModel):
    """Create new host account"""
    name: str
    password: str
    role: str = "host"  # "host" only


class LoginRequest(BaseModel):
    """Login request"""
    name: str
    password: Optional[str] = None


class LoginResponse(BaseModel):
    """Login response"""
    token: str
    player_id: str
    name: str
    role: str
    is_first_login: bool  # True if first_login_completed is False
    username: Optional[str]


class PlayerListResponse(BaseModel):
    """List of players with details"""
    players: List[PlayerAccountResponse]


class AllGamesResponse(BaseModel):
    """Response for all active games"""
    games: List[dict]
