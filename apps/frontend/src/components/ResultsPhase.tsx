import { useGameStore } from '../store/gameStore'

export default function ResultsPhase() {
  const { gameState } = useGameStore()
  const round = gameState?.current_round

  if (!round) return null

  // Build answer list with vote counts
  const answers = Object.entries(round.answers).map(([playerId, answer]) => {
    const votes = Object.values(round.votes_correct).filter(id => id === `answer_${playerId}`).length
    const player = gameState?.players.find(p => p.id === playerId)
    return {
      id: `answer_${playerId}`,
      playerId,
      playerName: player?.name || 'Unknown',
      answer,
      votes,
      isCorrect: false,
    }
  })

  // Add correct answer
  const correctVotes = Object.values(round.votes_correct).filter(id => id === 'correct').length
  const allAnswers = [
    ...answers,
    {
      id: 'correct',
      playerId: null,
      playerName: 'Correct Answer',
      answer: round.category.answer,
      votes: correctVotes,
      isCorrect: true,
    },
  ]

  // Sort by votes (descending)
  const sortedAnswers = [...allAnswers].sort((a, b) => b.votes - a.votes)

  return (
    <div className="bg-white rounded-lg shadow-2xl p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Round Results</h2>
      
      <div className="space-y-4 mb-6">
        {sortedAnswers.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg border-2 ${
              item.isCorrect
                ? 'bg-green-50 border-green-500'
                : 'bg-gray-50 border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="font-semibold text-gray-800">{item.answer}</p>
              {item.isCorrect && (
                <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
                  CORRECT
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {item.isCorrect ? 'Correct Answer' : `By: ${item.playerName}`}
              </span>
              <span className="text-sm font-semibold text-gray-700">
                {item.votes} vote{item.votes !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-100 rounded-lg p-4">
        <p className="text-blue-800 font-semibold">Scores updated! Next round starting soon...</p>
      </div>
    </div>
  )
}
