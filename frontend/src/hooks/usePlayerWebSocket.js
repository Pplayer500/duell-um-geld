import { useEffect, useCallback } from 'react';

/**
 * Hook for Player WebSocket connection
 * Listens for real-time updates from the host (e.g., award progress changes)
 * 
 * @param {Function} onAwardsUpdate - Callback when awards are updated
 * @param {string} playerId - The player's ID
 * @param {boolean} shouldConnect - Whether to establish connection
 */
export const usePlayerWebSocket = (onAwardsUpdate, playerId, shouldConnect = true) => {
  useEffect(() => {
    if (!shouldConnect || !playerId) return;

    // Determine WebSocket URL - use same backend as API
    let backendHost = window.location.hostname === 'localhost' 
      ? 'localhost:8000' 
      : 'duell-um-geld-production.up.railway.app';
    
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${backendHost}/ws/player/${playerId}`;

    let ws = null;
    let reconnectTimeout = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('✅ Player WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'awards_update') {
              // Call the callback to reload awards
              onAwardsUpdate({
                category_id: message.category_id,
                progress_points: message.progress_points,
              });
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ Player WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('🔌 Player WebSocket disconnected');
          
          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 3000);
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [shouldConnect, playerId, onAwardsUpdate]);
};
