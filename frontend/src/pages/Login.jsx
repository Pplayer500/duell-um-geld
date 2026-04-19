import { useState } from 'react'
import { API } from '../utils/api'
import '../styles/login.css'

function Login({ onLogin }) {
  const [playerName, setPlayerName] = useState('')
  const [hostPassword, setHostPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await API.post('/api/auth/login', {
        name: playerName,
        password: hostPassword || undefined
      })

      const { token, player_id, is_host } = response.data

      // Save to localStorage
      localStorage.setItem('token', token)
      localStorage.setItem('player_id', player_id)
      localStorage.setItem('is_host', is_host)
      localStorage.setItem('player_name', playerName)
      
      onLogin(token, is_host)
    } catch (err) {
      setError(err.response?.data?.detail || 'Login fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🎲 Duell um die Geld 🎲</h1>
        <p className="subtitle">Wer nicht blufft, verliert! 😎</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              placeholder="Dein Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Host-Passwort (optional)"
              value={hostPassword}
              onChange={(e) => setHostPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading || !playerName}>
            {loading ? 'Loading...' : 'Spielen 🎮'}
          </button>
        </form>

        <footer>
          <p>💡 Gib dein Namen ein oder nutze das Host-Passwort für den Admin-Modus</p>
        </footer>
      </div>
    </div>
  )
}

export default Login
