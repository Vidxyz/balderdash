import { useGameStore } from '../store/gameStore'

export default function GameOver() {
  const { gameState } = useGameStore()
  const winner = gameState?.winner

  if (!winner) return null

  const sortedPlayers = [...(gameState?.players || [])]
    .sort((a, b) => b.points - a.points)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👑</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Game Over!</h1>
          <p className="text-2xl text-purple-600 font-semibold">{winner.name} Wins!</p>
          <p className="text-gray-600 mt-2">{winner.points} points</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Final Scores</h2>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.id === winner.id
                    ? 'bg-yellow-100 border-2 border-yellow-500'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-bold text-gray-400 w-8">
                    #{index + 1}
                  </span>
                  <span className="font-medium text-gray-800">{player.name}</span>
                </div>
                <span className="font-bold text-gray-600">{player.points} points</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
