import { useGameStore } from '../store/gameStore'

export default function ResultsPhase() {
  const { gameState } = useGameStore()
  const round = gameState?.current_round

  if (!round) return null

  // Build answer list with correct and funniest vote counts
  const answers = Object.entries(round.answers).map(([playerId, answer]) => {
    const id = `answer_${playerId}`
    const correctVotes = Object.values(round.votes_correct || {}).filter(v => v === id).length
    const funniestVotes = Object.values(round.votes_funniest || {}).filter(v => v === id).length
    const player = gameState?.players.find(p => p.id === playerId)
    return {
      id,
      playerId,
      playerName: player?.name || 'Unknown',
      answer,
      votes: correctVotes,
      funniestVotes,
      isCorrect: false,
    }
  })

  const correctVotesForCorrect = Object.values(round.votes_correct || {}).filter(id => id === 'correct').length
  const funniestVotesForCorrect = Object.values(round.votes_funniest || {}).filter(id => id === 'correct').length
  const allAnswers = [
    ...answers,
    {
      id: 'correct',
      playerId: null,
      playerName: 'Correct Answer',
      answer: round.category.answer,
      votes: correctVotesForCorrect,
      funniestVotes: funniestVotesForCorrect,
      isCorrect: true,
    },
  ]

  // Sort by votes (descending)
  const sortedAnswers = [...allAnswers].sort((a, b) => b.votes - a.votes)

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 animate-card-enter">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Round Results</h2>
      
      <div className="space-y-4 mb-6">
        {sortedAnswers.map((item, i) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border-2 animate-list-item-enter ${
              item.isCorrect
                ? 'bg-teal-50 border-teal-500'
                : 'bg-gray-50 border-teal-200'
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="font-semibold text-gray-800">{item.answer}</p>
              {item.isCorrect && (
                <span className="px-2 py-1 bg-teal-500 text-white text-xs font-semibold rounded-lg">
                  CORRECT
                </span>
              )}
            </div>
            <div className="flex justify-between items-center flex-wrap gap-y-1">
              <span className="text-sm text-gray-600">
                {item.isCorrect ? 'Correct Answer' : `By: ${item.playerName}`}
              </span>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-teal-700">
                  {item.votes} correct vote{item.votes !== 1 ? 's' : ''}
                </span>
                <span className="font-semibold text-amber-600">
                  {item.funniestVotes} funniest vote{item.funniestVotes !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-teal-100 rounded-xl p-4 border border-teal-200">
        <p className="text-teal-800 font-semibold">Scores updated! Next round starting soon...</p>
      </div>
    </div>
  )
}
