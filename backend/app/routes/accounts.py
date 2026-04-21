"""
Account Management Routes for Main Host
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid
from app.database import get_db
from app.models.database_models import PlayerDB
from app.models.account import (
    PlayerAccountResponse, CreatePlayerRequest, 
    UpdatePlayerUsernameRequest, SetPlayerPasswordRequest,
    PlayerListResponse
)
from app.config import settings
import hashlib

router = APIRouter(prefix="/api/accounts", tags=["accounts"])

# Global variable to store current player password
current_player_password = None


def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_main_host(password: Optional[str] = None) -> bool:
    """Verify Main Host credentials"""
    if not password:
        return False
    return password == settings.HOST_PASSWORD


# ==================== MAIN HOST ENDPOINTS ====================

@router.post("/admin/set-player-password")
async def set_player_password(
    request: SetPlayerPasswordRequest,
    admin_password: str = Header(..., alias="X-Admin-Password"),
    db: Session = Depends(get_db)
):
    """Set password for all players (Main Host only)"""
    global current_player_password
    
    if not verify_main_host(admin_password):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        # Store the plaintext password for display purposes
        current_player_password = request.password
        
        # Store hashed password in database
        password_hash = hash_password(request.password)
        
        # Update all player accounts
        players = db.query(PlayerDB).filter(PlayerDB.role == "player").all()
        for player in players:
            player.password_hash = password_hash
        
        db.commit()
        return {"status": "success", "message": f"Password set for {len(players)} players", "password": request.password}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/create-player")
async def create_player(
    request: CreatePlayerRequest,
    admin_password: str = Header(..., alias="X-Admin-Password"),
    db: Session = Depends(get_db)
):
    """Create new player account (Main Host only)"""
    
    if not verify_main_host(admin_password):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        # Check if name already exists
        existing = db.query(PlayerDB).filter(PlayerDB.name == request.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Player name already exists")
        
        player_id = str(uuid.uuid4())
        
        # Determine role
        role = request.role if request.role in ["player", "host"] else "player"
        is_host = role == "host"
        
        # Hash password if provided (for hosts)
        password_hash = None
        if is_host and request.password:
            password_hash = hash_password(request.password)
        
        player = PlayerDB(
            player_id=player_id,
            name=request.name.strip(),
            role=role,
            is_host=is_host,
            password_hash=password_hash,
            awards=0,
            first_login_completed=False,
            is_online=False,
            created_at=datetime.utcnow()
        )
        
        db.add(player)
        db.commit()
        db.refresh(player)
        
        return PlayerAccountResponse(
            player_id=player.player_id,
            name=player.name,
            username=player.username,
            role=player.role,
            awards=player.awards,
            first_login_completed=player.first_login_completed,
            is_online=player.is_online,
            created_at=player.created_at.isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/players")
async def list_players(
    admin_password: str = Header(..., alias="X-Admin-Password"),
    db: Session = Depends(get_db)
):
    """Get all players sorted by online status (Main Host only)"""
    
    if not verify_main_host(admin_password):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        # Sort: Online first, then alphabetically by name
        players = db.query(PlayerDB)\
            .filter(PlayerDB.role == "player")\
            .order_by(PlayerDB.is_online.desc(), PlayerDB.name)\
            .all()
        
        player_responses = [
            PlayerAccountResponse(
                player_id=p.player_id,
                name=p.name,
                username=p.username,
                role=p.role,
                awards=p.awards,
                first_login_completed=p.first_login_completed,
                is_online=p.is_online,
                created_at=p.created_at.isoformat()
            )
            for p in players
        ]
        
        return {"players": player_responses}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/admin/players/{player_id}/username")
async def update_player_username(
    player_id: str,
    request: UpdatePlayerUsernameRequest,
    admin_password: str = Header(..., alias="X-Admin-Password"),
    db: Session = Depends(get_db)
):
    """Update player username (Main Host only)"""
    
    if not verify_main_host(admin_password):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        player = db.query(PlayerDB).filter(PlayerDB.player_id == player_id).first()
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        if player.role != "player":
            raise HTTPException(status_code=400, detail="Can only update player accounts")
        
        # Check if username already exists
        existing = db.query(PlayerDB).filter(
            PlayerDB.username == request.username,
            PlayerDB.player_id != player_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        player.username = request.username
        db.commit()
        db.refresh(player)
        
        return PlayerAccountResponse(
            player_id=player.player_id,
            name=player.name,
            username=player.username,
            role=player.role,
            awards=player.awards,
            first_login_completed=player.first_login_completed,
            is_online=player.is_online,
            created_at=player.created_at.isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PLAYER ENDPOINTS ====================

@router.put("/set-username")
async def set_username(
    request: UpdatePlayerUsernameRequest,
    token: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Set username on first login (Player only)"""
    
    try:
        player = db.query(PlayerDB).filter(PlayerDB.session_token == token).first()
        if not player:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if player.role != "player":
            raise HTTPException(status_code=400, detail="Only players can set username via popup")
        
        # Check if username already exists
        existing = db.query(PlayerDB).filter(
            PlayerDB.username == request.username,
            PlayerDB.player_id != player.player_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        player.username = request.username
        player.first_login_completed = True
        db.commit()
        db.refresh(player)
        
        return {"status": "success", "username": player.username}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me")
async def get_current_account(
    token: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Get current player account info"""
    
    try:
        player = db.query(PlayerDB).filter(PlayerDB.session_token == token).first()
        if not player:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Update last_seen
        player.is_online = True
        player.last_seen = datetime.utcnow()
        db.commit()
        
        return PlayerAccountResponse(
            player_id=player.player_id,
            name=player.name,
            username=player.username,
            role=player.role,
            awards=player.awards,
            first_login_completed=player.first_login_completed,
            is_online=player.is_online,
            created_at=player.created_at.isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/player-password")
async def get_player_password(
    admin_password: str = Header(..., alias="X-Admin-Password")
):
    """Get current player password (Main Host only)"""
    global current_player_password
    
    if not verify_main_host(admin_password):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    if not current_player_password:
        raise HTTPException(status_code=404, detail="No player password set yet")
    
    return {"password": current_player_password}
