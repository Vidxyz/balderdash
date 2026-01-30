import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

interface RoundActiveProps {
  onSubmitAnswer: (answer: string) => void
}

export default function RoundActive({ onSubmitAnswer }: RoundActiveProps) {
  const { gameState, playerId } = useGameStore()
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const round = gameState?.current_round
  const isRoundmaster = round?.roundmaster_id === playerId
  const timer = round?.timer_remaining || 0

  useEffect(() => {
    // Reset submission state when new round starts
    setSubmitted(false)
    setAnswer('')
  }, [gameState?.round_number])

  const handleSubmit = () => {
    if (answer.trim() && !submitted) {
      onSubmitAnswer(answer.trim())
      setSubmitted(true)
    }
  }

  if (!round) return null

  if (isRoundmaster) {
    return (
      <div className="bg-white rounded-lg shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">You are the Roundmaster!</h2>
        <div className="bg-purple-100 rounded-lg p-4 mb-4">
          <p className="text-sm text-purple-700 mb-2">Category:</p>
          <p className="text-lg font-semibold text-purple-900">{round.category.name}</p>
        </div>
        <div className="bg-blue-100 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-700 mb-2">Question:</p>
          <p className="text-lg font-semibold text-blue-900">{round.category.question}</p>
        </div>
        <div className="text-center text-gray-600">
          <p className="text-lg">Waiting for other players to submit their answers...</p>
          <p className="text-sm mt-2">
            {Object.keys(round.answers).length} / {gameState?.players.length! - 1} answers submitted
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Submit Your Answer</h2>
        <div className="text-3xl font-bold text-purple-600">
          {Math.max(0, timer)}s
        </div>
      </div>

      <div className="bg-purple-100 rounded-lg p-4 mb-4">
        <p className="text-sm text-purple-700 mb-2">Category:</p>
        <p className="text-lg font-semibold text-purple-900">{round.category.name}</p>
      </div>

      <div className="bg-blue-100 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-700 mb-2">Question:</p>
        <p className="text-lg font-semibold text-blue-900">{round.category.question}</p>
      </div>

      {submitted ? (
        <div className="bg-green-100 rounded-lg p-4 text-center">
          <p className="text-green-800 font-semibold">Answer submitted! Waiting for others...</p>
        </div>
      ) : (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your creative (fake) answer here..."
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            maxLength={200}
            disabled={submitted}
          />
          <div className="flex justify-between items-center mt-2 mb-4">
            <span className="text-sm text-gray-500">{answer.length} / 200 characters</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || submitted}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
              answer.trim() && !submitted
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Submit Answer
          </button>
        </>
      )}
    </div>
  )
}
