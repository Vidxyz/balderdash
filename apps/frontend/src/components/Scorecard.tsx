import { useGameStore } from '../store/gameStore'

export default function Scorecard() {
  const { gameState } = useGameStore()

  if (!gameState) return null

  const players = gameState.players || []
  const maxPoints = 25

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Scorecard</h2>
      <div className="relative">
        {/* Path */}
        <div className="h-2 bg-gray-200 rounded-full mb-8 relative">
          <div className="absolute inset-0 flex justify-between">
            {Array.from({ length: maxPoints + 1 }, (_, i) => (
              <div
                key={i}
                className="w-1 h-2 bg-gray-400"
                style={{ marginLeft: i === 0 ? '0' : `${(100 / maxPoints) * i}%` }}
              />
            ))}
          </div>
        </div>

        {/* Player pieces */}
        <div className="relative">
          {players.map((player, index) => {
            const position = Math.min((player.points / maxPoints) * 100, 100)
            const colors = [
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

            return (
              <div
                key={player.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${position}%`, top: `${20 + index * 40}px` }}
              >
                <div
                  className={`w-8 h-8 ${colors[index % colors.length]} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm`}
                  title={`${player.name}: ${player.points} points`}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                {player.points >= maxPoints && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <span className="text-yellow-500 text-2xl">👑</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Player list with points */}
        <div className="mt-16 space-y-2">
          {players
            .sort((a, b) => b.points - a.points)
            .map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="font-medium text-gray-800">{player.name}</span>
                <span className="font-bold text-gray-600">{player.points} / {maxPoints}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
