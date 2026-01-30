import { useGameStore } from '../store/gameStore'

const TRACK_COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500',
]

export default function Scorecard() {
  const { gameState, playerId, pointsGained } = useGameStore()
  const justGainedPoints = pointsGained != null && pointsGained > 0

  if (!gameState) return null

  const players = gameState.players || []
  const maxPoints = 6
  const sortedByPoints = [...players].sort((a, b) => b.points - a.points)

  // Group players by points for stacking at same position
  const byPoints = sortedByPoints.reduce<Record<number, typeof players>>((acc, p) => {
    if (!acc[p.points]) acc[p.points] = []
    acc[p.points].push(p)
    return acc
  }, {})

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 mb-4 animate-card-enter">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Scorecard</h2>

      {/* Track with player markers; tied players spread horizontally so they don't overlap */}
      <div className="relative h-20 mb-1">
        <div className="absolute inset-0 flex items-center" style={{ top: '50%' }}>
          <div className="flex-1 h-2 bg-gray-200 rounded-full relative">
            {Array.from({ length: maxPoints + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute w-px h-2 bg-gray-400 top-1/2 -translate-y-1/2"
                style={{ left: `${(100 / maxPoints) * i}%` }}
              />
            ))}
          </div>
        </div>
        {Object.entries(byPoints).flatMap(([ptsStr, group]) => {
          const pts = Number(ptsStr)
          const position = Math.min((pts / maxPoints) * 100, 100)
          const tieCount = group.length
          return group.map((player, i) => {
            const color = TRACK_COLORS[players.findIndex((p) => p.id === player.id) % TRACK_COLORS.length]
            const isCurrentPlayer = playerId === player.id
            const showGainGlow = justGainedPoints && isCurrentPlayer
            const horizontalOffsetPx = tieCount > 1 ? (i - (tieCount - 1) / 2) * 28 : 0
            return (
              <div
                key={player.id}
                className="absolute top-1/2 z-10 flex flex-col items-center"
                style={{
                  left: `${position}%`,
                  transform: `translate(calc(-50% + ${horizontalOffsetPx}px), -50%)`,
                }}
                title={`${player.name}: ${player.points} pts`}
              >
                <span className={`text-xs font-semibold mb-1 whitespace-nowrap ${isCurrentPlayer ? 'text-teal-700' : 'text-gray-600'}`}>
                  {player.name}{isCurrentPlayer ? ' (You)' : ''}
                </span>
                <div
                  className={`w-8 h-8 ${color} rounded-full border-2 flex items-center justify-center text-white font-bold text-sm shadow ${isCurrentPlayer ? 'ring-2 ring-teal-600 ring-offset-2' : 'border-white'} ${showGainGlow ? 'animate-points-glow ring-4 ring-teal-400' : ''}`}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                {player.points >= maxPoints && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-lg">👑</span>
                )}
              </div>
            )
          })
        })}
      </div>

      {/* Labels: 0 and max points */}
      <div className="flex justify-between text-xs text-gray-500 mb-4 px-0.5">
        <span>0</span>
        <span>{maxPoints}</span>
      </div>

      {/* Player list: same order as track (by points), with matching colors */}
      <div className="space-y-2">
        {sortedByPoints.map((player) => {
          const colorIndex = players.findIndex((p) => p.id === player.id)
          const color = TRACK_COLORS[colorIndex % TRACK_COLORS.length]
          const isCurrentPlayer = playerId === player.id
          const showGainGlow = justGainedPoints && isCurrentPlayer
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2 rounded-xl transition-colors ${showGainGlow ? 'bg-teal-100 ring-2 ring-teal-500 animate-points-glow' : isCurrentPlayer ? 'bg-teal-50 ring-2 ring-teal-400' : 'bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 ${color} rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-800">{player.name}</span>
              </div>
              <span className="font-bold text-gray-600 tabular-nums">
                {player.points} / {maxPoints}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
