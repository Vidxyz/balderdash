import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

interface GameLobbyProps {
  roomCode: string
  isHost: boolean
  onStartGame: () => void
  showJoinForm?: boolean
  onJoin?: (playerName: string) => void
  joining?: boolean
  joinError?: string | null
  initialJoinName?: string
}

export default function GameLobby({ roomCode, isHost, onStartGame, showJoinForm, onJoin, joining, joinError, initialJoinName = '' }: GameLobbyProps) {
  const { gameState } = useGameStore()
  const [joinName, setJoinName] = useState(initialJoinName)

  const players = gameState?.players || []
  const canStart = players.length >= 2 && isHost

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (joinName.trim() && onJoin) onJoin(joinName.trim())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 mb-4 animate-card-enter">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Game Room</h1>
          <p className="text-gray-600 mb-4">Room Code: <span className="font-mono font-bold text-2xl text-teal-700">{roomCode}</span></p>
          
          {showJoinForm && (
            <div className="mb-6 p-4 bg-teal-50 rounded-xl border-2 border-teal-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Join this game</h2>
              <form onSubmit={handleJoinSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 px-4 py-2 border border-teal-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-400"
                  maxLength={30}
                  disabled={joining}
                />
                <button
                  type="submit"
                  disabled={!joinName.trim() || joining}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                >
                  {joining ? 'Joining...' : 'Join'}
                </button>
              </form>
              {joinError && <p className="mt-2 text-sm text-red-600">{joinError}</p>}
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">Players ({players.length})</h2>
            <div className="space-y-2">
              {players.map((player, i) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-teal-50/80 rounded-xl border border-teal-100 animate-list-item-enter"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{player.name}</span>
                    {player.role === 'host' && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg">
                        Host
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600">{player.points} pts</span>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                canStart
                  ? 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canStart ? 'Start Game' : 'Waiting for players...'}
            </button>
          )}

          {!isHost && !showJoinForm && (
            <div className="text-center text-gray-600 py-4 animate-pulse-soft">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
