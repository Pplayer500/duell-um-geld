import { useState, useEffect } from 'react'
import { API } from '../utils/api'
import useWebSocket from '../hooks/useWebSocket'
import '../styles/poker.css'

function PokerTable() {
  const [gameId] = useState(localStorage.getItem('gameId'))
  const [playerId] = useState(localStorage.getItem('player_id'))
  const [gameStatus, setGameStatus] = useState(null)
  const [error, setError] = useState('')
  
  const { send: sendWS, lastMessage } = useWebSocket(gameId, playerId)

  useEffect(() => {
    loadGameStatus()
    const interval = setInterval(loadGameStatus, 1000)
    return () => clearInterval(interval)
  }, [gameId])

  const loadGameStatus = async () => {
    try {
      const response = await API.get(`/game/status/${gameId}`)
      setGameStatus(response.data)
    } catch (err) {
      setError('Error loading game status')
    }
  }

  const placeBet = (amount) => {
    sendWS({
      type: 'bet',
      data: { amount }
    })
  }

  const fold = () => {
    sendWS({
      type: 'fold',
      data: {}
    })
  }

  const submitAnswer = (questionIndex, answer) => {
    sendWS({
      type: 'answer',
      data: { question_index: questionIndex, answer }
    })
  }

  if (!gameStatus) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="poker-table">
      <h1>♠️ Pokertisch</h1>
      
      {error && <div className="error">{error}</div>}
      
      <div className="table-info">
        <div className="pot">
          <h3>🏦 Pot: {gameStatus.betting_round?.pot || 0}</h3>
        </div>
        
        <div className="blinds">
          <p>Small Blind: {gameStatus.betting_round?.small_blind}</p>
          <p>Big Blind: {gameStatus.betting_round?.big_blind}</p>
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={() => placeBet(10)}>Bet 10</button>
        <button onClick={() => placeBet(50)}>Bet 50</button>
        <button onClick={() => placeBet(100)}>Bet 100</button>
        <button onClick={fold} className="fold">Fold</button>
      </div>
    </div>
  )
}

export default PokerTable
