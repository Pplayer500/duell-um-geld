import { useState, useEffect } from 'react'
import { API } from '../utils/api'
import useGameStore from '../store/gameStore'
import '../styles/lobby.css'

function GameLobby({ onStartGame }) {
  const [gameId, setGameId] = useState(localStorage.getItem('gameId') || '')
  const [joinGameId, setJoinGameId] = useState('')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const { isHost } = useGameStore()

  useEffect(() => {
    if (gameId) {
      loadGameStatus()
      const interval = setInterval(loadGameStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [gameId])

  const loadGameStatus = async () => {
    try {
      const response = await API.get(`/game/status/${gameId}`)
      setPlayers(Object.values(response.data.players || {}))
      
      // Wenn Spiel bereits gestartet wurde, zur game-Seite gehen
      if (response.data.state && response.data.state !== 'lobby') {
        onStartGame()
      }
    } catch (err) {
      console.error('Error loading game status:', err)
    }
  }

  const createGame = async () => {
    setLoading(true)
    try {
      const response = await API.post('/game/create', {
        host_id: localStorage.getItem('player_id')
      })
      const newGameId = response.data.game_id
      setGameId(newGameId)
      localStorage.setItem('gameId', newGameId)
    } catch (err) {
      console.error('Error creating game:', err)
    } finally {
      setLoading(false)
    }
  }

  const joinGame = async () => {
    if (!joinGameId.trim()) {
      alert('Bitte Game ID eingeben')
      return
    }
    setLoading(true)
    try {
      await API.post('/game/join', {
        game_id: joinGameId,
        player_id: localStorage.getItem('player_id'),
        name: localStorage.getItem('player_name') || 'Player'
      })
      setGameId(joinGameId)
      localStorage.setItem('gameId', joinGameId)
      setJoinGameId('')
    } catch (err) {
      alert('Fehler beim Beitreten: ' + (err.response?.data?.detail || 'Unbekannter Fehler'))
      console.error('Error joining game:', err)
    } finally {
      setLoading(false)
    }
  }

  const startGame = async () => {
    setLoading(true)
    try {
      await API.post('/game/start', {
        game_id: gameId
      })
      onStartGame()
    } catch (err) {
      console.error('Error starting game:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1>🎲 Lobby</h1>

        {!gameId ? (
          <div className="no-game">
            <p>Noch kein Spiel</p>
            
            {isHost && (
              <>
                <button onClick={createGame} disabled={loading} className="primary">
                  {loading ? 'Erstelle...' : 'Spiel erstellen ➕'}
                </button>
                <p>Oder:</p>
              </>
            )}
            
            <div className="join-section">
              <input
                type="text"
                placeholder="Game ID eingeben"
                value={joinGameId}
                onChange={(e) => setJoinGameId(e.target.value)}
                disabled={loading}
              />
              <button onClick={joinGame} disabled={loading}>
                {loading ? 'Beitritt...' : 'Beitreten 🤝'}
              </button>
            </div>
          </div>
        ) : (
          <div className="game-setup">
            <div className="game-info">
              <p><strong>Game ID:</strong> {gameId.slice(0, 8)}...</p>
              <p><strong>Spieler:</strong> {players.length}</p>
            </div>

            <div className="players-list">
              <h3>Spieler 👥</h3>
              {players.length === 0 ? (
                <p className="empty">Warte auf Spieler...</p>
              ) : (
                <ul>
                  {players.map((player) => (
                    <li key={player.player_id}>
                      <span>{player.name}</span>
                      <span className="position">Pos {player.position}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isHost && (
              <button 
                onClick={startGame} 
                disabled={loading || players.length < 2}
                className="primary"
              >
                {loading ? 'Starting...' : 'Spiel starten 🎮'}
              </button>
            )}
            
            {!isHost && (
              <p className="waiting">Warte bis Host das Spiel startet...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default GameLobby
