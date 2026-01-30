import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ROOM_CODE_LEN = 6

export default function Join() {
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const navigate = useNavigate()

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const code = roomCode.trim().toUpperCase()
    if (!code) {
      alert('Please enter a room code')
      return
    }
    if (!playerName.trim()) {
      alert('Please enter your name')
      return
    }
    navigate(`/game/${code}`, { state: { playerName: playerName.trim() } })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 max-w-md w-full animate-card-enter">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Join a Game</h1>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, ROOM_CODE_LEN))}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-400 font-mono text-lg uppercase transition-shadow"
              placeholder="e.g. ABC123"
              maxLength={ROOM_CODE_LEN}
            />
          </div>
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
          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            Join Game
          </button>
        </form>
      </div>
    </div>
  )
}
