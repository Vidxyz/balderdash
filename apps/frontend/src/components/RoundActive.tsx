import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import TimerPie from './TimerPie'

interface RoundActiveProps {
  onSubmitAnswer: (answer: string) => void
  isSpectator?: boolean
}

const ANSWER_TIMER_TOTAL = 90

export default function RoundActive({ onSubmitAnswer, isSpectator }: RoundActiveProps) {
  const { gameState, playerId } = useGameStore()
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)

  const round = gameState?.current_round
  const isRoundmaster = round?.roundmaster_id === playerId
  const timer = round?.timer_remaining ?? 0

  useEffect(() => {
    setSubmitted(false)
    setAnswer('')
    setJustSubmitted(false)
  }, [gameState?.round_number])

  const handleSubmit = () => {
    if (answer.trim() && !submitted) {
      onSubmitAnswer(answer.trim())
      setSubmitted(true)
      setJustSubmitted(true)
      setTimeout(() => setJustSubmitted(false), 600)
    }
  }

  if (!round) return null

  if (isSpectator) {
    return (
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 animate-card-enter">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Answer phase</h2>
          <TimerPie remaining={Math.max(0, timer)} total={ANSWER_TIMER_TOTAL} label={`${Math.max(0, timer)}s`} size={52} />
        </div>
        <div className="bg-teal-100 rounded-xl p-4 mb-4 border border-teal-200">
          <p className="text-sm text-teal-700 mb-2">Category:</p>
          <p className="text-lg font-semibold text-teal-900">{round.category.name}</p>
        </div>
        <div className="bg-cyan-100 rounded-xl p-4 mb-4 border border-cyan-200">
          <p className="text-sm text-cyan-700 mb-2">Question:</p>
          <p className="text-lg font-semibold text-cyan-900">{round.category.question}</p>
        </div>
        <p className="text-center text-gray-500">Spectator – answer phase in progress.</p>
      </div>
    )
  }

  if (isRoundmaster) {
    return (
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 animate-card-enter">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">You are the Roundmaster!</h2>
          <TimerPie remaining={Math.max(0, timer)} total={ANSWER_TIMER_TOTAL} label={`${Math.max(0, timer)}s`} size={52} />
        </div>
        <div className="bg-teal-100 rounded-xl p-4 mb-4 border border-teal-200">
          <p className="text-sm text-teal-700 mb-2">Category:</p>
          <p className="text-lg font-semibold text-teal-900">{round.category.name}</p>
        </div>
        <div className="bg-cyan-100 rounded-xl p-4 mb-4 border border-cyan-200">
          <p className="text-sm text-cyan-700 mb-2">Question:</p>
          <p className="text-lg font-semibold text-cyan-900">{round.category.question}</p>
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
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 animate-card-enter">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Submit Your Answer</h2>
        <TimerPie remaining={Math.max(0, timer)} total={ANSWER_TIMER_TOTAL} label={`${Math.max(0, timer)}s`} size={52} />
      </div>

      <div className="bg-teal-100 rounded-xl p-4 mb-4 border border-teal-200">
        <p className="text-sm text-teal-700 mb-2">Category:</p>
        <p className="text-lg font-semibold text-teal-900">{round.category.name}</p>
      </div>

      <div className="bg-cyan-100 rounded-xl p-4 mb-4 border border-cyan-200">
        <p className="text-sm text-cyan-700 mb-2">Question:</p>
        <p className="text-lg font-semibold text-cyan-900">{round.category.question}</p>
      </div>

      {submitted ? (
        <div
          className={`bg-teal-100 rounded-xl p-6 text-center border-2 border-teal-300 ${justSubmitted ? 'animate-submit-success' : ''}`}
        >
          <p className="text-teal-800 font-semibold text-lg">✓ Answer submitted!</p>
          <p className="text-teal-600 mt-1">Waiting for others...</p>
        </div>
      ) : (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your creative (fake) answer here..."
            className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-400 resize-none transition-shadow"
            maxLength={200}
            disabled={submitted}
          />
          <div className="flex justify-between items-center mt-2 mb-4">
            <span className="text-sm text-gray-500">{answer.length} / 200 characters</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || submitted}
            className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
              answer.trim() && !submitted
                ? 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
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
