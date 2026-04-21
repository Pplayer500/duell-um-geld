import { useState, useEffect } from 'react'
import { API } from '../utils/api'
import useGameStore from '../store/gameStore'
import '../styles/dashboard.css'

function MainHostDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('games')
  const [players, setPlayers] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerRole, setNewPlayerRole] = useState('player')
  const [playerPassword, setPlayerPassword] = useState('')
  const [editingUsername, setEditingUsername] = useState(null)
  const [newUsername, setNewUsername] = useState('')
  const [showHostPasswordModal, setShowHostPasswordModal] = useState(false)
  const [hostPassword, setHostPassword] = useState('')
  const { addNotification } = useGameStore()

  const adminPassword = localStorage.getItem('admin_password') || 'Passwort'

  useEffect(() => {
    if (activeTab === 'players') {
      loadPlayers()
    } else if (activeTab === 'games') {
      loadGames()
    }
  }, [activeTab])

  const loadPlayers = async () => {
    setLoading(true)
    try {
      const response = await API.get('/api/accounts/admin/players', {
        headers: { 'X-Admin-Password': adminPassword }
      })
      setPlayers(response.data.players || [])
    } catch (err) {
      console.error('Error loading players:', err)
      addNotification('❌ Fehler beim Laden der Spieler', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadGames = async () => {
    setLoading(true)
    try {
      const response = await API.get('/api/game/list')
      setGames(response.data.games || [])
    } catch (err) {
      console.error('Error loading games:', err)
      // Games endpoint might not exist yet, so don't show error
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim()) {
      addNotification('⚠️ Bitte Namen eingeben', 'warning')
      return
    }

    // If role is 'host', show password modal instead of creating directly
    if (newPlayerRole === 'host') {
      setShowHostPasswordModal(true)
      return
    }

    // For regular players, create directly
    createPlayerInBackend(newPlayerName, newPlayerRole)
  }

  const handleConfirmHostPassword = () => {
    if (!hostPassword.trim()) {
      addNotification('⚠️ Bitte Host-Passwort eingeben', 'warning')
      return
    }
    
    createPlayerInBackend(newPlayerName, newPlayerRole, hostPassword)
    setShowHostPasswordModal(false)
    setHostPassword('')
  }

  const createPlayerInBackend = async (name, role, password = null) => {
    setLoading(true)
    try {
      const payload = { name: name.trim(), role: role }
      if (password) {
        payload.password = password
      }

      await API.post(
        '/api/accounts/admin/create-player',
        payload,
        { headers: { 'X-Admin-Password': adminPassword } }
      )
      setNewPlayerName('')
      setNewPlayerRole('player')
      loadPlayers()
      addNotification('✅ Spieler erstellt!', 'success', '🎉')
    } catch (err) {
      console.error('Error creating player:', err)
      addNotification('❌ Fehler: ' + (err.response?.data?.detail || err.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPlayerPassword = async () => {
    if (!playerPassword.trim()) {
      addNotification('⚠️ Bitte Passwort eingeben', 'warning')
      return
    }

    setLoading(true)
    try {
      await API.post(
        '/api/accounts/admin/set-player-password',
        { password: playerPassword },
        { headers: { 'X-Admin-Password': adminPassword } }
      )
      setPlayerPassword('')
      addNotification('✅ Spieler-Passwort gesetzt!', 'success', '🔐')
    } catch (err) {
      console.error('Error setting password:', err)
      addNotification('❌ Fehler: ' + (err.response?.data?.detail || err.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUsername = async (playerId, playerName) => {
    if (!newUsername.trim()) {
      addNotification('⚠️ Bitte Benutzernamen eingeben', 'warning')
      return
    }

    setLoading(true)
    try {
      await API.put(
        `/api/accounts/admin/players/${playerId}/username`,
        { username: newUsername },
        { headers: { 'X-Admin-Password': adminPassword } }
      )
      setEditingUsername(null)
      setNewUsername('')
      loadPlayers()
      addNotification('✅ Benutzername aktualisiert!', 'success', '📄')
    } catch (err) {
      console.error('Error updating username:', err)
      addNotification('❌ Fehler: ' + (err.response?.data?.detail || err.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>🎲 Main Host Dashboard</h1>
        <button onClick={onLogout} className="btn-logout-main">
          Ausloggen
        </button>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          Spiele
        </button>
        <button
          className={`tab-button ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          Spieler
        </button>
      </div>

      <div className="tab-content">
        {/* TAB: SPIELE */}
        {activeTab === 'games' && (
          <div className="tab-pane">
            <h2>Aktive Spiele</h2>
            {loading ? (
              <p>Laden...</p>
            ) : games.length > 0 ? (
              <div className="games-list">
                {games.map((game) => (
                  <div key={game.game_id} className="game-card">
                    <p><strong>Game ID:</strong> {game.game_id}</p>
                    <p><strong>Status:</strong> {game.state}</p>
                    <p><strong>Spieler:</strong> {Object.keys(game.players || {}).length}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>Keine aktiven Spiele</p>
            )}
          </div>
        )}

        {/* TAB: SPIELER */}
        {activeTab === 'players' && (
          <div className="tab-pane">
            {/* PASSWORD SECTION */}
            <div className="password-section">
              <h3>Spieler-Passwort</h3>
              <div className="password-input-group">
                <input
                  type="password"
                  placeholder="Passwort für alle Spieler"
                  value={playerPassword}
                  onChange={(e) => setPlayerPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  onClick={handleSetPlayerPassword}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  Speichern
                </button>
              </div>
            </div>

            {/* CREATE NEW PLAYER */}
            <div className="create-player-section">
              <h3>Neuen Spieler erstellen</h3>
              <div className="create-player-form">
                <input
                  type="text"
                  placeholder="Spieler Name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  disabled={loading}
                />
                <select
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value)}
                  disabled={loading}
                >
                  <option value="player">Spieler</option>
                  <option value="host">Host</option>
                </select>
                <button
                  onClick={handleCreatePlayer}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  Erstellen
                </button>
              </div>
            </div>

            {/* PLAYERS LIST */}
            <div className="players-list-section">
              <h3>Alle Spieler</h3>
              {loading ? (
                <p>Laden...</p>
              ) : players.length > 0 ? (
                <div className="players-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Name</th>
                        <th>Benutzername</th>
                        <th>Rolle</th>
                        <th>Awards</th>
                        <th>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player) => (
                        <tr key={player.player_id} className={player.is_online ? 'online' : 'offline'}>
                          <td className="status">
                            {player.is_online ? '🟢' : '🔴'}
                          </td>
                          <td>{player.name}</td>
                          <td>
                            {editingUsername === player.player_id ? (
                              <div className="edit-username">
                                <input
                                  type="text"
                                  value={newUsername}
                                  onChange={(e) => setNewUsername(e.target.value)}
                                  placeholder="Neuer Benutzername"
                                />
                                <button
                                  onClick={() => handleUpdateUsername(player.player_id, player.name)}
                                  className="btn-small btn-success"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setEditingUsername(null)}
                                  className="btn-small btn-cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="username-display">
                                {player.username || '(nicht gesetzt)'}
                                <button
                                  onClick={() => {
                                    setEditingUsername(player.player_id)
                                    setNewUsername(player.username || '')
                                  }}
                                  className="btn-edit"
                                >
                                  ✎
                                </button>
                              </div>
                            )}
                          </td>
                          <td>{player.role}</td>
                          <td>{player.awards}</td>
                          <td>
                            <button className="btn-small btn-primary">
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Keine Spieler vorhanden</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* HOST PASSWORD MODAL */}
      {showHostPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Host-Passwort setzen</h2>
            <p>Gib ein Passwort für den Host "{newPlayerName}" ein:</p>
            <div className="modal-content">
              <input
                type="password"
                placeholder="Host-Passwort"
                value={hostPassword}
                onChange={(e) => setHostPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleConfirmHostPassword()}
              />
            </div>
            <div className="modal-buttons">
              <button
                onClick={handleConfirmHostPassword}
                className="btn btn-primary"
                disabled={!hostPassword.trim()}
              >
                Speichern
              </button>
              <button
                onClick={() => {
                  setShowHostPasswordModal(false)
                  setHostPassword('')
                }}
                className="btn btn-cancel"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MainHostDashboard
