import type { BeltId } from '../../types'
import { BELT_COLORS } from '../../types'

interface Props {
  belt: BeltId
  stripes: number
  className?: string
  /** stripe slots that are earned but shown dimmed (e.g. the one in progress) */
  ghost?: number
  label?: string
}

/** A length of belt with the rank bar and tape stripes, drawn to scale-ish. */
export default function Belt({ belt, stripes, className, ghost = 0, label }: Props) {
  const color = BELT_COLORS[belt]
  const isBlack = belt === 'black'
  const bar = isBlack ? '#c8141f' : '#111113'
  const stitch = belt === 'white' ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.16)'
  const id = `belt-${belt}`
  return (
    <svg viewBox="0 0 320 40" className={className} role="img"
      aria-label={label ?? `${belt} belt, ${stripes} stripe${stripes === 1 ? '' : 's'}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.32" />
        </linearGradient>
      </defs>
      <rect width="320" height="40" fill={color} stroke={isBlack ? '#3b3b45' : 'none'} />
      {[7, 14, 20, 26, 33].map(y => (
        <line key={y} x1="0" x2="320" y1={y} y2={y} stroke={stitch} strokeWidth="1" strokeDasharray="5 3" />
      ))}
      <rect x="196" width="100" height="40" fill={bar} />
      {[0, 1, 2, 3].map(i => {
        const earned = i < stripes
        const pending = !earned && i < stripes + ghost
        return (
          <rect key={i} x={208 + i * 21} y="0" width="9" height="40"
            fill={earned ? '#f4f1ea' : pending ? 'rgba(244,241,234,0.28)' : 'none'}
            stroke={earned ? 'none' : 'rgba(244,241,234,0.2)'} strokeDasharray={earned ? undefined : '2 3'} />
        )
      })}
      <rect width="320" height="40" fill={`url(#${id})`} />
    </svg>
  )
}
