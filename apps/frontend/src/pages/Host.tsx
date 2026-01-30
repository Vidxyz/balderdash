import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Host() {
  const [playerName, setPlayerName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(10)
  const navigate = useNavigate()

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name')
      return
    }

    // Generate room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Navigate to game room (no query params; state lives in backend)
    navigate(`/game/${roomCode}`, { state: { playerName, maxPlayers } })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 max-w-md w-full animate-card-enter">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Host a Game</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition-shadow"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Players
            </label>
            <input
              type="number"
              min="2"
              max="10"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition-shadow"
            />
          </div>
          <button
            onClick={handleCreateGame}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            Create Game
          </button>
        </div>
      </div>
    </div>
  )
}
