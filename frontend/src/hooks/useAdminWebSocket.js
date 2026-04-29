import { useEffect, useCallback } from 'react';

/**
 * Hook for Admin Dashboard WebSocket connection
 * Listens for real-time player status updates
 * 
 * @param {Function} onPlayerStatusUpdate - Callback when player status changes
 * @param {boolean} shouldConnect - Whether to establish connection
 */
export const useAdminWebSocket = (onPlayerStatusUpdate, shouldConnect = true) => {
  useEffect(() => {
    if (!shouldConnect) return;

    // Determine WebSocket URL - use same backend as API
    let backendHost = window.location.hostname === 'localhost' 
      ? 'localhost:8000' 
      : 'duell-um-geld-production.up.railway.app';
    
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${backendHost}/ws/admin/dashboard`;

    let ws = null;
    let reconnectTimeout = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('✅ Admin WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'player_status_update') {
              // Call the callback with updated player status
              onPlayerStatusUpdate({
                player_id: message.player_id,
                player_name: message.player_name,
                is_online: message.is_online,
                status_emoji: message.status_emoji
              });
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ Admin WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('🔌 Admin WebSocket disconnected');
          
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
  }, [shouldConnect, onPlayerStatusUpdate]);
};
