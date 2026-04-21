import { useState, useEffect } from 'react'
import './styles/global.css'
import Login from './pages/Login'
import GameLobby from './pages/GameLobby'
import PokerTable from './pages/PokerTable'
import MainHostDashboard from './pages/MainHostDashboard'
import NotificationCenter from './components/NotificationCenter'
import ConfirmModal from './components/ConfirmModal'
import useGameStore from './store/gameStore'

function App() {
  const [currentPage, setCurrentPage] = useState('login')
  const { gameState, setToken, setIsHost } = useGameStore()

  useEffect(() => {
    // Check if user is already logged in (token in localStorage)
    const token = localStorage.getItem('token')
    if (token) {
      const isHost = localStorage.getItem('is_host') === 'true'
      const playerName = localStorage.getItem('player_name')
      const gameId = localStorage.getItem('gameId')
      
      setToken(token)
      setIsHost(isHost)
      
      // Bestimme die richtige Seite basierend auf dem aktuellen Zustand
      if (playerName === 'MARC') {
        // Main Host geht zum Dashboard
        setCurrentPage('dashboard')
      } else if (gameId) {
        // Wenn ein Spiel aktiv ist, zum Spiel zurück
        setCurrentPage('game')
      } else {
        // Sonst zur Lobby
        setCurrentPage('lobby')
      }
    }
  }, [])

  const handleLogin = (token, isHost, playerName, isMainHost) => {
    localStorage.setItem('token', token)
    localStorage.setItem('is_host', isHost)
    localStorage.setItem('player_name', playerName)
    setToken(token)
    setIsHost(isHost)
    // MARC (Main Host) geht zum Dashboard
    if (playerName === 'MARC' || isMainHost) {
      setCurrentPage('dashboard')
    } else {
      // Andere Benutzer gehen zur Lobby
      setCurrentPage('lobby')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('is_host')
    setCurrentPage('login')
  }

  return (
    <div className="app">
      <NotificationCenter />
      <ConfirmModal />
      {currentPage === 'login' && (
        <Login onLogin={handleLogin} />
      )}
      {currentPage === 'dashboard' && (
        <MainHostDashboard onLogout={handleLogout} />
      )}
      {currentPage === 'lobby' && (
        <GameLobby onStartGame={() => setCurrentPage('game')} />
      )}
      {currentPage === 'game' && (
        <PokerTable />
      )}
    </div>
  )
}

export default App
