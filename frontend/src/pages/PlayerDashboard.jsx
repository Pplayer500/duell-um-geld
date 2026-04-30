import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { API } from '../utils/api'
import useGameStore from '../store/gameStore'
import { useHeartbeat } from '../hooks/useHeartbeat'
import { usePlayerWebSocket } from '../hooks/usePlayerWebSocket'
import '../styles/player-dashboard.css'

const AWARD_TIER_ORDER = ['bronze', 'silver', 'gold', 'diamond']

const AWARD_TIER_LABELS = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  diamond: 'Diamant'
}

function PlayerDashboard({ onJoinGame, onLogout }) {
  const [activeTab, setActiveTab] = useState('balance')
  const [playerId] = useState(localStorage.getItem('player_id'))
  const [username, setUsername] = useState(localStorage.getItem('player_username') || '')
  const [newUsername, setNewUsername] = useState(localStorage.getItem('player_username') || '')
  const [isUsernameDraftDirty, setIsUsernameDraftDirty] = useState(false)
  const isUsernameDraftDirtyRef = useRef(false)
  const [accountName, setAccountName] = useState(localStorage.getItem('player_name') || '')
  const [currentPlayerPassword, setCurrentPlayerPassword] = useState('')
  const [usernameLocked, setUsernameLocked] = useState(false)
  const [categoryAwards, setCategoryAwards] = useState([])
  const [ownedAwards, setOwnedAwards] = useState([])
  const [equippedAwards, setEquippedAwards] = useState([])
  const [awardsLoading, setAwardsLoading] = useState(false)
  const [expandedAwardCategories, setExpandedAwardCategories] = useState({})
  const [selectedEquipSlot, setSelectedEquipSlot] = useState(1)
  const [gameId, setGameId] = useState(localStorage.getItem('gameId') || '')
  const [gamePlayers, setGamePlayers] = useState([])
  const [playersLoading, setPlayersLoading] = useState(false)
  const [questionHistory, setQuestionHistory] = useState([])
  const [questionHistoryLoading, setQuestionHistoryLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savingUsername, setSavingUsername] = useState(false)
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false)
  const [firstLoginUsername, setFirstLoginUsername] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [elapsedTime, setElapsedTime] = useState('00:00:00')
  const [accountRestriction, setAccountRestriction] = useState(() => {
    const reason = localStorage.getItem('account_restriction_reason')
    const message = localStorage.getItem('account_restriction_message')
    if (!reason) return null
    return { reason, message: message || '' }
  })
  const timerInterval = useRef(null)
  const tabContentRef = useRef(null)
  const bgVideoARef = useRef(null)
  const bgVideoBRef = useRef(null)
  const [activeBgVideo, setActiveBgVideo] = useState(0)
  const activeBgVideoRef = useRef(0)
  const bgSwitchLockRef = useRef(false)

  const sessionStartKey = playerId ? `session_start_time_${playerId}` : 'session_start_time'
  const sessionElapsedKey = playerId ? `session_elapsed_seconds_${playerId}` : 'session_elapsed_seconds'

  const { addNotification } = useGameStore()

  const formatElapsed = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0)
    const hours = Math.floor(safeSeconds / 3600)
    const minutes = Math.floor((safeSeconds % 3600) / 60)
    const secs = safeSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const onlineSinceLabel = sessionStartTime
    ? sessionStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--'

  const pauseSessionTimer = () => {
    const startIso = localStorage.getItem(sessionStartKey)
    if (!startIso) return

    const startTs = new Date(startIso).getTime()
    if (Number.isNaN(startTs)) {
      localStorage.removeItem(sessionStartKey)
      return
    }

    const nowTs = Date.now()
    const deltaSeconds = Math.max(0, Math.floor((nowTs - startTs) / 1000))
    const existing = Number(localStorage.getItem(sessionElapsedKey) || '0')
    localStorage.setItem(sessionElapsedKey, String(existing + deltaSeconds))
    localStorage.removeItem(sessionStartKey)
  }

  const startSessionTimer = () => {
    if (!localStorage.getItem(sessionStartKey)) {
      localStorage.setItem(sessionStartKey, new Date().toISOString())
    }
  }

  const clearSessionAndGoLogin = () => {
    pauseSessionTimer()
    localStorage.removeItem('gameId')
    sessionStorage.removeItem('token')
    localStorage.removeItem('is_host')
    localStorage.removeItem('player_name')
    // keep player_username in localStorage so the name is remembered for next login
    localStorage.removeItem('player_id')
    localStorage.removeItem('account_restriction_reason')
    localStorage.removeItem('account_restriction_message')
    window.location.reload()
  }
  
  // Auto-logout when leaving page/closing tab
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      const token = sessionStorage.getItem('token')
      if (token) {
        // Send logout signal (don't wait for response)
        navigator.sendBeacon('/api/auth/logout?token=' + token)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])
  
  // Keep session alive with heartbeat and detect forced block/delete kicks.
  useHeartbeat((restriction) => {
    if (!restriction) return
    pauseSessionTimer()
    localStorage.setItem('account_restriction_reason', restriction.reason || 'restricted')
    localStorage.setItem('account_restriction_message', restriction.message || '')
    localStorage.removeItem('gameId')

    if (restriction.reason === 'forced_logout') {
      clearSessionAndGoLogin()
      return
    }

    setAccountRestriction(restriction)
  })

  // iPad/Safari can restore nested scroll containers separately.
  // Force the player dashboard content area to always start at the top.
  useEffect(() => {
    const scrollToTop = () => {
      if (tabContentRef.current) {
        tabContentRef.current.scrollTop = 0
      }
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    // Run immediately and once after layout settles.
    scrollToTop()
    const rafId = requestAnimationFrame(scrollToTop)

    return () => cancelAnimationFrame(rafId)
  }, [activeTab])

  // Check if first login (no username set yet)
  useEffect(() => {
    const hasUsername = localStorage.getItem('player_username')
    if (!hasUsername) {
      setShowFirstLoginModal(true)
    } else {
      setUsername(hasUsername)
      setNewUsername(hasUsername)
      setIsUsernameDraftDirty(false)
      isUsernameDraftDirtyRef.current = false
    }
  }, [])

  useEffect(() => {
    activeBgVideoRef.current = activeBgVideo
  }, [activeBgVideo])

  // Seamless background loop: keep both videos running and switch visibility near loop end.
  useEffect(() => {
    const videoA = bgVideoARef.current
    const videoB = bgVideoBRef.current
    if (!videoA || !videoB) return

    let checkIntervalId = null

    const startVideo = async (video) => {
      try {
        await video.play()
      } catch (err) {
        // Ignore autoplay race issues and retry shortly.
        setTimeout(() => {
          video.play().catch(() => {})
        }, 300)
      }
    }

    const offsetSecondaryVideo = () => {
      const duration = Number(videoB.duration)
      if (Number.isFinite(duration) && duration > 1) {
        videoB.currentTime = duration / 2
      }
    }

    const startLoop = async () => {
      videoA.currentTime = 0
      videoB.currentTime = 0

      offsetSecondaryVideo()
      await Promise.allSettled([startVideo(videoA), startVideo(videoB)])

      setActiveBgVideo(0)
      activeBgVideoRef.current = 0

      checkIntervalId = setInterval(() => {
        const current = activeBgVideoRef.current === 0 ? videoA : videoB
        const duration = Number(current.duration)
        if (!Number.isFinite(duration) || duration <= 0) return

        const remaining = duration - current.currentTime
        if (remaining < 0.22 && !bgSwitchLockRef.current) {
          bgSwitchLockRef.current = true
          setActiveBgVideo((prev) => {
            const next = prev === 0 ? 1 : 0
            activeBgVideoRef.current = next
            return next
          })

          setTimeout(() => {
            bgSwitchLockRef.current = false
          }, 420)
        }
      }, 120)
    }

    if (videoB.readyState >= 1) {
      startLoop()
    } else {
      const handleLoadedMetadata = () => {
        videoB.removeEventListener('loadedmetadata', handleLoadedMetadata)
        startLoop()
      }
      videoB.addEventListener('loadedmetadata', handleLoadedMetadata)
    }

    return () => {
      if (checkIntervalId) clearInterval(checkIntervalId)
      videoA.pause()
      videoB.pause()
    }
  }, [])

  const loadAccountSettingsData = useCallback(async () => {
    try {
      const response = await API.get('/api/accounts/player/current-password')
      const data = response.data || {}

      setCurrentPlayerPassword(data.password || '')

      if (typeof data.account_name === 'string') {
        setAccountName(data.account_name)
        localStorage.setItem('player_name', data.account_name)
      }

      if (typeof data.username === 'string' && data.username.trim()) {
        const nextUsername = data.username.trim()
        setUsername(nextUsername)
        if (!isUsernameDraftDirtyRef.current) {
          setNewUsername(nextUsername)
        }
        localStorage.setItem('player_username', nextUsername)
      }

      setUsernameLocked(Boolean(data.username_locked))

      if (localStorage.getItem('account_restriction_reason')) {
        localStorage.removeItem('account_restriction_reason')
        localStorage.removeItem('account_restriction_message')
      }
      setAccountRestriction(null)
    } catch (err) {
      console.error('Error loading account settings data:', err)
      setCurrentPlayerPassword('')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPlayerAwards = useCallback(async () => {
    setAwardsLoading(true)
    try {
      const response = await API.get('/api/questions/player/awards')
      const data = response.data || {}
      const ownedByCategoryTier = (Array.isArray(data.owned_awards) ? data.owned_awards : []).reduce((acc, award) => {
        const key = `${award.category_id}-${award.tier}`
        acc[key] = award
        return acc
      }, {})

      const categoryAwardsFromApi = Array.isArray(data.category_awards)
        ? data.category_awards
        : (Array.isArray(data.category_progress) ? data.category_progress : []).map((row) => {
            const categoryId = Number(row.category_id)
            const points = Number(row.progress_points || 0)
            return {
              category_id: categoryId,
              category_name: row.category_name,
              progress_points: points,
              tiers: AWARD_TIER_ORDER.map((tier, index) => {
                const requiredProgress = (index + 1) * 3
                const award = ownedByCategoryTier[`${categoryId}-${tier}`]
                return {
                  id: award?.id || null,
                  category_id: categoryId,
                  category_name: row.category_name,
                  tier,
                  image_url: award?.image_url || null,
                  required_progress: requiredProgress,
                  unlocked: points >= requiredProgress,
                  equipped: false
                }
              })
            }
          })

      setCategoryAwards(categoryAwardsFromApi)
      setOwnedAwards(Array.isArray(data.owned_awards) ? data.owned_awards : [])
      setEquippedAwards(Array.isArray(data.equipped) ? data.equipped : [])
    } catch (err) {
      console.error('Error loading player awards:', err)
    } finally {
      setAwardsLoading(false)
    }
  }, [])

  const loadCurrentGamePlayers = useCallback(async () => {
    const currentGameId = localStorage.getItem('gameId')
    if (!currentGameId) {
      setGamePlayers([])
      return
    }

    setPlayersLoading(true)
    try {
      const response = await API.get(`/api/game/state/${currentGameId}`)
      const playersFromState = Object.values(response.data?.players || {})
      setGamePlayers(Array.isArray(playersFromState) ? playersFromState : [])
    } catch (err) {
      console.error('Error loading game players:', err)
      setGamePlayers([])
    } finally {
      setPlayersLoading(false)
    }
  }, [])

  const loadPlayerQuestionHistory = useCallback(async () => {
    setQuestionHistoryLoading(true)
    try {
      const response = await API.get('/api/questions/player/history')
      setQuestionHistory(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Error loading player question history:', err)
      setQuestionHistory([])
    } finally {
      setQuestionHistoryLoading(false)
    }
  }, [])

  const handleEquipAward = async (awardAssetId, slotIndex) => {
    try {
      await API.post('/api/questions/player/equip', {
        award_asset_id: awardAssetId,
        slot_index: slotIndex
      })
      addNotification(`✅ Award in Slot ${slotIndex} ausgerüstet`, 'success')
      await loadPlayerAwards()
    } catch (err) {
      addNotification(`❌ ${err?.response?.data?.detail || 'Award konnte nicht ausgerüstet werden'}`, 'error')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleUnequipAward = async (slotIndex) => {
    try {
      await API.post('/api/questions/player/unequip', {
        slot_index: slotIndex
      })
      addNotification(`✅ Slot ${slotIndex} geleert`, 'success')
      await loadPlayerAwards()
    } catch (err) {
      addNotification(`❌ ${err?.response?.data?.detail || 'Award konnte nicht entfernt werden'}`, 'error')
    }
  }

  // Load account info for account settings section
  useEffect(() => {
    loadAccountSettingsData()
    loadPlayerAwards()

    const intervalId = setInterval(() => {
      loadAccountSettingsData()
    }, 5000)

    return () => clearInterval(intervalId)
  }, [loadAccountSettingsData, loadPlayerAwards])

  useEffect(() => {
    if (activeTab !== 'awards') return
    loadPlayerAwards()
  }, [activeTab, loadPlayerAwards])

  useEffect(() => {
    if (activeTab !== 'players') return
    loadCurrentGamePlayers()
  }, [activeTab, loadCurrentGamePlayers])

  useEffect(() => {
    if (activeTab !== 'questions') return
    loadPlayerQuestionHistory()
  }, [activeTab, loadPlayerQuestionHistory])

  // WebSocket listener for real-time award updates from host
  const handleAwardsUpdate = useCallback(() => {
    loadPlayerAwards()
  }, [loadPlayerAwards])

  usePlayerWebSocket(handleAwardsUpdate, playerId, true)

  // Initialize timer on login (start) and restore paused elapsed time for this account
  useEffect(() => {
    startSessionTimer()

    const savedStartTime = localStorage.getItem(sessionStartKey)
    const baseElapsed = Number(localStorage.getItem(sessionElapsedKey) || '0')

    setElapsedTime(formatElapsed(baseElapsed))

    if (savedStartTime) {
      setSessionStartTime(new Date(savedStartTime))
    } else {
      const now = new Date()
      localStorage.setItem(sessionStartKey, now.toISOString())
      setSessionStartTime(now)
    }
  }, [sessionStartKey, sessionElapsedKey])

  // Update elapsed time timer
  useEffect(() => {
    if (!sessionStartTime) return

    const updateTimer = () => {
      const now = new Date()
      const elapsedSinceStart = Math.floor((now - sessionStartTime) / 1000)
      const baseElapsed = Number(localStorage.getItem(sessionElapsedKey) || '0')
      setElapsedTime(formatElapsed(baseElapsed + elapsedSinceStart))
    }

    updateTimer() // Initial call
    timerInterval.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
      }
    }
  }, [sessionStartTime, sessionElapsedKey])

  const handleFirstLoginSubmit = async (e) => {
    e.preventDefault()
    if (usernameLocked) {
      addNotification('⚠️ Benutzername ist durch den Main Host gesperrt', 'warning')
      return
    }
    if (!firstLoginUsername.trim()) {
      addNotification('⚠️ Bitte Benutzernamen eingeben', 'warning')
      return
    }

    try {
      setLoading(true)
      
      // Save username to localStorage and backend
      localStorage.setItem('player_username', firstLoginUsername.trim())
      setUsername(firstLoginUsername.trim())
      setNewUsername(firstLoginUsername.trim())
      setIsUsernameDraftDirty(false)
      isUsernameDraftDirtyRef.current = false
      
      // Update username in backend
      await API.put(
        `/api/accounts/players/${playerId}/username`,
        { username: firstLoginUsername.trim() }
      )
      
      setShowFirstLoginModal(false)
      addNotification(`✅ Willkommen, ${firstLoginUsername.trim()}!`, 'success', '🎉')
    } catch (err) {
      console.error('Error saving username:', err)
      addNotification('❌ Fehler beim Speichern', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGame = async (e) => {
    e.preventDefault()
    if (!gameId.trim()) {
      addNotification('⚠️ Bitte Game-ID eingeben', 'warning')
      return
    }

    setLoading(true)
    try {
      await API.post('/api/game/join', {
        game_id: gameId.trim(),
        player_id: playerId,
        name: username
      })
      
      localStorage.setItem('gameId', gameId.trim())
      addNotification(`✅ Spiel beigetreten!`, 'success')
      onJoinGame(gameId.trim())
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Fehler beim Beitreten'
      addNotification(`❌ ${errorMsg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUsername = async () => {
    if (usernameLocked) {
      addNotification('⚠️ Benutzername ist durch den Main Host gesperrt', 'warning')
      return
    }

    if (!newUsername.trim()) {
      addNotification('⚠️ Benutzername darf nicht leer sein', 'warning')
      return
    }

    if (newUsername.trim() === username) {
      setIsUsernameDraftDirty(false)
      isUsernameDraftDirtyRef.current = false
      addNotification('ℹ️ Benutzername ist unverändert', 'info')
      return
    }

    setSavingUsername(true)
    try {
      await API.put(
        `/api/accounts/players/${playerId}/username`,
        { username: newUsername.trim() }
      )
      
      localStorage.setItem('player_username', newUsername.trim())
      setUsername(newUsername.trim())
      setNewUsername(newUsername.trim())
      setIsUsernameDraftDirty(false)
      isUsernameDraftDirtyRef.current = false
      addNotification(`✅ Benutzername aktualisiert!`, 'success', '✨')
    } catch (err) {
      console.error('Error saving username:', err)
      addNotification('❌ Fehler beim Speichern', 'error')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleLogout = async () => {
    pauseSessionTimer()
    try {
      const token = sessionStorage.getItem('token')
      // Call logout API to notify backend
      if (token) {
        await API.post(`/api/auth/logout?token=${encodeURIComponent(token)}`)
      }
    } catch (err) {
      console.error('Logout API call failed:', err)
    } finally {
      // Clear session data including session timer baseline
      localStorage.removeItem('gameId')
      sessionStorage.removeItem('token')
      localStorage.removeItem('is_host')
      localStorage.removeItem('player_name')
      // keep player_username in localStorage so it is prefilled next time
      localStorage.removeItem('player_id')
      // Wait a bit for backend to process, then reload to login page
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  }

  const handleBackToLogin = () => {
    clearSessionAndGoLogin()
  }

  const handleLeaveGame = async () => {
    const currentGameId = localStorage.getItem('gameId')
    if (!currentGameId) {
      addNotification('ℹ️ Du bist aktuell in keinem Spiel', 'info')
      return
    }

    setLoading(true)

    try {
      await API.post('/api/game/leave', {
        game_id: currentGameId,
        player_id: playerId,
      })
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Fehler beim Verlassen des Spiels'
      addNotification(`❌ ${errorMsg}`, 'error')
      setLoading(false)
      return
    }

    localStorage.removeItem('gameId')
    setGameId('')
    setGamePlayers([])
    setActiveTab('balance')
    setLoading(false)
    addNotification('✅ Spiel verlassen', 'success')
  }

  const equippedBySlot = equippedAwards.reduce((acc, entry) => {
    if (entry?.slot_index) {
      acc[entry.slot_index] = entry.award
    }
    return acc
  }, {})

  const equippedSlotsByAwardId = useMemo(() => {
    return equippedAwards.reduce((acc, entry) => {
      const awardId = entry?.award?.id
      if (!awardId) return acc
      if (!acc[awardId]) {
        acc[awardId] = []
      }
      acc[awardId].push(entry.slot_index)
      return acc
    }, {})
  }, [equippedAwards])

  const equippedSlotCards = useMemo(() => {
    return [1, 2, 3].map((slotIndex) => {
      const slotAward = equippedBySlot[slotIndex]
      return {
        slotIndex,
        slotAward,
        hasAward: Boolean(slotAward?.image_url),
      }
    })
  }, [equippedBySlot])

  const sortedCategoryAwards = useMemo(() => {
    return [...categoryAwards].sort((a, b) => {
      const left = String(a?.category_name || '')
      const right = String(b?.category_name || '')
      return left.localeCompare(right, 'de', { sensitivity: 'base' })
    })
  }, [categoryAwards])

  useEffect(() => {
    if (!sortedCategoryAwards.length) return
    setExpandedAwardCategories((prev) => {
      if (Object.keys(prev).length > 0) return prev
      return { [sortedCategoryAwards[0].category_id]: true }
    })
  }, [sortedCategoryAwards])

  const totalProgressPoints = sortedCategoryAwards.reduce((sum, row) => sum + Number(row?.progress_points || 0), 0)

  const toggleCategoryExpanded = (categoryId) => {
    setExpandedAwardCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  if (
    accountRestriction?.reason === 'blocked' ||
    accountRestriction?.reason === 'deleted' ||
    accountRestriction?.reason === 'forced_logout'
  ) {
    const headline = accountRestriction.reason === 'blocked'
      ? 'Der Account wurde gesperrt!'
      : accountRestriction.reason === 'deleted'
        ? 'Dieser Account wurde gelöscht'
        : 'Du wurdest ausgeloggt!'

    return (
      <div className="player-dashboard" style={{ justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div className="settings-card" style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '12px' }}>{headline}</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            {accountRestriction.message || 'Dein Zugriff wurde vom Main Host beendet.'}
          </p>
          <button className="btn btn-primary btn-large" onClick={handleBackToLogin}>
            Zurück zum Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* FIRST LOGIN MODAL */}
      {showFirstLoginModal && (
        <div className="modal-overlay">
          <div className="modal first-login-modal">
            <h2>🎮 Willkommen!</h2>
            <p>Bitte wähle einen Benutzernamen</p>
            <form onSubmit={handleFirstLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input
                type="text"
                placeholder="Benutzername"
                value={firstLoginUsername}
                onChange={(e) => setFirstLoginUsername(e.target.value)}
                disabled={loading || usernameLocked}
                autoFocus
                style={{
                  padding: '12px',
                  fontSize: '16px',
                  border: '2px solid #ddd',
                  borderRadius: '6px'
                }}
              />
              <button
                type="submit"
                disabled={loading || usernameLocked || !firstLoginUsername.trim()}
                className="btn btn-primary btn-large"
                style={{ padding: '12px' }}
              >
                {loading ? 'Wird gespeichert...' : 'Fortfahren'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MAIN DASHBOARD */}
      <div className="player-dashboard">
        <video
          ref={bgVideoARef}
          className={`dashboard-bg-video ${activeBgVideo === 0 ? 'is-active' : ''}`}
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/videos/login_background_169.mp4" type="video/mp4" />
        </video>
        <video
          ref={bgVideoBRef}
          className={`dashboard-bg-video ${activeBgVideo === 1 ? 'is-active' : ''}`}
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/videos/login_background_916.mp4" type="video/mp4" />
        </video>
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-top">
              <h1>👋 Willkommen, {username}!</h1>
              {equippedSlotCards.some(s => s.hasAward) && (
                <div className="header-equipped-strip header-equipped-inline" aria-label="Ausgerüstete Awards">
                  <div className="header-equipped-slots">
                    {equippedSlotCards.map(({ slotIndex, slotAward, hasAward }) => (
                      <div
                        key={`header-slot-${slotIndex}`}
                        className={`header-equipped-slot ${hasAward ? 'has-award' : 'is-empty'}`}
                        title={slotAward ? `Slot ${slotIndex}: ${slotAward.category_name} · ${slotAward.tier}` : `Slot ${slotIndex}: leer`}
                      >
                        {hasAward ? (
                          <img src={slotAward.image_url} alt={`Slot ${slotIndex}: ${slotAward.category_name} ${slotAward.tier}`} />
                        ) : (
                          <span>{slotIndex}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="header-meta-row">
              <div className="header-meta">
                <span className="meta-pill">⏱️ {elapsedTime}</span>
                <span className="meta-pill">🕒 Online seit {onlineSinceLabel}</span>
                <span className="meta-pill">👤 {accountName || 'Spieler'}</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout-player">
            Ausloggen
          </button>
        </div>

        <div className="tabs-container">
          <button
            className={`tab-button ${activeTab === 'balance' ? 'active' : ''}`}
            onClick={() => setActiveTab('balance')}
          >
            💰 Kontostand
          </button>
          <button
            className={`tab-button ${activeTab === 'players' ? 'active' : ''}`}
            onClick={() => setActiveTab('players')}
          >
            👥 Spieler
          </button>
          <button
            className={`tab-button ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            ❓ Fragen
          </button>
          <div className="tabs-spacer" />
          <button
            className={`tab-button ${activeTab === 'awards' ? 'active' : ''}`}
            onClick={() => setActiveTab('awards')}
          >
            🎖️ Awards
          </button>
          <button
            className="tab-button tab-leave-button"
            onClick={handleLeaveGame}
          >
            Spiel verlassen
          </button>
        </div>

        <div className="tab-content" ref={tabContentRef}>
          {/* KONTOSTAND TAB */}
          {activeTab === 'balance' && (
            <div className="dashboard-tab">
              <div className="dashboard-cards">
                {/* Session Time Card */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <h3>⏱️ Spielzeit</h3>
                  </div>
                  <div className="card-content">
                    <div className="timer-display">
                      {elapsedTime}
                    </div>
                    <p className="muted-note">
                      Du bist seit {sessionStartTime?.toLocaleTimeString()} online
                    </p>
                  </div>
                </div>

                {/* Statistics Card */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <h3>📈 Kontostand</h3>
                  </div>
                  <div className="card-content">
                    <div className="stat-row">
                      <span>Aktives Spiel:</span>
                      <strong>{gameId || 'Keins'}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Account:</span>
                      <strong>{accountName || '-'}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Benutzername:</span>
                      <strong>{username || '-'}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Passwort (Main Host):</span>
                      <strong>{currentPlayerPassword || '(nicht gesetzt)'}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Awards:</span>
                      <strong>🏆 {ownedAwards.length}</strong>
                    </div>
                  </div>
                </div>

                {/* Join Game Card */}
                <div className="dashboard-card join-game-card">
                  <div className="card-header">
                    <h3>🎮 Spiel Beitreten</h3>
                  </div>
                  <form onSubmit={handleJoinGame} className="card-content">
                    <input
                      type="text"
                      placeholder="Game-ID eingeben..."
                      value={gameId}
                      onChange={(e) => setGameId(e.target.value)}
                      disabled={loading}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginBottom: '10px'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={loading || !gameId.trim()}
                      className="btn btn-primary btn-block"
                    >
                      {loading ? 'Wird beigetreten...' : '➕ Beitreten'}
                    </button>
                  </form>
                </div>

                {/* Info Card */}
                <div className="dashboard-card info-card">
                  <div className="card-header">
                    <h3>ℹ️ Informationen</h3>
                  </div>
                  <div className="card-content">
                    <ul style={{ paddingLeft: '20px', margin: '0' }}>
                      <li>Gib die Game-ID des Hosts ein</li>
                      <li>Du kannst das Spiel jederzeit über den Verlassen-Button verlassen</li>
                      <li>Deine Spielzeit wird automatisch getrackt</li>
                      <li>Der Timer stoppt wenn du dich abmeldest</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'players' && (
            <div className="settings-tab">
              <div className="settings-card">
                <h3>👥 Spieler im aktuellen Spiel</h3>
                {playersLoading ? (
                  <p className="muted-note">Laden...</p>
                ) : !gameId ? (
                  <p className="muted-note">Du bist aktuell in keinem Spiel.</p>
                ) : gamePlayers.length === 0 ? (
                  <p className="muted-note">Keine Spieler gefunden.</p>
                ) : (
                  <div className="settings-content">
                    {gamePlayers.map((player) => (
                      <div key={player.player_id} className="award-slot-card">
                        <p className="setting-value" style={{ marginBottom: '4px' }}>{player.name || 'Unbekannt'}</p>
                        <p className="muted-note" style={{ margin: 0 }}>Position: {player.position ?? '-'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="settings-tab">
              <div className="settings-card">
                <h3>❓ Gesehene Fragen</h3>
                {questionHistoryLoading ? (
                  <p className="muted-note">Laden...</p>
                ) : questionHistory.length === 0 ? (
                  <p className="muted-note">Noch keine Fragen-Historie vorhanden.</p>
                ) : (
                  <div className="settings-content">
                    {questionHistory.slice(0, 50).map((entry) => (
                      <div key={`${entry.question_id}-${entry.seen_at}`} className="award-slot-card">
                        <p className="setting-value" style={{ marginBottom: '6px' }}>{entry.question_text}</p>
                        <p className="muted-note" style={{ margin: 0 }}>Kategorie: {entry.category || '-'}</p>
                        <p className="muted-note" style={{ margin: 0 }}>Gesehen: {entry.seen_at ? new Date(entry.seen_at).toLocaleString() : '-'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {false && activeTab === 'settings' && (
            <div className="settings-tab">
              <div className="settings-card">
                <h3>👤 Benutzername</h3>
                <div className="settings-content">
                  <div className="setting-item">
                    <label>Aktueller Benutzername</label>
                    <p className="setting-value">
                      {username}
                    </p>
                  </div>

                  <div className="divider"></div>

                  <div className="setting-item">
                    <label htmlFor="new-username">Neuer Benutzername</label>
                    <input
                      id="new-username"
                      type="text"
                      value={newUsername}
                      onChange={(e) => {
                        setNewUsername(e.target.value)
                        setIsUsernameDraftDirty(true)
                        isUsernameDraftDirtyRef.current = true
                      }}
                      disabled={savingUsername || usernameLocked}
                    />
                    <p className="muted-note" style={{ marginTop: '8px' }}>
                      {usernameLocked
                        ? 'Benutzername ist aktuell gesperrt. Nur der Main Host kann ihn freischalten.'
                        : 'Der Name wird beim Host in der Spielerliste angezeigt'}
                    </p>
                  </div>

                  <button
                    onClick={handleSaveUsername}
                    disabled={savingUsername || usernameLocked || newUsername.trim() === username}
                    className="btn btn-primary"
                    style={{ marginTop: '15px' }}
                  >
                    {savingUsername ? '💾 Wird gespeichert...' : '💾 Speichern'}
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <h3>🔐 Account</h3>
                <div className="settings-content">
                  <div className="setting-item">
                    <label>Account Name</label>
                    <p className="setting-value">
                      {accountName || '-'}
                    </p>
                  </div>

                  <div className="divider"></div>

                  <div className="setting-item">
                    <label>Aktuelles Passwort (vom Main Host)</label>
                    <p className="setting-value">
                      {currentPlayerPassword || '(nicht gesetzt)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'awards' && (
            <div className="settings-tab awards-tab">
              <div className="settings-card">
                <h3>🎽 Ausgerüstete Slots</h3>
                <div className="awards-slot-grid">
                  {[1, 2, 3].map((slot) => {
                    const slotAward = equippedBySlot[slot]
                    return (
                      <div className="award-slot-card" key={`slot-${slot}`}>
                        <div>
                          <p className="muted-note">Slot {slot}</p>
                          {slotAward ? (
                            <>
                              <p className="setting-value">{slotAward.category_name} · {slotAward.tier}</p>
                              <a href={slotAward.image_url} target="_blank" rel="noreferrer">Bild öffnen</a>
                            </>
                          ) : (
                            <p className="muted-note">Kein Award ausgerüstet</p>
                          )}
                        </div>
                        {slotAward && (
                          <button className="btn btn-secondary" onClick={() => handleUnequipAward(slot)}>
                            Entfernen
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="settings-card">
                <div className="awards-progress-header">
                  <h3>📈 Fortschritt je Kategorie</h3>
                  <label className="awards-slot-picker" htmlFor="equip-slot-select">
                    Ausrüst-Slot
                    <select
                      id="equip-slot-select"
                      value={selectedEquipSlot}
                      onChange={(e) => setSelectedEquipSlot(Number(e.target.value))}
                    >
                      {[1, 2, 3].map((slot) => (
                        <option key={`slot-option-${slot}`} value={slot}>Slot {slot}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="muted-note" style={{ marginTop: '-4px' }}>Gesamtpunkte: {totalProgressPoints}</p>
                {awardsLoading ? (
                  <p className="muted-note">Laden...</p>
                ) : sortedCategoryAwards.length === 0 ? (
                  <p className="muted-note">Noch kein Fortschritt vorhanden</p>
                ) : (
                  <div className="award-category-accordion-list">
                    {sortedCategoryAwards.map((category) => {
                      const points = Number(category.progress_points || 0)
                      const tiers = AWARD_TIER_ORDER.map((tierName, index) => {
                        const raw = Array.isArray(category.tiers)
                          ? category.tiers.find((item) => item?.tier === tierName)
                          : null
                        const requiredProgress = Number(raw?.required_progress || (index + 1) * 3)
                        return {
                          id: raw?.id || null,
                          tier: tierName,
                          image_url: raw?.image_url || null,
                          required_progress: requiredProgress,
                          unlocked: Boolean(raw?.id) && points >= requiredProgress,
                          equipped: Boolean(raw?.equipped)
                        }
                      })

                      const isExpanded = Boolean(expandedAwardCategories[category.category_id])

                      return (
                        <article key={`category-award-${category.category_id}`} className={`award-category-accordion ${isExpanded ? 'is-open' : ''}`}>
                          <button
                            type="button"
                            className="award-category-toggle"
                            onClick={() => toggleCategoryExpanded(category.category_id)}
                            aria-expanded={isExpanded}
                          >
                            <span className="award-category-title">{category.category_name}</span>
                            <span className="award-category-meta">{points} Punkte</span>
                          </button>

                          {isExpanded && (
                            <div className="award-category-body">
                              <div className="award-tier-chip-grid">
                                {tiers.map((tier) => {
                                  const slotAssignments = tier.id ? (equippedSlotsByAwardId[tier.id] || []) : []
                                  const canEquip = Boolean(tier.id) && tier.unlocked
                                  return (
                                    <button
                                      key={`tier-chip-${category.category_id}-${tier.tier}`}
                                      type="button"
                                      className={`award-tier-chip tier-${tier.tier} ${canEquip ? 'is-unlocked' : 'is-locked'} ${slotAssignments.length > 0 ? 'is-equipped' : ''}`}
                                      disabled={!canEquip}
                                      onClick={() => {
                                        if (canEquip) {
                                          handleEquipAward(tier.id, selectedEquipSlot)
                                        }
                                      }}
                                      title={canEquip ? `In Slot ${selectedEquipSlot} ausrüsten` : 'Noch nicht freigeschaltet'}
                                    >
                                      <div className="award-tier-icon-wrap">
                                        {tier.image_url ? (
                                          <img
                                            src={tier.image_url}
                                            alt={`${category.category_name} ${AWARD_TIER_LABELS[tier.tier]}`}
                                            className="award-tier-icon"
                                          />
                                        ) : (
                                          <span className="award-tier-fallback">{AWARD_TIER_LABELS[tier.tier].charAt(0)}</span>
                                        )}
                                      </div>
                                      <span className="award-tier-name">{category.category_name}-{AWARD_TIER_LABELS[tier.tier]}</span>
                                      {slotAssignments.length > 0 && (
                                        <span className="award-tier-equipped-slots">Slot {slotAssignments.join(', ')}</span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>

                              <div className="award-progress-segments">
                                {(() => {
                                  const nextTierIndex = tiers.findIndex((tier) => points < Number(tier.required_progress || 0))
                                  const isFullyCompleted = nextTierIndex === -1
                                  const rightTier = isFullyCompleted ? tiers[tiers.length - 1] : tiers[nextTierIndex]
                                  const leftTier = isFullyCompleted
                                    ? tiers[tiers.length - 1]
                                    : (nextTierIndex > 0 ? tiers[nextTierIndex - 1] : null)

                                  const start = leftTier ? Number(leftTier.required_progress || 0) : 0
                                  const end = rightTier ? Number(rightTier.required_progress || start + 3) : start + 3
                                  const safeEnd = end <= start ? start + 1 : end
                                  const clamped = isFullyCompleted
                                    ? safeEnd
                                    : Math.min(Math.max(points, start), safeEnd)
                                  const fillPercent = isFullyCompleted
                                    ? 100
                                    : Math.round(((clamped - start) / (safeEnd - start)) * 100)
                                  const progressLabel = `${clamped} von ${safeEnd}`

                                  return (
                                    <div className="award-progress-segment" key={`segment-${category.category_id}-active`}>
                                      <div className="award-progress-anchor left">
                                        {leftTier?.image_url ? (
                                          <img
                                            src={leftTier.image_url}
                                            alt={`${category.category_name} ${AWARD_TIER_LABELS[leftTier.tier]}`}
                                            className={`award-progress-anchor-icon ${leftTier.unlocked ? 'is-unlocked' : 'is-locked'}`}
                                          />
                                        ) : (
                                          <span className="award-progress-anchor-text">{leftTier ? AWARD_TIER_LABELS[leftTier.tier].charAt(0) : '0'}</span>
                                        )}

                                      </div>

                                      <div className="award-fluid-track" role="progressbar" aria-valuemin={start} aria-valuemax={safeEnd} aria-valuenow={clamped}>
                                        <div className="award-fluid-fill" style={{ width: `${fillPercent}%` }}></div>
                                      </div>

                                      <div className="award-progress-anchor right">
                                        {rightTier?.image_url ? (
                                          <img
                                            src={rightTier.image_url}
                                            alt={`${category.category_name} ${AWARD_TIER_LABELS[rightTier.tier]}`}
                                            className={`award-progress-anchor-icon ${rightTier.unlocked ? 'is-unlocked' : 'is-locked'}`}
                                          />
                                        ) : (
                                          <span className="award-progress-anchor-text">{rightTier ? AWARD_TIER_LABELS[rightTier.tier].charAt(0) : '-'}</span>
                                        )}
                                      </div>

                                      <div className="award-progress-label">{progressLabel}</div>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default PlayerDashboard
