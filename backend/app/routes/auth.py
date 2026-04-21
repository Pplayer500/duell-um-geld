from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import Optional
import uuid
from datetime import datetime
from app.database import get_db
from app.config import settings
from sqlalchemy.orm import Session


router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    name: str
    password: str
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError("Password is required")
        return v.strip()


class LoginResponse(BaseModel):
    token: str
    player_id: str
    is_host: bool
    name: str


class LogoutRequest(BaseModel):
    token: str


# CORS Preflight handler
@router.options("/login")
async def login_options():
    """CORS preflight for login"""
    return {}


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
        
        # Generate session token
        token = str(uuid.uuid4())
        
        # Create new player
        player = PlayerDB(
            player_id=player_id,
            name=request.name.strip(),
            session_token=token,
            is_host=is_host,
            last_seen=datetime.utcnow()
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")


# CORS Preflight handler for logout
@router.options("/logout")
async def logout_options():
    """CORS preflight for logout"""
    return {}


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


# CORS Preflight handler for verify
@router.options("/verify")
async def verify_options():
    """CORS preflight for verify"""
    return {}


@router.get("/verify")
async def verify_token(token: str, db: Session = Depends(get_db)):
    """Verify if token is valid"""
    
    try:
        from app.models.simplified_models import PlayerDB
        
        player = db.query(PlayerDB).filter(
            PlayerDB.session_token == token
        ).first()
        
        if not player:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return {
            "valid": True,
            "player_id": player.player_id,
            "name": player.name,
            "is_host": player.is_host
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")
