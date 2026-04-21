import { useEffect, useState } from 'react'
import useGameStore from '../store/gameStore'
import '../styles/notifications.css'

function NotificationCenter() {
  const { notifications, removeNotification } = useGameStore()
  const [visibleNotifications, setVisibleNotifications] = useState([])

  useEffect(() => {
    if (notifications.length > visibleNotifications.length) {
      const newNotification = notifications[notifications.length - 1]
      setVisibleNotifications([...visibleNotifications, newNotification])

      const timer = setTimeout(() => {
        removeNotification(newNotification.id)
        setVisibleNotifications((prev) =>
          prev.filter((n) => n.id !== newNotification.id)
        )
      }, newNotification.duration || 4000)

      return () => clearTimeout(timer)
    }
  }, [notifications, visibleNotifications, removeNotification])

  return (
    <div className="notification-center">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          <div className="notification-content">
            {notification.icon && <span className="notification-icon">{notification.icon}</span>}
            <span className="notification-message">{notification.message}</span>
          </div>
          <button
            className="notification-close"
            onClick={() => {
              removeNotification(notification.id)
              setVisibleNotifications((prev) =>
                prev.filter((n) => n.id !== notification.id)
              )
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

export default NotificationCenter
