import { create } from 'zustand'

const useGameStore = create((set) => ({
  // Auth state
  token: null,
  isHost: false,
  playerId: null,
  playerName: null,
  
  // Game state
  gameId: null,
  gameState: 'lobby',
  players: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  
  // Betting state
  bettingRound: 0,
  currentBets: {},
  pot: 0,
  nextToAct: null,
  smallBlindPlayer: null,
  bigBlindPlayer: null,
  foldedPlayers: [],
  
  // UI state
  selectedChips: {},
  notifications: [],
  confirmDialog: null,
  
  // Actions
  setToken: (token) => set({ token }),
  setIsHost: (isHost) => set({ isHost }),
  setPlayerId: (playerId) => set({ playerId }),
  setPlayerName: (playerName) => set({ playerName }),
  setGameId: (gameId) => set({ gameId }),
  setGameState: (gameState) => set({ gameState }),
  setPlayers: (players) => set({ players }),
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  setBettingRound: (round) => set({ bettingRound: round }),
  setCurrentBets: (bets) => set({ currentBets: bets }),
  setPot: (pot) => set({ pot }),
  setNextToAct: (nextToAct) => set({ nextToAct }),
  setSmallBlindPlayer: (player) => set({ smallBlindPlayer: player }),
  setBigBlindPlayer: (player) => set({ bigBlindPlayer: player }),
  setFoldedPlayers: (players) => set({ foldedPlayers: players }),
  setSelectedChips: (chips) => set({ selectedChips: chips }),
  
  // Notifications
  addNotification: (message, type = 'info', icon = '', duration = 5000) => 
    set((state) => {
      const id = Date.now() + Math.random()
      return {
        notifications: [...state.notifications, { id, message, type, icon, duration }]
      }
    }),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    })),
  
  // Confirm Dialog
  showConfirmDialog: (title, message, onConfirm, onCancel) =>
    set({
      confirmDialog: { title, message, onConfirm, onCancel }
    }),
  closeConfirmDialog: () => set({ confirmDialog: null }),
  
  // Reset
  reset: () => set({
    token: null,
    isHost: false,
    playerId: null,
    playerName: null,
    gameId: null,
    gameState: 'lobby',
    players: [],
    currentQuestion: null,
    currentQuestionIndex: 0,
    bettingRound: 0,
    currentBets: {},
    pot: 0,
    nextToAct: null,
    foldedPlayers: [],
    selectedChips: {},
    notifications: [],
    confirmDialog: null
  })
}))

export default useGameStore
