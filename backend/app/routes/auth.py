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
    """Login - only MARC can auto-create, others must be created by Main Host"""
    
    try:
        from app.models.database_models import PlayerDB
        import hashlib
        
        player_name = request.name.strip()
        provided_password = request.password.strip()
        provided_password_hash = hashlib.sha256(provided_password.encode()).hexdigest()
        
        # Check if this is MARC (Main Host)
        is_main_host_attempt = player_name == "MARC"
        
        if is_main_host_attempt:
            # MARC must provide the correct Main Host password
            if provided_password != settings.HOST_PASSWORD:
                raise HTTPException(status_code=401, detail="Invalid password for MARC")
            
            # Check if MARC exists
            existing_marc = db.query(PlayerDB).filter(PlayerDB.name == "MARC").first()
            
            if existing_marc:
                # MARC exists - just login
                token = str(uuid.uuid4())
                existing_marc.session_token = token
                existing_marc.last_seen = datetime.utcnow()
                db.commit()
                db.refresh(existing_marc)
                
                return LoginResponse(
                    token=token,
                    player_id=existing_marc.player_id,
                    is_host=existing_marc.is_host,
                    name=existing_marc.name
                )
            else:
                # Create MARC (Main Host) on first login
                player_id = str(uuid.uuid4())
                token = str(uuid.uuid4())
                password_hash = hashlib.sha256(settings.HOST_PASSWORD.encode()).hexdigest()
                
                marc = PlayerDB(
                    player_id=player_id,
                    name="MARC",
                    session_token=token,
                    password_hash=password_hash,
                    is_host=True,
                    role="main_host",
                    last_seen=datetime.utcnow()
                )
                db.add(marc)
                db.commit()
                db.refresh(marc)
                
                return LoginResponse(
                    token=token,
                    player_id=player_id,
                    is_host=True,
                    name="MARC"
                )
        
        else:
            # Regular player - must already exist (created by Main Host)
            existing_player = db.query(PlayerDB).filter(PlayerDB.name == player_name).first()
            
            if not existing_player:
                # Player doesn't exist - only Main Host can create players
                raise HTTPException(status_code=404, detail="Player not found. Only Main Host can create new players.")
            
            # Player exists - validate password
            if not existing_player.password_hash:
                raise HTTPException(status_code=401, detail="Invalid password")
            
            if existing_player.password_hash != provided_password_hash:
                raise HTTPException(status_code=401, detail="Invalid password")
            
            # Password correct - generate new token
            token = str(uuid.uuid4())
            existing_player.session_token = token
            existing_player.last_seen = datetime.utcnow()
            db.commit()
            db.refresh(existing_player)
            
            return LoginResponse(
                token=token,
                player_id=existing_player.player_id,
                is_host=existing_player.is_host,
                name=existing_player.name
            )
    
    except HTTPException:
        raise
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
