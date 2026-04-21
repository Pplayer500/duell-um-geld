import { useEffect, useState } from 'react'
import useGameStore from '../store/gameStore'
import '../styles/notifications.css'

function NotificationCenter() {
  const { notifications, removeNotification } = useGameStore()
  const [visibleNotifications, setVisibleNotifications] = useState([])
  const [removingNotifications, setRemovingNotifications] = useState(new Set())

  const handleRemoveNotification = (id) => {
    setRemovingNotifications((prev) => new Set(prev).add(id))
    setTimeout(() => {
      removeNotification(id)
      setVisibleNotifications((prev) => prev.filter((n) => n.id !== id))
      setRemovingNotifications((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 300)
  }

  useEffect(() => {
    if (notifications.length > visibleNotifications.length) {
      const newNotification = notifications[notifications.length - 1]
      setVisibleNotifications([...visibleNotifications, newNotification])

      const timer = setTimeout(() => {
        handleRemoveNotification(newNotification.id)
      }, newNotification.duration || 5000)

      return () => clearTimeout(timer)
    }
  }, [notifications, visibleNotifications, removeNotification])

  return (
    <div className="notification-center">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type} ${
            removingNotifications.has(notification.id) ? 'notification-removing' : ''
          }`}
        >
          <div className="notification-content">
            {notification.icon && <span className="notification-icon">{notification.icon}</span>}
            <span className="notification-message">{notification.message}</span>
          </div>
          <button
            className="notification-close"
            onClick={() => handleRemoveNotification(notification.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

export default NotificationCenter
