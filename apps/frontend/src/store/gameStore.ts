import { create } from 'zustand'

interface Player {
  id: string
  name: string
  role: 'host' | 'guest'
  points: number
}

interface Category {
  id: number
  name: string
  question: string
  answer: string
}

interface Round {
  roundmaster_id: string
  card_id: number
  card_number: number
  die_roll: number
  category: Category
  answers: Record<string, string>
  votes_correct: Record<string, string>
  votes_funniest: Record<string, string>
  timer_remaining: number
  voting_timer_remaining?: number
  all_answers_submitted: boolean
  all_votes_submitted: boolean
}

interface GameState {
  room_code: string
  players: Player[]
  game_state: 'lobby' | 'playing' | 'round_active' | 'voting' | 'results' | 'game_over'
  current_round: Round | null
  round_number: number
  winners: Player[]
  max_players: number
  last_round_score_reasons?: Record<string, string[]>
  funniest_winner?: Player[]
}

interface GameStore {
  gameState: GameState | null
  socket: any | null
  channel: any | null
  playerId: string | null
  lastSeenPoints: number | null
  pointsGained: number | null
  setGameState: (state: GameState) => void
  setSocket: (socket: any) => void
  setChannel: (channel: any) => void
  setPlayerId: (id: string) => void
  clearPointsGained: () => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  socket: null,
  channel: null,
  playerId: null,
  lastSeenPoints: null,
  pointsGained: null,
  setGameState: (state) => {
    const { playerId, lastSeenPoints } = get()
    let pointsGained: number | null = null
    let newLastSeenPoints = lastSeenPoints
    if (playerId && state.players) {
      const me = state.players.find((p) => p.id === playerId)
      if (me != null) {
        const newPoints = me.points
        if (lastSeenPoints !== null && newPoints > lastSeenPoints) {
          pointsGained = newPoints - lastSeenPoints
        }
        newLastSeenPoints = newPoints
      }
    }
    set({
      gameState: state,
      lastSeenPoints: newLastSeenPoints,
      ...(pointsGained != null && pointsGained > 0 ? { pointsGained } : {}),
    })
  },
  setSocket: (socket) => set({ socket }),
  setChannel: (channel) => set({ channel }),
  setPlayerId: (id) => set({ playerId: id }),
  clearPointsGained: () => set({ pointsGained: null }),
  reset: () => set({
    gameState: null,
    socket: null,
    channel: null,
    playerId: null,
    lastSeenPoints: null,
    pointsGained: null,
  }),
}))
