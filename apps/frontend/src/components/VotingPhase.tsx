import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

interface VotingPhaseProps {
  onVoteCorrect: (answerId: string) => void
  onVoteFunniest: (answerId: string) => void
}

export default function VotingPhase({ onVoteCorrect, onVoteFunniest }: VotingPhaseProps) {
  const { gameState, playerId } = useGameStore()
  const [selectedCorrect, setSelectedCorrect] = useState<string | null>(null)
  const [selectedFunniest, setSelectedFunniest] = useState<string | null>(null)
  const [votedCorrect, setVotedCorrect] = useState(false)
  const [votedFunniest, setVotedFunniest] = useState(false)

  const round = gameState?.current_round
  const isRoundmaster = round?.roundmaster_id === playerId

  useEffect(() => {
    // Check if already voted
    if (round?.votes_correct[playerId!]) {
      setVotedCorrect(true)
      setSelectedCorrect(round.votes_correct[playerId!])
    }
    if (round?.votes_funniest[playerId!]) {
      setVotedFunniest(true)
      setSelectedFunniest(round.votes_funniest[playerId!])
    }
  }, [round, playerId])

  if (!round) return null

  // Build answer list (shuffle for anonymity)
  const answers = Object.entries(round.answers).map(([playerId, answer]) => ({
    id: `answer_${playerId}`,
    playerId,
    answer,
    isCorrect: false, // Don't reveal yet
  }))

  // Add correct answer
  const allAnswers = [
    ...answers,
    {
      id: 'correct',
      playerId: null,
      answer: round.category.answer,
      isCorrect: true,
    },
  ]

  // Shuffle answers
  const shuffledAnswers = [...allAnswers].sort(() => Math.random() - 0.5)

  if (isRoundmaster) {
    return (
      <div className="bg-white rounded-lg shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">You are the Roundmaster</h2>
        <p className="text-gray-600">Waiting for other players to vote...</p>
      </div>
    )
  }

  const handleVoteCorrect = (answerId: string) => {
    if (!votedCorrect) {
      setSelectedCorrect(answerId)
      setVotedCorrect(true)
      onVoteCorrect(answerId)
    }
  }

  const handleVoteFunniest = (answerId: string) => {
    if (!votedFunniest && votedCorrect) {
      setSelectedFunniest(answerId)
      setVotedFunniest(true)
      onVoteFunniest(answerId)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-2xl p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Vote for the Correct Answer</h2>
      
      {!votedCorrect ? (
        <div className="space-y-3 mb-6">
          {shuffledAnswers.map((item) => (
            <button
              key={item.id}
              onClick={() => handleVoteCorrect(item.id)}
              className="w-full p-4 text-left bg-gray-50 hover:bg-purple-50 border-2 border-transparent hover:border-purple-500 rounded-lg transition-colors"
            >
              <p className="font-medium text-gray-800">{item.answer}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-green-600 font-semibold mb-4">✓ You voted for: "{shuffledAnswers.find(a => a.id === selectedCorrect)?.answer}"</p>
          
          {!votedFunniest && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Now vote for the Funniest Answer</h3>
              <div className="space-y-3">
                {shuffledAnswers.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleVoteFunniest(item.id)}
                    className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                      selectedFunniest === item.id
                        ? 'bg-yellow-100 border-yellow-500'
                        : 'bg-gray-50 hover:bg-yellow-50 border-transparent hover:border-yellow-300'
                    }`}
                  >
                    <p className="font-medium text-gray-800">{item.answer}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {votedFunniest && (
            <div className="bg-green-100 rounded-lg p-4">
              <p className="text-green-800 font-semibold">
                ✓ All votes submitted! Waiting for results...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
