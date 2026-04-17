import { useEffect, useRef, useState, useCallback } from 'react'

function useWebSocket(gameId, playerId) {
  const ws = useRef(null)
  const [lastMessage, setLastMessage] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Construct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/${gameId}/${playerId}`

    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    }

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        setLastMessage(message)
      } catch (err) {
        console.error('Error parsing message:', err)
      }
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.current.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    }

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [gameId, playerId])

  const send = useCallback((message) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected')
    }
  }, [isConnected])

  return { send, lastMessage, isConnected }
}

export default useWebSocket
