from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import Optional
import uuid
import hashlib
from datetime import datetime, timedelta
from app.database import get_db
from app.config import settings
from sqlalchemy.orm import Session


router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    name: str
    password: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip()


class LoginResponse(BaseModel):
    token: str
    player_id: str
    is_host: bool
    name: str


class LogoutRequest(BaseModel):
    token: str


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login or create player"""
    
    try:
        from app.models.database_models import PlayerDB
        
        player_id = str(uuid.uuid4())
        is_host = False
        
        # Check if host password is correct
        if request.password and request.password == settings.HOST_PASSWORD:
            is_host = True
            player_id = "host_" + str(uuid.uuid4())
        else:
            # Überprüfe ob normaler Spieler bereits existiert
            existing_player = db.query(PlayerDB).filter(
                PlayerDB.name == request.name.strip(),
                PlayerDB.game_id == None  # Not in a game
            ).first()
            
            if existing_player:
                player_id = existing_player.player_id
        
        # Generate session token
        token = str(uuid.uuid4())
        
        # Erstelle oder update Player
        player = db.query(PlayerDB).filter(PlayerDB.player_id == player_id).first()
        
        if player:
            # Update existing player
            player.session_token = token
            player.last_seen = datetime.utcnow()
            player.name = request.name.strip()
        else:
            # Create new player
            player = PlayerDB(
                player_id=player_id,
                name=request.name.strip(),
                session_token=token,
                position=0,
                game_id=None
            )
            db.add(player)
        
        db.commit()
        db.refresh(player)
        
        return LoginResponse(
            token=token,
            player_id=player_id,
            is_host=is_host,
            name=player.name
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")


@router.post("/logout")
async def logout(request: LogoutRequest, db: Session = Depends(get_db)):
    """Logout player"""
    
    try:
        from app.models.database_models import PlayerDB
        
        player = db.query(PlayerDB).filter(
            PlayerDB.session_token == request.token
        ).first()
        
        if player:
            player.session_token = None
            db.commit()
        
        return {"status": "logged_out"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Logout failed: {str(e)}")


@router.get("/verify")
async def verify_token(token: str, db: Session = Depends(get_db)):
    """Verify if token is valid"""
    
    try:
        from app.models.database_models import PlayerDB
        
        player = db.query(PlayerDB).filter(
            PlayerDB.session_token == token
        ).first()
        
        if not player:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return {
            "valid": True,
            "player_id": player.player_id,
            "name": player.name,
            "is_host": player.player_id.startswith("host_")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")
