import { useState, useEffect } from 'react'
import './styles/global.css'
import Login from './pages/Login'
import GameLobby from './pages/GameLobby'
import PokerTable from './pages/PokerTable'
import useGameStore from './store/gameStore'

function App() {
  const [currentPage, setCurrentPage] = useState('login')
  const { gameState, setToken, setIsHost } = useGameStore()

  useEffect(() => {
    // Check if user is already logged in (token in localStorage)
    const token = localStorage.getItem('token')
    if (token) {
      const isHost = localStorage.getItem('is_host') === 'true'
      setToken(token)
      setIsHost(isHost)
      setCurrentPage(isHost ? 'lobby' : 'game')
    }
  }, [])

  const handleLogin = (token, isHost) => {
    localStorage.setItem('token', token)
    localStorage.setItem('is_host', isHost)
    setToken(token)
    setIsHost(isHost)
    setCurrentPage(isHost ? 'lobby' : 'game')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('is_host')
    setCurrentPage('login')
  }

  return (
    <div className="app">
      {currentPage === 'login' && (
        <Login onLogin={handleLogin} />
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
