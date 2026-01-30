import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Balderdash</h1>
        <p className="text-gray-600 mb-8">
          The game of creative bluffing! Create convincing fake answers and try to fool your friends.
        </p>
        <div className="space-y-4">
          <Link
            to="/host"
            className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Host a Game
          </Link>
          <Link
            to="/join"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Join a Game
          </Link>
        </div>
      </div>
    </div>
  )
}
