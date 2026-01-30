import { useGameStore } from '../store/gameStore'

interface GameLobbyProps {
  roomCode: string
  isHost: boolean
  onStartGame: () => void
}

export default function GameLobby({ roomCode, isHost, onStartGame }: GameLobbyProps) {
  const { gameState } = useGameStore()

  const players = gameState?.players || []
  const canStart = players.length >= 2 && isHost

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Game Room</h1>
          <p className="text-gray-600 mb-4">Room Code: <span className="font-mono font-bold text-2xl">{roomCode}</span></p>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">Players ({players.length})</h2>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{player.name}</span>
                    {player.role === 'host' && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
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
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                canStart
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canStart ? 'Start Game' : 'Waiting for players...'}
            </button>
          )}

          {!isHost && (
            <div className="text-center text-gray-600 py-4">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
