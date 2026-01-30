import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-card-enter">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Balderdash</h1>
        <p className="text-gray-600 mb-8">
          The game of creative bluffing! Create convincing fake answers and try to fool your friends.
        </p>
        <div className="space-y-4">
          <Link
            to="/host"
            className="block w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            Host a Game
          </Link>
          <Link
            to="/join"
            className="block w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            Join a Game
          </Link>
        </div>
      </div>
    </div>
  )
}
