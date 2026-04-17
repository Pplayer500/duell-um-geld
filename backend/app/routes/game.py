from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.services import GameService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/game", tags=["game"])


# ==================== PYDANTIC SCHEMAS ====================

class CreateGameRequest(BaseModel):
    host_id: str


class CreateGameResponse(BaseModel):
    game_id: str


class JoinGameRequest(BaseModel):
    game_id: str
    player_id: str
    name: str


class StartGameRequest(BaseModel):
    game_id: str


class ActionRequest(BaseModel):
    game_id: str
    player_id: str


class BetRequest(BaseModel):
    game_id: str
    player_id: str
    amount: int


class AnswerRequest(BaseModel):
    game_id: str
    player_id: str
    question_index: int
    answer: float


# ==================== GAME ENDPOINTS ====================

@router.post("/create", response_model=CreateGameResponse)
async def create_game(request: CreateGameRequest, db = Depends(get_db)):
    """Create a new game"""
    try:
        service = GameService(db)
        game_id = await service.create_game(request.host_id)
        return CreateGameResponse(game_id=game_id)
    except Exception as e:
        logger.error(f"Error creating game: {e}")
        raise HTTPException(status_code=500, detail="Could not create game")


@router.post("/join")
async def join_game(request: JoinGameRequest, db = Depends(get_db)):
    """Join an existing game"""
    try:
        service = GameService(db)
        success, message = await service.join_game(request.game_id, request.player_id, request.name)
        
        if success:
            return {"status": "joined", "message": message}
        else:
            raise HTTPException(status_code=400, detail=message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining game: {e}")
        raise HTTPException(status_code=500, detail="Could not join game")


@router.post("/start")
async def start_game(request: StartGameRequest, db = Depends(get_db)):
    """Start a game"""
    try:
        service = GameService(db)
        success, message = await service.start_game(request.game_id)
        
        if success:
            return {"status": "started", "message": message}
        else:
            raise HTTPException(status_code=400, detail=message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting game: {e}")
        raise HTTPException(status_code=500, detail="Could not start game")


@router.post("/bet")
async def place_bet(request: BetRequest, db = Depends(get_db)):
    """Place a bet"""
    try:
        service = GameService(db)
        success, message = await service.place_bet(request.game_id, request.player_id, request.amount)
        
        if success:
            return {"status": "bet_placed", "amount": request.amount}
        else:
            raise HTTPException(status_code=400, detail=message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error placing bet: {e}")
        raise HTTPException(status_code=500, detail="Could not place bet")


@router.post("/fold")
async def fold(request: ActionRequest, db = Depends(get_db)):
    """Fold (player gives up)"""
    try:
        service = GameService(db)
        success, message = await service.fold(request.game_id, request.player_id)
        
        if success:
            return {"status": "folded"}
        else:
            raise HTTPException(status_code=400, detail=message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error folding: {e}")
        raise HTTPException(status_code=500, detail="Could not fold")


@router.post("/all-in")
async def all_in(request: ActionRequest, db = Depends(get_db)):
    """Go all-in"""
    try:
        service = GameService(db)
        success, message = await service.go_all_in(request.game_id, request.player_id)
        
        if success:
            return {"status": "all_in"}
        else:
            raise HTTPException(status_code=400, detail=message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error going all-in: {e}")
        raise HTTPException(status_code=500, detail="Could not go all-in")


@router.post("/answer")
async def submit_answer(request: AnswerRequest, db = Depends(get_db)):
    """Submit answer to a question"""
    try:
        service = GameService(db)
        success, message = await service.submit_answer(
            request.game_id,
            request.player_id,
            request.question_index,
            request.answer
        )
        
        if success:
            return {"status": "answered", "question_index": request.question_index}
        else:
            raise HTTPException(status_code=400, detail=message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(status_code=500, detail="Could not submit answer")


@router.get("/state/{game_id}")
async def get_game_state(game_id: str, db = Depends(get_db)):
    """Get current game state"""
    try:
        service = GameService(db)
        state = await service.get_game_state(game_id)
        
        if not state:
            raise HTTPException(status_code=404, detail="Game not found")
        
        return state
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting game state: {e}")
        raise HTTPException(status_code=500, detail="Could not get game state")


@router.post("/end/{game_id}")
async def end_game(game_id: str, db = Depends(get_db)):
    """End a game"""
    try:
        service = GameService(db)
        success, message = await service.end_game(game_id)
        
        if success:
            return {"status": "ended"}
        else:
            raise HTTPException(status_code=400, detail=message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending game: {e}")
        raise HTTPException(status_code=500, detail="Could not end game")
