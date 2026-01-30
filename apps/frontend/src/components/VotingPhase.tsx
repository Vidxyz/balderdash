import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import TimerPie from './TimerPie'

interface VotingPhaseProps {
  onVoteCorrect: (answerId: string) => void
  onVoteFunniest: (answerId: string) => void
  isSpectator?: boolean
}

export default function VotingPhase({ onVoteCorrect, onVoteFunniest, isSpectator }: VotingPhaseProps) {
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

  // Stable key for this round so we shuffle only once per round (not on every timer tick)
  const roundAnswerKey = `${round.roundmaster_id}-${round.card_id}-${Object.keys(round.answers || {}).sort().join(',')}-${round.category?.answer ?? ''}`

  const shuffledAnswers = useMemo(() => {
    const answers = Object.entries(round.answers || {}).map(([pid, answer]) => ({
      id: `answer_${pid}`,
      playerId: pid,
      answer,
      isCorrect: false,
    }))
    const allAnswers = [
      ...answers,
      {
        id: 'correct',
        playerId: null as string | null,
        answer: round.category.answer,
        isCorrect: true,
      },
    ]
    return [...allAnswers].sort(() => Math.random() - 0.5)
  }, [roundAnswerKey])

  const votingSeconds = round.voting_timer_remaining ?? 30
  const VOTING_TIMER_TOTAL = 30

  if (isRoundmaster || isSpectator) {
    return (
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 animate-card-enter">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {isSpectator ? 'Voting in progress' : 'You are the Roundmaster'}
        </h2>
        <p className="text-gray-600 mb-2">
          {isSpectator ? 'Spectator – players are voting.' : 'Waiting for other players to vote...'}
        </p>
        <div className="mb-4 flex items-center gap-3">
          <TimerPie remaining={votingSeconds} total={VOTING_TIMER_TOTAL} label={`${votingSeconds}s`} size={48} />
        </div>
        <div className="border-t border-teal-200 pt-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">All answers (what players are voting on)</h3>
          <ul className="space-y-2">
            {shuffledAnswers.map((item, i) => (
              <li
                key={item.id}
                className="p-3 bg-teal-50/80 rounded-xl border border-teal-100 animate-list-item-enter"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <p className="font-medium text-gray-800">{item.answer}</p>
                {item.isCorrect && <span className="text-xs text-teal-600 font-medium">(correct)</span>}
              </li>
            ))}
          </ul>
        </div>
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
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 animate-card-enter">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Vote for the Correct Answer</h2>
        <TimerPie remaining={votingSeconds} total={VOTING_TIMER_TOTAL} label={`${votingSeconds}s`} size={48} />
      </div>

      {!votedCorrect ? (
        <div className="space-y-3 mb-6">
          {shuffledAnswers.map((item) => (
            <button
              key={item.id}
              onClick={() => handleVoteCorrect(item.id)}
              className="w-full p-4 text-left bg-teal-50/80 hover:bg-teal-100 border-2 border-transparent hover:border-teal-400 rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] active:animate-vote-select"
            >
              <p className="font-medium text-gray-800">{item.answer}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-teal-700 font-semibold mb-4">✓ You voted for: "{shuffledAnswers.find(a => a.id === selectedCorrect)?.answer}"</p>
          
          {!votedFunniest && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Now vote for the Funniest Answer</h3>
              <div className="space-y-3">
                {shuffledAnswers.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleVoteFunniest(item.id)}
                    className={`w-full p-4 text-left border-2 rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                      selectedFunniest === item.id
                        ? 'bg-amber-100 border-amber-500'
                        : 'bg-teal-50/80 hover:bg-amber-50 border-transparent hover:border-amber-300'
                    } ${selectedFunniest === item.id ? 'animate-vote-select' : ''}`}
                  >
                    <p className="font-medium text-gray-800">{item.answer}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {votedFunniest && (
            <div className="bg-teal-100 rounded-xl p-4 border-2 border-teal-300 animate-submit-success">
              <p className="text-teal-800 font-semibold">
                ✓ All votes submitted! Waiting for results...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
