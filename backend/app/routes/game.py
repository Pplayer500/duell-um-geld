from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.database import get_db
from app.services import GameService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/game", tags=["game"])


# ==================== PYDANTIC SCHEMAS ====================

class GameListResponse(BaseModel):
    game_id: str
    state: str
    players: Dict[str, Any]
    host_id: Optional[str] = None
    created_at: Optional[str] = None


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

@router.get("/list", response_model=List[GameListResponse])
def list_games(db = Depends(get_db)):
    """Get all active games"""
    try:
        service = GameService(db)
        games = service.get_all_games()
        
        # Convert to response format
        response = []
        for game_id, game_data in games.items():
            response.append(GameListResponse(
                game_id=game_id,
                state=game_data.get('state', 'unknown'),
                players=game_data.get('players', {}),
                host_id=game_data.get('host_id'),
                created_at=game_data.get('created_at')
            ))
        
        return response
    except Exception as e:
        logger.error(f"Error listing games: {e}")
        raise HTTPException(status_code=500, detail="Could not list games")


@router.post("/create", response_model=CreateGameResponse)
def create_game(request: CreateGameRequest, db = Depends(get_db)):
    """Create a new game"""
    try:
        service = GameService(db)
        game_id = service.create_game(request.host_id)
        return CreateGameResponse(game_id=game_id)
    except Exception as e:
        logger.error(f"Error creating game: {e}")
        raise HTTPException(status_code=500, detail="Could not create game")


@router.post("/join")
def join_game(request: JoinGameRequest, db = Depends(get_db)):
    """Join an existing game"""
    try:
        service = GameService(db)
        success, message = service.join_game(request.game_id, request.player_id, request.name)
        
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
def start_game(request: StartGameRequest, db = Depends(get_db)):
    """Start a game"""
    try:
        service = GameService(db)
        success, message = service.start_game(request.game_id)
        
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
def place_bet(request: BetRequest, db = Depends(get_db)):
    """Place a bet"""
    try:
        service = GameService(db)
        success, message = service.place_bet(request.game_id, request.player_id, request.amount)
        
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
def fold(request: ActionRequest, db = Depends(get_db)):
    """Fold (player gives up)"""
    try:
        service = GameService(db)
        success, message = service.fold(request.game_id, request.player_id)
        
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
def all_in(request: ActionRequest, db = Depends(get_db)):
    """Go all-in"""
    try:
        service = GameService(db)
        success, message = service.go_all_in(request.game_id, request.player_id)
        
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
def submit_answer(request: AnswerRequest, db = Depends(get_db)):
    """Submit answer to a question"""
    try:
        service = GameService(db)
        success, message = service.submit_answer(
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
def get_game_state(game_id: str, db = Depends(get_db)):
    """Get current game state"""
    try:
        service = GameService(db)
        state = service.get_game_state(game_id)
        
        if not state:
            raise HTTPException(status_code=404, detail="Game not found")
        
        return state
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting game state: {e}")
        raise HTTPException(status_code=500, detail="Could not get game state")


@router.post("/end/{game_id}")
def end_game(game_id: str, db = Depends(get_db)):
    """End a game"""
    try:
        service = GameService(db)
        success, message = service.end_game(game_id)
        
        if success:
            return {"status": "ended"}
        else:
            raise HTTPException(status_code=400, detail=message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending game: {e}")
        raise HTTPException(status_code=500, detail="Could not end game")
