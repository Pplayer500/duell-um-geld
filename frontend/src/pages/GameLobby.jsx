import { useState, useEffect } from 'react'
import { API } from '../utils/api'
import useGameStore from '../store/gameStore'
import '../styles/lobby.css'

function GameLobby({ onStartGame }) {
  const [gameId, setGameId] = useState(localStorage.getItem('gameId') || '')
  const [customGameId, setCustomGameId] = useState('')
  const [joinGameId, setJoinGameId] = useState('')
  const [playerName, setPlayerName] = useState(localStorage.getItem('player_name') || '')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const { isHost, addNotification, showConfirmDialog, closeConfirmDialog } = useGameStore()

  useEffect(() => {
    if (gameId) {
      loadGameStatus()
      const interval = setInterval(loadGameStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [gameId])

  const loadGameStatus = async () => {
    try {
      const response = await API.get(`/api/game/state/${gameId}`)
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
      const response = await API.post('/api/game/create', {
        host_id: localStorage.getItem('player_id')
      })
      const newGameId = response.data.game_id
      setGameId(newGameId)
      setCustomGameId(newGameId)
      localStorage.setItem('gameId', newGameId)
    } catch (err) {
      console.error('Error creating game:', err)
      addNotification('❌ Fehler beim Erstellen des Spiels', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateGameId = async () => {
    if (!customGameId.trim()) {
      addNotification('⚠️ Bitte Game ID eingeben', 'warning')
      return
    }
    setLoading(true)
    try {
      // Hier könnten wir eine API Call machen um die Game ID zu aktualisieren
      // Für jetzt speichern wir sie lokal
      setGameId(customGameId)
      localStorage.setItem('gameId', customGameId)
    } catch (err) {
      console.error('Error updating game ID:', err)
      addNotification('❌ Fehler beim Aktualisieren der Game ID', 'error')
    } finally {
      setLoading(false)
    }
  }

  const joinGame = async () => {
    if (!joinGameId.trim()) {
      addNotification('⚠️ Bitte Game ID eingeben', 'warning')
      return
    }
    if (!playerName.trim()) {
      addNotification('⚠️ Bitte Namen eingeben', 'warning')
      return
    }
    setLoading(true)
    try {
      const playerId = localStorage.getItem('player_id')
      localStorage.setItem('player_name', playerName)
      
      await API.post('/api/game/join', {
        game_id: joinGameId,
        player_id: playerId,
        name: playerName
      })
      setGameId(joinGameId)
      localStorage.setItem('gameId', joinGameId)
      setJoinGameId('')
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Unbekannter Fehler'
      addNotification('❌ Fehler beim Beitreten: ' + errorMsg, 'error')
      console.error('Error joining game:', err)
    } finally {
      setLoading(false)
    }
  }

  const startGame = async () => {
    setLoading(true)
    try {
      await API.post('/api/game/start', {
        game_id: gameId
      })
      onStartGame()
    } catch (err) {
      console.error('Error starting game:', err)
      addNotification('❌ Fehler beim Starten des Spiels', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    showConfirmDialog(
      'Ausloggen',
      'Wirklich ausloggen?',
      () => {
        localStorage.removeItem('token')
        localStorage.removeItem('player_id')
        localStorage.removeItem('is_host')
        localStorage.removeItem('player_name')
        localStorage.removeItem('gameId')
        window.location.reload()
      }
    )
  }

  // Spieler-Join-Screen
  if (!gameId) {
    return (
      <div className="lobby-container">
        <div className="logout-header">
          <button onClick={handleLogout} className="btn btn-logout">
            Ausloggen
          </button>
        </div>
        <div className="join-screen">
          <div className="join-card">
            <h1>🎮 Spiel beitreten</h1>
            
            <div className="form-group">
              <label>Dein Name</label>
              <input
                type="text"
                placeholder="Namen eingeben..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Game-ID</label>
              <input
                type="text"
                placeholder="Game-ID eingeben..."
                value={joinGameId}
                onChange={(e) => setJoinGameId(e.target.value)}
                disabled={loading}
              />
            </div>

            <button 
              onClick={joinGame} 
              disabled={loading}
              className="btn btn-primary btn-large"
            >
              {loading ? 'Wird beigetreten...' : 'Beitreten 🤝'}
            </button>

            {isHost && (
              <>
                <div className="divider">ODER</div>
                <button 
                  onClick={createGame} 
                  disabled={loading}
                  className="btn btn-success btn-large"
                >
                  {loading ? 'Wird erstellt...' : 'Neues Spiel erstellen ➕'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Host-Menü mit Tabs
  if (isHost) {
    return (
      <div className="lobby-container">
        <div className="logout-header">
          <button onClick={handleLogout} className="btn btn-logout">
            Ausloggen
          </button>
        </div>
        <div className="host-menu">
          <div className="menu-header">
            <h1>🎰 Host Menü</h1>
            <div className="game-id-display">Game-ID: <strong>{gameId.slice(0, 8).toUpperCase()}</strong></div>
          </div>

          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Einstellungen
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'dashboard' && (
              <div className="dashboard">
                <div className="dashboard-grid">
                  <div className="card info-card">
                    <h3>🎰 Game-ID</h3>
                    <div className="card-input-group">
                      <input
                        type="text"
                        value={customGameId || gameId}
                        onChange={(e) => setCustomGameId(e.target.value)}
                        placeholder="Game-ID eingeben..."
                        disabled={loading}
                      />
                      <button 
                        onClick={updateGameId}
                        disabled={loading}
                        className="btn btn-small"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>

                  <div className="card stat-card">
                    <h3>👥 Spieler</h3>
                    <div className="stat-number">{players.length}</div>
                  </div>
                </div>

                <div className="card players-card">
                  <h3>👥 Spielerliste</h3>
                  {players.length === 0 ? (
                    <p className="empty-state">Warte auf Spieler...</p>
                  ) : (
                    <div className="players-list">
                      {players.map((player) => (
                        <div key={player.player_id} className="player-item">
                          <span className="player-name">{player.name}</span>
                          <span className="player-position">Pos {player.position}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card chips-card">
                  <h3>💰 Chips</h3>
                  <p className="empty-state">Wird noch hinzugefügt...</p>
                </div>

                <button 
                  onClick={startGame}
                  disabled={loading || players.length < 2}
                  className="btn btn-primary btn-large btn-full"
                >
                  {loading ? 'Wird gestartet...' : '🎮 Spiel starten'}
                </button>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="settings">
                <div className="card">
                  <h3>Einstellungen</h3>
                  <p className="empty-state">Weitere Einstellungen folgen...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Spieler-Wartescreen
  return (
    <div className="lobby-container">
      <div className="logout-header">
        <button onClick={handleLogout} className="btn btn-logout">
          Ausloggen
        </button>
      </div>
      <div className="player-waiting">
        <div className="card">
          <h2>⏳ Warte auf Host</h2>
          <p className="game-id-info">Game-ID: <strong>{gameId.slice(0, 8).toUpperCase()}</strong></p>
          
          <div className="players-list">
            <h3>👥 Spieler im Spiel ({players.length})</h3>
            {players.map((player) => (
              <div key={player.player_id} className="player-item">
                <span className="player-name">{player.name}</span>
              </div>
            ))}
          </div>

          <p className="waiting-text">Der Host wird das Spiel starten...</p>
        </div>
      </div>
    </div>
  )
}

export default GameLobby
