interface TimerPieProps {
  /** Seconds remaining */
  remaining: number
  /** Total seconds (e.g. 90 or 30) */
  total: number
  /** Size in pixels */
  size?: number
  /** Optional label (e.g. "25s") */
  label?: string
  className?: string
}

/**
 * A diminishing pie/circle that shows how much time remains.
 * Filled portion = remaining / total (drawn as a segment that shrinks as time runs down).
 */
export default function TimerPie({
  remaining,
  total,
  size = 48,
  label,
  className = '',
}: TimerPieProps) {
  const clamped = Math.max(0, Math.min(remaining, total))
  const fraction = total > 0 ? clamped / total : 0
  const radius = 0.4
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - fraction)

  return (
    <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 1 1"
        className="rotate-[-90deg] shrink-0"
        aria-hidden
      >
        {/* Background circle */}
        <circle
          cx="0.5"
          cy="0.5"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.12"
          className="text-teal-200/80"
        />
        {/* Remaining time segment */}
        <circle
          cx="0.5"
          cy="0.5"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-teal-600 transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      {label != null && (
        <span className="text-lg font-bold text-teal-700 tabular-nums">{label}</span>
      )}
    </div>
  )
}
