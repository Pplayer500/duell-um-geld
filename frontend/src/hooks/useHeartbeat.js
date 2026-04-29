import { useEffect } from 'react'
import { API } from '../utils/api'

/**
 * Keep-alive hook that sends heartbeat and can surface forced account restrictions.
 */
export function useHeartbeat(onAccountRestriction) {
  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) return

    // Send heartbeat immediately on mount
    const sendHeartbeat = async () => {
      try {
        await API.post(`/api/auth/heartbeat?token=${token}`)
      } catch (err) {
        console.error('Heartbeat failed:', err)

        if (err?.response?.status === 401 && typeof onAccountRestriction === 'function') {
          onAccountRestriction({
            reason: 'forced_logout',
            message: 'Du wurdest wegen Inaktivität ausgeloggt.'
          })
          return
        }

        const detail = err?.response?.data?.detail
        if (detail && typeof onAccountRestriction === 'function') {
          if (typeof detail === 'object') {
            const reason = detail.reason || 'restricted'
            const message = detail.message || 'Dein Account ist nicht mehr verfuegbar.'
            onAccountRestriction({ reason, message })
            return
          }

          if (typeof detail === 'string' && detail.includes('gesperrt')) {
            onAccountRestriction({ reason: 'blocked', message: detail })
          }
        }
      }
    }

    sendHeartbeat()

    // Send heartbeat every 2 seconds so forced logout is reflected quickly.
    const interval = setInterval(sendHeartbeat, 2 * 1000)

    return () => clearInterval(interval)
  }, [onAccountRestriction])
}
