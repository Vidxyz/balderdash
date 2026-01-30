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
  all_answers_submitted: boolean
  all_votes_submitted: boolean
}

interface GameState {
  room_code: string
  players: Player[]
  game_state: 'lobby' | 'playing' | 'round_active' | 'voting' | 'results' | 'game_over'
  current_round: Round | null
  round_number: number
  winner: Player | null
  max_players: number
}

interface GameStore {
  gameState: GameState | null
  socket: any | null
  channel: any | null
  playerId: string | null
  setGameState: (state: GameState) => void
  setSocket: (socket: any) => void
  setChannel: (channel: any) => void
  setPlayerId: (id: string) => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  socket: null,
  channel: null,
  playerId: null,
  setGameState: (state) => set({ gameState: state }),
  setSocket: (socket) => set({ socket }),
  setChannel: (channel) => set({ channel }),
  setPlayerId: (id) => set({ playerId: id }),
  reset: () => set({ gameState: null, socket: null, channel: null, playerId: null }),
}))
