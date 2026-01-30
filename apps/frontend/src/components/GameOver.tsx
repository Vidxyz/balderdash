import { Link } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

const TRACK_COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500',
]

function formatWinnersTitle(winners: { name: string }[]): string {
  if (winners.length === 0) return ''
  if (winners.length === 1) return `${winners[0].name} Wins!`
  if (winners.length === 2) return `${winners[0].name} and ${winners[1].name} Win!`
  const last = winners[winners.length - 1].name
  const rest = winners.slice(0, -1).map((w) => w.name).join(', ')
  return `${rest} and ${last} Win!`
}

function formatFunniestTitle(players: { name: string }[]): string {
  if (players.length === 0) return ''
  if (players.length === 1) return players[0].name
  if (players.length === 2) return `${players[0].name} and ${players[1].name}`
  const last = players[players.length - 1].name
  const rest = players.slice(0, -1).map((p) => p.name).join(', ')
  return `${rest} and ${last}`
}

export default function GameOver() {
  const { gameState, playerId } = useGameStore()
  const winners = gameState?.winners ?? []
  const funniestWinner = gameState?.funniest_winner ?? []
  const players = gameState?.players || []

  if (winners.length === 0) return null

  const sortedPlayers = [...players].sort((a, b) => b.points - a.points)
  const winnerIds = new Set(winners.map((w) => w.id))
  const pointsLabel = winners.length > 0 ? `${winners[0].points} points` : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 max-w-2xl w-full animate-card-enter">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👑</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Game Over!</h1>
          <p className="text-2xl text-teal-600 font-semibold">{formatWinnersTitle(winners)}</p>
          <p className="text-gray-600 mt-2">{pointsLabel}</p>
        </div>

        {funniestWinner.length > 0 && (
          <div className="bg-amber-50 rounded-xl p-4 mb-6 border-2 border-amber-300 text-center">
            <h2 className="text-lg font-bold text-amber-800 mb-1">😂 Funniest Answer Prize</h2>
            <p className="text-xl font-semibold text-amber-700">
              {formatFunniestTitle(funniestWinner)}
            </p>
            <p className="text-sm text-amber-600 mt-1">
              Most &quot;funniest&quot; votes over the course of the game
            </p>
          </div>
        )}

        <div className="bg-teal-50/80 rounded-xl p-6 mb-6 border border-teal-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Final Scores</h2>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => {
              const isYou = playerId === player.id
              const isWinner = winnerIds.has(player.id)
              const colorIndex = players.findIndex((p) => p.id === player.id)
              const color = TRACK_COLORS[colorIndex % TRACK_COLORS.length]
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-xl animate-list-item-enter ${
                    isWinner
                      ? 'bg-amber-100 border-2 border-amber-500'
                      : isYou
                        ? 'bg-teal-100 border-2 border-teal-400'
                        : 'bg-white border border-teal-200'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-gray-400 w-8">
                      #{index + 1}
                    </span>
                    <div
                      className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">
                      {player.name}{isYou ? ' (You)' : ''}
                    </span>
                  </div>
                  <span className="font-bold text-gray-600">{player.points} points</span>
                </div>
              )
            })}
          </div>
        </div>

        <Link
          to="/"
          className="block w-full py-3 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
