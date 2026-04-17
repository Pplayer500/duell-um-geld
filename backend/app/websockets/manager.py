from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
import json
import logging

logger = logging.getLogger(__name__)


class GameConnectionManager:
    """Manages WebSocket connections for games"""
    
    def __init__(self):
        # game_id -> set of connected WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # player_id -> WebSocket (for direct messaging)
        self.player_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, game_id: str, player_id: str, websocket: WebSocket):
        """Accept a WebSocket connection"""
        await websocket.accept()
        
        if game_id not in self.active_connections:
            self.active_connections[game_id] = set()
        
        self.active_connections[game_id].add(websocket)
        self.player_connections[player_id] = websocket
        
        logger.info(f"Player {player_id} connected to game {game_id}")
    
    def disconnect(self, game_id: str, player_id: str, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if game_id in self.active_connections:
            self.active_connections[game_id].discard(websocket)
            
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]
        
        if player_id in self.player_connections:
            del self.player_connections[player_id]
        
        logger.info(f"Player {player_id} disconnected from game {game_id}")
    
    async def broadcast(self, game_id: str, message: dict):
        """Send message to all players in a game"""
        if game_id not in self.active_connections:
            return
        
        message_json = json.dumps(message)
        
        for connection in self.active_connections[game_id]:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.error(f"Error sending message: {e}")
    
    async def send_personal_message(self, player_id: str, message: dict):
        """Send message to specific player"""
        if player_id not in self.player_connections:
            return
        
        message_json = json.dumps(message)
        
        try:
            await self.player_connections[player_id].send_text(message_json)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")


# Global connection manager
connection_manager = GameConnectionManager()
