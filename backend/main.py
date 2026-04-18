from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import json

from app.config import settings
from app.routes import auth
from app.routes import game
from app.websockets import connection_manager
from app.game_engine import GameEngine
from app.database import init_db, close_db

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global game engine
game_engine = GameEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🚀 Application starting...")
    
    # Initialize database tables
    try:
        init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
    
    yield
    
    logger.info("🛑 Application shutting down...")
    close_db()

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(game.router)


# ===================== HEALTH CHECK =====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "description": settings.API_DESCRIPTION
    }


# ===================== WEBSOCKET ENDPOINTS =====================

@app.websocket("/ws/{game_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str, player_id: str):
    """
    WebSocket endpoint for real-time game updates
    
    Message format:
    {
        "type": "bet" | "fold" | "answer" | "action",
        "data": {...}
    }
    """
    await connection_manager.connect(game_id, player_id, websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            # Parse JSON message
            try:
                message = json.loads(data)
                message_type = message.get("type")
                message_data = message.get("data", {})
                
                # Handle different message types
                if message_type == "bet":
                    # Player placed a bet
                    amount = message_data.get("amount", 0)
                    success, msg = game_engine.place_bet(game_id, player_id, amount)
                    
                    if success:
                        # Broadcast to all players in game
                        await connection_manager.broadcast(game_id, {
                            "type": "player_action",
                            "player_id": player_id,
                            "action": "bet",
                            "amount": amount
                        })
                
                elif message_type == "fold":
                    # Player folded
                    game_engine.fold(game_id, player_id)
                    
                    await connection_manager.broadcast(game_id, {
                        "type": "player_action",
                        "player_id": player_id,
                        "action": "fold"
                    })
                
                elif message_type == "answer":
                    # Player answered question
                    question_index = message_data.get("question_index", 0)
                    answer = message_data.get("answer", 0)
                    
                    game_engine.submit_answer(game_id, player_id, question_index, answer)
                    
                    await connection_manager.broadcast(game_id, {
                        "type": "player_action",
                        "player_id": player_id,
                        "action": "answer",
                        "question_index": question_index
                    })
                
                elif message_type == "status_request":
                    # Player requested current game status
                    game = game_engine.get_game(game_id)
                    if game:
                        await connection_manager.send_personal_message(player_id, {
                            "type": "game_status",
                            "data": game.dict()
                        })
                
                else:
                    logger.warning(f"Unknown message type: {message_type}")
            
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
    
    except WebSocketDisconnect:
        connection_manager.disconnect(game_id, player_id, websocket)
        
        # Notify other players
        await connection_manager.broadcast(game_id, {
            "type": "player_left",
            "player_id": player_id
        })


# ===================== HEALTH CHECK =====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "description": settings.API_DESCRIPTION
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
