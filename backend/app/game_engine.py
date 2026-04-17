import json
import uuid
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from app.models import Game, GameState, Player, PlayerChips, BettingRound, PlayerStatus
import math


class GameEngine:
    """
    Core game logic for Duell um Geld
    Handles poker mechanics, blinds, betting, eliminations
    """
    
    def __init__(self):
        self.games: Dict[str, Game] = {}
        self.game_states: Dict[str, dict] = {}
    
    def create_game(self, host_id: str) -> str:
        """Create a new game and return game_id"""
        game_id = str(uuid.uuid4())
        game = Game(game_id=game_id, host_id=host_id)
        self.games[game_id] = game
        self.game_states[game_id] = {
            "small_blind_initial": 10,
            "big_blind_initial": 20,
            "raise_percent": 100,
            "max_rounds": 20,
        }
        return game_id
    
    def add_player(self, game_id: str, player: Player) -> bool:
        """Add a player to the game"""
        if game_id not in self.games:
            return False
        
        game = self.games[game_id]
        if game.state != GameState.LOBBY:
            return False
        
        game.players[player.player_id] = player.dict()
        return True
    
    def remove_player(self, game_id: str, player_id: str) -> bool:
        """Remove a player from the game"""
        if game_id not in self.games:
            return False
        
        game = self.games[game_id]
        if player_id in game.players:
            del game.players[player_id]
            if player_id in game.folded_players:
                game.folded_players.remove(player_id)
            if player_id in game.all_in_players:
                game.all_in_players.remove(player_id)
            return True
        return False
    
    def start_game(self, game_id: str) -> bool:
        """Start the game"""
        if game_id not in self.games:
            return False
        
        game = self.games[game_id]
        if len(game.players) < 2:
            return False
        
        game.state = GameState.QUESTION_ACTIVE
        game.started_at = datetime.now()
        
        # Initialize blinds
        players = list(game.players.values())
        if len(players) >= 2:
            game.small_blind_player = players[0]["player_id"]
            game.big_blind_player = players[1]["player_id"] if len(players) > 1 else players[0]["player_id"]
        
        return True
    
    def start_question_answering(self, game_id: str, question_index: int) -> bool:
        """Start the question answering phase"""
        if game_id not in self.games:
            return False
        
        game = self.games[game_id]
        game.state = GameState.QUESTION_ANSWERING
        game.current_question_index = question_index
        game.answers[question_index] = {}
        
        return True
    
    def submit_answer(self, game_id: str, player_id: str, question_index: int, answer: float) -> bool:
        """Submit answer for a question"""
        if game_id not in self.games:
            return False
        
        game = self.games[game_id]
        
        if question_index not in game.answers:
            game.answers[question_index] = {}
        
        game.answers[question_index][player_id] = answer
        return True
    
    def start_betting_round(self, game_id: str, round_number: int) -> bool:
        """Start a betting round (1, 2, or 3)"""
        if game_id not in self.games or round_number not in [1, 2, 3]:
            return False
        
        game = self.games[game_id]
        state_map = {
            1: GameState.BETTING_ROUND_1,
            2: GameState.BETTING_ROUND_2,
            3: GameState.BETTING_ROUND_3,
        }
        game.state = state_map[round_number]
        
        # Calculate blinds with scaling (from user's Streamlit code)
        small_blind_initial = self.game_states[game_id]["small_blind_initial"]
        big_blind_initial = self.game_states[game_id]["big_blind_initial"]
        raise_percent = self.game_states[game_id]["raise_percent"]
        
        # Blinds increase every 2 questions, capped at 100/200
        effective_cycles = (game.current_question_index // 2)
        multiplier = (1 + raise_percent / 100) ** effective_cycles
        
        small_blind = max(int(small_blind_initial * multiplier), 100)
        big_blind = max(int(big_blind_initial * multiplier), 200)
        
        game.betting_round = BettingRound(
            round_number=round_number,
            small_blind=small_blind,
            big_blind=big_blind,
            pot=self.calculate_pot_value(game_id)
        )
        
        # Set next to act
        players_list = list(game.players.values())
        if players_list:
            game.next_to_act = players_list[0]["player_id"]
        
        return True
    
    def place_bet(self, game_id: str, player_id: str, amount: int) -> Tuple[bool, str]:
        """Place a bet for the current player"""
        if game_id not in self.games:
            return False, "Game not found"
        
        game = self.games[game_id]
        
        if player_id not in game.players:
            return False, "Player not found"
        
        player = game.players[player_id]
        
        # Check if player has enough chips
        chips = PlayerChips(**player["chips"]) if isinstance(player["chips"], dict) else player["chips"]
        total_chips = chips.total_value()
        
        if total_chips < amount:
            return False, "Insufficient chips"
        
        # Deduct chips from player and add to pot
        # This is simplified - in production you'd track chip removal
        player["current_bet"] = amount
        
        # Move to next player
        self.next_player(game_id)
        
        return True, "Bet placed"
    
    def fold(self, game_id: str, player_id: str) -> bool:
        """Player folds"""
        if game_id not in self.games:
            return False
        
        game = self.games[game_id]
        
        if player_id not in game.folded_players:
            game.folded_players.append(player_id)
        
        self.next_player(game_id)
        return True
    
    def check_eliminations(self, game_id: str) -> List[str]:
        """Check for eliminated players (0 chips)"""
        if game_id not in self.games:
            return []
        
        game = self.games[game_id]
        eliminated = []
        
        for player_id, player_data in game.players.items():
            if player_id not in game.eliminated_players:
                chips = PlayerChips(**player_data["chips"]) if isinstance(player_data["chips"], dict) else player_data["chips"]
                if chips.total_value() == 0:
                    game.eliminated_players.append(player_id)
                    eliminated.append(player_id)
        
        return eliminated
    
    def get_active_players(self, game_id: str) -> List[str]:
        """Get list of active (non-eliminated) players"""
        if game_id not in self.games:
            return []
        
        game = self.games[game_id]
        return [
            pid for pid in game.players.keys()
            if pid not in game.eliminated_players
        ]
    
    def calculate_rankings(self, game_id: str) -> List[Tuple[int, str, int]]:
        """Calculate final rankings by total chip value"""
        if game_id not in self.games:
            return []
        
        game = self.games[game_id]
        active_players = self.get_active_players(game_id)
        
        player_totals = []
        for player_id in active_players:
            player_data = game.players[player_id]
            chips = PlayerChips(**player_data["chips"]) if isinstance(player_data["chips"], dict) else player_data["chips"]
            total = chips.total_value()
            player_totals.append((player_id, player_data.get("name", player_id), total))
        
        # Sort by total chips descending
        player_totals.sort(key=lambda x: x[2], reverse=True)
        
        # Return [(rank, player_id, total_chips), ...]
        return [(i + 1, pid_name[1], pid_name[2]) for i, pid_name in enumerate(player_totals)]
    
    def next_player(self, game_id: str) -> None:
        """Move to next player in betting order"""
        if game_id not in self.games:
            return
        
        game = self.games[game_id]
        players_list = [
            p for p in game.players.values()
            if p["player_id"] not in game.folded_players
            and p["player_id"] not in game.eliminated_players
        ]
        
        if len(players_list) <= 1:
            # Round complete
            return
        
        # Simple circular rotation - in production, improve this
        if game.next_to_act:
            current_idx = next(
                (i for i, p in enumerate(players_list) if p["player_id"] == game.next_to_act),
                0
            )
            next_idx = (current_idx + 1) % len(players_list)
            game.next_to_act = players_list[next_idx]["player_id"]
    
    def calculate_pot_value(self, game_id: str) -> int:
        """Calculate total value of current pot"""
        if game_id not in self.games:
            return 0
        
        game = self.games[game_id]
        pot_value = 0
        
        # Define chip values
        chip_values = {
            "white": 1,
            "red": 5,
            "green": 10,
            "blue": 25,
            "black": 100,
            "purple": 500,
            "orange": 1000,
        }
        
        for color, count in game.pot.items():
            pot_value += count * chip_values.get(color, 0)
        
        return pot_value
    
    def end_game(self, game_id: str) -> bool:
        """End the game"""
        if game_id not in self.games:
            return False
        
        game = self.games[game_id]
        game.state = GameState.GAME_ENDED
        game.ended_at = datetime.now()
        
        return True
    
    def get_game(self, game_id: str) -> Optional[Game]:
        """Get game by ID"""
        return self.games.get(game_id)
    
    def get_player(self, game_id: str, player_id: str) -> Optional[dict]:
        """Get player from game"""
        if game_id not in self.games:
            return None
        
        return self.games[game_id].players.get(player_id)
