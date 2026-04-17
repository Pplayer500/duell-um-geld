from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import uuid
from app.game_engine import GameEngine


router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    name: str
    password: Optional[str] = None


class LoginResponse(BaseModel):
    token: str
    player_id: str
    is_host: bool


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login or create player"""
    
    player_id = str(uuid.uuid4())
    is_host = False
    
    # Check if host password is correct
    if request.password and request.password == "Passwort":  # From original Streamlit code
        is_host = True
        player_id = "host_" + str(uuid.uuid4())
    
    # Generate session token
    token = str(uuid.uuid4())
    
    return LoginResponse(
        token=token,
        player_id=player_id,
        is_host=is_host
    )


@router.post("/logout")
async def logout(token: str):
    """Logout"""
    return {"status": "logged_out"}
